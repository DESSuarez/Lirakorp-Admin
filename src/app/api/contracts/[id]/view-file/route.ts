import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const contract = await prisma.contract.findUnique({
    where: { id },
    select: { contractFileUrl: true, contractFileName: true },
  })

  if (!contract?.contractFileUrl) {
    return NextResponse.json({ error: 'No file' }, { status: 404 })
  }

  const url = contract.contractFileUrl
  if (!url.startsWith('data:')) {
    return NextResponse.redirect(url)
  }

  // Parse data URI: data:application/pdf;base64,XXXX
  const match = url.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return NextResponse.json({ error: 'Invalid file' }, { status: 400 })

  const mimeType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  const filename = contract.contractFileName || 'contrato.pdf'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
