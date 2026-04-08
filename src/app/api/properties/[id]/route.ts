import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        zone: true,
        photos: { orderBy: { createdAt: 'desc' } },
        contracts: {
          include: { property: true },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Error al obtener la propiedad' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.property.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }

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

    if (number && number !== existing.number) {
      const duplicate = await prisma.property.findFirst({
        where: { number, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Ya existe otra propiedad con el numero ${number}` },
          { status: 409 }
        );
      }
    }

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...(number !== undefined && { number }),
        ...(name !== undefined && { name }),
        ...(squareMeters !== undefined && {
          squareMeters: parseFloat(squareMeters),
        }),
        ...(propertyType !== undefined && { propertyType }),
        ...(zoneId !== undefined && { zoneId }),
        ...(address !== undefined && { address: address || null }),
        ...(description !== undefined && { description: description || null }),
        ...(monthlyRent !== undefined && {
          monthlyRent: parseFloat(monthlyRent),
        }),
        ...(status !== undefined && { status }),
      },
      include: { zone: true },
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la propiedad' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const user = session.user as { role?: string };
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Solo los administradores pueden eliminar propiedades' },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.property.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }

    const activeContracts = await prisma.contract.findFirst({
      where: { propertyId: id, status: 'ACTIVO' },
    });

    if (activeContracts) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar una propiedad con contratos activos. Finalice los contratos primero.',
        },
        { status: 409 }
      );
    }

    await prisma.photo.deleteMany({ where: { propertyId: id } });
    await prisma.property.delete({ where: { id } });

    return NextResponse.json({ message: 'Propiedad eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la propiedad' },
      { status: 500 }
    );
  }
}
