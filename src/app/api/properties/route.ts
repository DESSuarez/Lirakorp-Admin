import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const zone = searchParams.get('zone');
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const search = searchParams.get('search');

  const where: Record<string, unknown> = {};

  if (zone) where.zoneId = zone;
  if (status) where.status = status;
  if (type) where.propertyType = type;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { number: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const properties = await prisma.property.findMany({
      where,
      include: { zone: true },
      orderBy: { number: 'asc' },
    });

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Error al obtener las propiedades' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      number,
      name,
      squareMeters,
      propertyType,
      zoneId,
      address,
      description,
      monthlyRent,
      status,
    } = body;

    if (!number || !name || !squareMeters || !propertyType || !zoneId || !monthlyRent) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: numero, nombre, m2, tipo, zona y renta son requeridos' },
        { status: 400 }
      );
    }

    const existingProperty = await prisma.property.findFirst({
      where: { number },
    });

    if (existingProperty) {
      return NextResponse.json(
        { error: `Ya existe una propiedad con el numero ${number}` },
        { status: 409 }
      );
    }

    const property = await prisma.property.create({
      data: {
        number,
        name,
        squareMeters: parseFloat(squareMeters),
        propertyType,
        zoneId,
        address: address || null,
        description: description || null,
        monthlyRent: parseFloat(monthlyRent),
        status: status || 'DISPONIBLE',
      },
      include: { zone: true },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: 'Error al crear la propiedad' },
      { status: 500 }
    );
  }
}
