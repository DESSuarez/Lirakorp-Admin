import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ token: string }>
}

// GET: obtener info del contrato por token (para la página pública)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params

  const contract = await prisma.contract.findUnique({
    where: { renewalToken: token },
    include: {
      property: {
        include: { zone: true },
      },
    },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Token inválido o contrato no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    tenantName: contract.tenantName,
    propertyName: contract.property.name,
    propertyAddress: contract.property.address,
    zoneName: contract.property.zone.name,
    startDate: contract.startDate,
    endDate: contract.endDate,
    monthlyRent: contract.monthlyRent,
    renewalResponse: contract.renewalResponse,
    renewalRespondedAt: contract.renewalRespondedAt,
    status: contract.status,
  })
}

// POST: registrar la decisión del inquilino
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params

  const contract = await prisma.contract.findUnique({
    where: { renewalToken: token },
    include: {
      property: true,
    },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
  }

  if (contract.renewalResponse) {
    return NextResponse.json({
      error: 'Ya se registró una respuesta anteriormente',
      response: contract.renewalResponse,
    }, { status: 400 })
  }

  const body = await request.json()
  const response = body.response // "wants_renewal" or "no_renewal"

  if (!['wants_renewal', 'no_renewal'].includes(response)) {
    return NextResponse.json({ error: 'Respuesta inválida' }, { status: 400 })
  }

  const updated = await prisma.contract.update({
    where: { renewalToken: token },
    data: {
      renewalResponse: response,
      renewalRespondedAt: new Date(),
      status: response === 'wants_renewal' ? 'pending_renewal' : 'cancelled',
    },
  })

  // Crear alerta para el admin sobre la decisión del inquilino
  const responseLabel = response === 'wants_renewal' ? 'QUIERE RENOVAR' : 'NO QUIERE RENOVAR'
  await prisma.alert.create({
    data: {
      type: 'renewal_contact',
      recipientType: 'admin',
      title: `Respuesta de inquilino - ${contract.property.name}`,
      message: `${contract.tenantName} ha respondido: ${responseLabel} el contrato en ${contract.property.name}.`,
      dueDate: new Date(),
      status: 'pending',
      contractId: contract.id,
      triggerDaysBefore: 0,
    },
  })

  return NextResponse.json({
    success: true,
    response: updated.renewalResponse,
    message: response === 'wants_renewal'
      ? 'Gracias por confirmar. El administrador se pondrá en contacto para formalizar la renovación.'
      : 'Hemos registrado su decisión. Gracias por su tiempo.',
  })
}
