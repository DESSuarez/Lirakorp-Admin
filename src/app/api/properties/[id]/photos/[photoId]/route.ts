import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const photo = await prisma.photo.findUnique({ where: { id: params.photoId } })
  if (!photo || photo.propertyId !== params.id) {
    return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
  }

  // Delete file from disk
  try {
    const filePath = path.join(process.cwd(), 'public', photo.url)
    await unlink(filePath)
  } catch {
    // File may not exist, continue with DB deletion
  }

  await prisma.photo.delete({ where: { id: params.photoId } })

  return NextResponse.json({ success: true })
}
