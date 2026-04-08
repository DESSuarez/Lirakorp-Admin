import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        property: {
          include: { zone: true },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Error al obtener contrato:', error);
    return NextResponse.json(
      { error: 'Error al obtener el contrato' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    const {
      tenantName,
      tenantEmail,
      tenantPhone,
      tenantWhatsapp,
      startDate,
      endDate,
      reviewDate,
      monthlyRent,
      annualIncrement,
      depositAmount,
      notes,
      status,
    } = body;

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...(tenantName !== undefined && { tenantName }),
        ...(tenantEmail !== undefined && { tenantEmail }),
        ...(tenantPhone !== undefined && { tenantPhone: tenantPhone || null }),
        ...(tenantWhatsapp !== undefined && { tenantWhatsapp: tenantWhatsapp || null }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(reviewDate !== undefined && { reviewDate: reviewDate ? new Date(reviewDate) : null }),
        ...(monthlyRent !== undefined && { monthlyRent }),
        ...(annualIncrement !== undefined && { annualIncrement }),
        ...(depositAmount !== undefined && { depositAmount }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(status !== undefined && { status }),
      },
      include: {
        property: {
          include: { zone: true },
        },
      },
    });

    // Si el estado cambia a expired, actualizar propiedad a available
    if (status === 'expired' && existing.status !== 'expired') {
      await prisma.property.update({
        where: { id: existing.propertyId },
        data: { status: 'available' },
      });
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Error al actualizar contrato:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el contrato' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Eliminar alertas asociadas
      await tx.alert.deleteMany({ where: { contractId: id } });

      // Eliminar contrato
      await tx.contract.delete({ where: { id } });

      // Actualizar propiedad a available si el contrato estaba activo
      if (contract.status === 'active') {
        await tx.property.update({
          where: { id: contract.propertyId },
          data: { status: 'available' },
        });
      }
    });

    return NextResponse.json({ message: 'Contrato eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar contrato:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el contrato' },
      { status: 500 }
    );
  }
}
