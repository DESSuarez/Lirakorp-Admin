import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const contract = await prisma.contract.findUnique({ where: { id: params.id } })
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
  const fileName = `contrato-${params.id}-${Date.now()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'contracts')

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), buffer)

  const fileUrl = `/uploads/contracts/${fileName}`

  const updated = await prisma.contract.update({
    where: { id: params.id },
    data: {
      contractFileUrl: fileUrl,
      contractFileName: file.name,
    },
  })

  return NextResponse.json({
    url: updated.contractFileUrl,
    fileName: updated.contractFileName,
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  await prisma.contract.update({
    where: { id: params.id },
    data: { contractFileUrl: null, contractFileName: null },
  })

  return NextResponse.json({ success: true })
}
