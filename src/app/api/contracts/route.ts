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
  const status = searchParams.get('status');
  const zone = searchParams.get('zone');

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (zone) {
    where.property = { zoneId: zone };
  }

  try {
    const contracts = await prisma.contract.findMany({
      where,
      include: {
        property: {
          include: {
            zone: true,
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error('Error al obtener contratos:', error);
    return NextResponse.json(
      { error: 'Error al obtener los contratos' },
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
      propertyId,
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
    } = body;

    if (!propertyId || !tenantName || !tenantEmail || !startDate || !endDate || !monthlyRent || !depositAmount) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    // Verificar que la propiedad existe y está disponible
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'La propiedad no existe' },
        { status: 404 }
      );
    }

    // Crear contrato y actualizar estado de propiedad en una transacción
    const contract = await prisma.$transaction(async (tx) => {
      const newContract = await tx.contract.create({
        data: {
          propertyId,
          tenantName,
          tenantEmail,
          tenantPhone: tenantPhone || null,
          tenantWhatsapp: tenantWhatsapp || null,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reviewDate: reviewDate ? new Date(reviewDate) : null,
          monthlyRent,
          annualIncrement: annualIncrement || 0,
          depositAmount,
          notes: notes || null,
          status: 'active',
        },
        include: {
          property: {
            include: { zone: true },
          },
        },
      });

      // Actualizar estado de la propiedad a 'rented'
      await tx.property.update({
        where: { id: propertyId },
        data: { status: 'rented' },
      });

      // Crear alerta para 15 días antes de la fecha de fin
      const endDateObj = new Date(endDate);
      const alertEndDate = new Date(endDateObj);
      alertEndDate.setDate(alertEndDate.getDate() - 15);

      await tx.alert.create({
        data: {
          contractId: newContract.id,
          type: 'contract_expiry',
          title: `Contrato por vencer: ${property.name}`,
          dueDate: alertEndDate,
          message: `El contrato de ${tenantName} para la propiedad ${property.name} vence en 15 dias (${endDateObj.toLocaleDateString('es-MX')}).`,
          status: 'pending',
        },
      });

      // Crear alerta para la fecha de revisión si existe
      if (reviewDate) {
        const reviewDateObj = new Date(reviewDate);
        const alertReviewDate = new Date(reviewDateObj);
        alertReviewDate.setDate(alertReviewDate.getDate() - 15);

        await tx.alert.create({
          data: {
            contractId: newContract.id,
            type: 'rent_review',
            title: `Revision de renta: ${property.name}`,
            dueDate: alertReviewDate,
            message: `Revision del contrato de ${tenantName} para la propiedad ${property.name} programada para ${reviewDateObj.toLocaleDateString('es-MX')}.`,
            status: 'pending',
          },
        });
      }

      return newContract;
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error('Error al crear contrato:', error);
    return NextResponse.json(
      { error: 'Error al crear el contrato' },
      { status: 500 }
    );
  }
}
