import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const properties = await prisma.property.findMany({
    include: {
      zone: true,
      contracts: {
        where: { status: 'active' },
        take: 1,
      },
    },
    orderBy: [{ zone: { name: 'asc' } }, { name: 'asc' }],
  })

  const rows = properties.map((p) => {
    const contract = p.contracts[0]
    return {
      'Número': p.number,
      'Nombre': p.name,
      'M2': p.squareMeters || '',
      'Tipo': p.propertyType,
      'Zona': p.zone.name,
      'Dirección': p.address || '',
      'Estado': p.status === 'rented' ? 'Rentado' : p.status === 'available' ? 'Disponible' : p.status,
      'Inicio Contrato': contract ? contract.startDate.toLocaleDateString('es-MX') : '',
      'Fin Contrato': contract ? contract.endDate.toLocaleDateString('es-MX') : '',
      'Revisión': contract?.reviewDate ? contract.reviewDate.toLocaleDateString('es-MX') : '',
      'Renta': contract?.monthlyRent || p.monthlyRent || '',
      'Inquilino': contract?.tenantName || '',
      'Email': contract?.tenantEmail || '',
      'Teléfono': contract?.tenantPhone || '',
      'WhatsApp': contract?.tenantWhatsapp || '',
      'Incremento': contract?.annualIncrement || '',
      'Depósito': contract?.depositAmount || '',
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 8 }, { wch: 15 }, { wch: 28 },
    { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 18 },
    { wch: 12 }, { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Propiedades')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const date = new Date().toISOString().split('T')[0]
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Propiedades_PropAdmin_${date}.xlsx"`,
    },
  })
}
