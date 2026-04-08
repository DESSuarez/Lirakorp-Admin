import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const contractId = searchParams.get('contractId');
  const propertyId = searchParams.get('propertyId');

  const where: any = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (contractId) where.contractId = contractId;
  if (propertyId) where.propertyId = propertyId;

  try {
    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        contract: {
          include: {
            property: true,
          },
        },
      },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    return NextResponse.json(
      { error: 'Error al obtener alertas' },
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
    const { type, title, message, dueDate, contractId, propertyId } = body;

    if (!type || !title || !dueDate) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: type, title, dueDate' },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.create({
      data: {
        type,
        title,
        message: message || null,
        dueDate: new Date(dueDate),
        status: 'pending',
        contractId: contractId || null,
      },
      include: {
        contract: { include: { property: true } },
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error('Error al crear alerta:', error);
    return NextResponse.json(
      { error: 'Error al crear alerta' },
      { status: 500 }
    );
  }
}
