import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import {
  sendEmail,
  buildAdminContractUploadedEmail,
  buildTenantContractRenewedEmail,
} from '@/lib/email'
import { formatDate } from '@/lib/utils'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { property: true },
  })
  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no permitido. Solo PDF y Word (.doc, .docx)' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo excede 10MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = path.extname(file.name) || '.pdf'
  const fileName = `contrato-${id}-${Date.now()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'contracts')

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), buffer)

  const fileUrl = `/uploads/contracts/${fileName}`

  const updated = await prisma.contract.update({
    where: { id },
    data: {
      contractFileUrl: fileUrl,
      contractFileName: file.name,
    },
  })

  const propertyName = contract.property?.name || 'Propiedad'
  const tenantName = contract.tenantName || 'Inquilino'
  const adminEmail = session.user?.email

  // ═══════════════════════════════════════════
  // ALERTA: Contrato firmado subido - ADMIN
  // ═══════════════════════════════════════════
  await prisma.alert.create({
    data: {
      type: 'contract_uploaded',
      recipientType: 'admin',
      triggerDaysBefore: 0,
      title: `Contrato firmado subido - ${propertyName}`,
      message: `El contrato firmado de ${tenantName} para ${propertyName} ha sido cargado (${file.name}).`,
      dueDate: new Date(),
      status: 'sent',
      contractId: id,
      sentEmail: !!adminEmail,
    },
  })

  // Enviar email al admin
  if (adminEmail) {
    try {
      const html = buildAdminContractUploadedEmail({
        tenantName,
        propertyName,
        fileName: file.name,
      })
      await sendEmail(adminEmail, `Contrato subido - ${propertyName}`, html)
    } catch (e) {
      console.error('Error enviando email admin contrato subido:', e)
    }
  }

  // ═══════════════════════════════════════════
  // ALERTA: Contrato renovado - INQUILINO (con copia adjunta)
  // ═══════════════════════════════════════════
  await prisma.alert.create({
    data: {
      type: 'contract_uploaded',
      recipientType: 'tenant',
      triggerDaysBefore: 0,
      title: `Contrato renovado - ${propertyName}`,
      message: `${tenantName}, su contrato para ${propertyName} ha sido renovado. Vigencia: ${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}.`,
      dueDate: new Date(),
      status: 'sent',
      contractId: id,
      sentEmail: !!contract.tenantEmail,
    },
  })

  // Enviar email al inquilino con copia del contrato adjunta
  if (contract.tenantEmail) {
    try {
      const html = buildTenantContractRenewedEmail({
        tenantName,
        propertyName,
        startDate: formatDate(contract.startDate),
        endDate: formatDate(contract.endDate),
        fileName: file.name,
      })
      const filePath = path.join(uploadDir, fileName)
      await sendEmail(
        contract.tenantEmail,
        `Contrato renovado - ${propertyName}`,
        html,
        [{ filename: file.name, path: filePath }],
      )
    } catch (e) {
      console.error('Error enviando email inquilino contrato subido:', e)
    }
  }

  return NextResponse.json({
    url: updated.contractFileUrl,
    fileName: updated.contractFileName,
  })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  await prisma.contract.update({
    where: { id },
    data: { contractFileUrl: null, contractFileName: null },
  })

  return NextResponse.json({ success: true })
}
