import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { addDays } from 'date-fns'

function parseDate(value: any): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'number') {
    // Excel serial date
    const date = new Date((value - 25569) * 86400 * 1000)
    return isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'string') {
    // Try dd/mm/yyyy
    const parts = value.split(/[\/\-]/)
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number)
      if (y > 1900) return new Date(y, m - 1, d)
      // Try mm/dd/yyyy
      return new Date(m, d - 1, y)
    }
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

function normalizeHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, string[]> = {
    number: ['numero', 'número', 'num', 'no', 'id', 'clave', 'number'],
    name: ['nombre', 'propiedad', 'name', 'inmueble', 'nombre de la propiedad', 'nombre propiedad'],
    m2: ['m2', 'metros', 'metros cuadrados', 'superficie', 'area', 'área'],
    type: ['tipo', 'tipo de propiedad', 'type', 'tipo propiedad'],
    zone: ['zona', 'zone', 'ubicacion', 'ubicación', 'tipo de propiedad por zona', 'zona geográfica', 'zona geografica'],
    address: ['direccion', 'dirección', 'domicilio', 'address'],
    startDate: ['inicio', 'inicio contrato', 'fecha inicio', 'start', 'fecha del inicio', 'inicio de contrato', 'fecha de inicio de contrato'],
    endDate: ['fin', 'fin contrato', 'fecha fin', 'end', 'terminacion', 'terminación', 'fecha de terminación', 'fecha terminacion', 'fecha de terminacion de contrato'],
    reviewDate: ['revision', 'revisión', 'fecha revision', 'fecha revisión', 'fecha de revisión', 'incrementos', 'revisión de incrementos', 'fecha de revision de incrementos'],
    rent: ['renta', 'importe', 'monto', 'rent', 'importe de renta', 'renta mensual'],
    tenant: ['inquilino', 'arrendatario', 'nombre inquilino', 'tenant', 'persona', 'nombre de la persona'],
    email: ['email', 'correo', 'correo electrónico', 'correo electronico', 'e-mail'],
    phone: ['telefono', 'teléfono', 'phone', 'tel', 'contacto', 'información de contacto'],
    whatsapp: ['whatsapp', 'wa', 'whats'],
    increment: ['incremento', 'porcentaje', 'aumento', 'increment', '% incremento'],
    deposit: ['deposito', 'depósito', 'garantia', 'garantía', 'deposit'],
  }

  const result: Record<string, number> = {}
  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim()
    for (const [key, aliases] of Object.entries(map)) {
      if (aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))) {
        if (!result[key]) result[key] = index
      }
    }
  })
  return result
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const action = formData.get('action') as string

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    if (rawData.length < 2) {
      return NextResponse.json({ error: 'El archivo está vacío o no tiene datos' }, { status: 400 })
    }

    const headers = rawData[0].map((h: any) => String(h || ''))
    const columnMap = normalizeHeaders(headers)
    const rows = rawData.slice(1).filter((row) => row.some((cell) => cell != null && cell !== ''))

    const getValue = (row: any[], key: string) => {
      const idx = columnMap[key]
      if (idx === undefined) return null
      return row[idx] ?? null
    }

    const parsedRows = rows.map((row) => ({
      number: String(getValue(row, 'number') || '').trim(),
      name: String(getValue(row, 'name') || '').trim(),
      m2: Number(getValue(row, 'm2')) || 0,
      type: String(getValue(row, 'type') || 'otro').trim().toLowerCase(),
      zone: String(getValue(row, 'zone') || 'Sin zona').trim(),
      address: getValue(row, 'address') ? String(getValue(row, 'address')).trim() : null,
      startDate: parseDate(getValue(row, 'startDate')),
      endDate: parseDate(getValue(row, 'endDate')),
      reviewDate: parseDate(getValue(row, 'reviewDate')),
      rent: Number(getValue(row, 'rent')) || 0,
      tenant: getValue(row, 'tenant') ? String(getValue(row, 'tenant')).trim() : null,
      email: getValue(row, 'email') ? String(getValue(row, 'email')).trim() : null,
      phone: getValue(row, 'phone') ? String(getValue(row, 'phone')).trim() : null,
      whatsapp: getValue(row, 'whatsapp') ? String(getValue(row, 'whatsapp')).trim() : null,
      increment: Number(getValue(row, 'increment')) || null,
      deposit: Number(getValue(row, 'deposit')) || null,
    }))

    if (action === 'preview') {
      return NextResponse.json({ rows: parsedRows })
    }

    // Import
    const errors: string[] = []
    let imported = 0
    let contractsCreated = 0
    const zonesCreated = new Set<string>()

    for (const row of parsedRows) {
      try {
        if (!row.number || !row.name) {
          errors.push(`Fila sin número o nombre: ${JSON.stringify(row).slice(0, 100)}`)
          continue
        }

        // Upsert zone
        let zone = await prisma.zone.findUnique({ where: { name: row.zone } })
        if (!zone) {
          zone = await prisma.zone.create({ data: { name: row.zone } })
          zonesCreated.add(row.zone)
        }

        // Upsert property
        const hasContract = row.tenant && row.startDate && row.endDate
        let property = await prisma.property.findUnique({ where: { number: row.number } })

        if (property) {
          property = await prisma.property.update({
            where: { number: row.number },
            data: {
              name: row.name,
              squareMeters: row.m2,
              propertyType: row.type,
              address: row.address,
              monthlyRent: row.rent || null,
              zoneId: zone.id,
              status: hasContract ? 'rented' : 'available',
            },
          })
        } else {
          property = await prisma.property.create({
            data: {
              number: row.number,
              name: row.name,
              squareMeters: row.m2,
              propertyType: row.type,
              address: row.address,
              monthlyRent: row.rent || null,
              zoneId: zone.id,
              status: hasContract ? 'rented' : 'available',
            },
          })
        }
        imported++

        // Create contract if tenant data exists
        if (hasContract) {
          const existingContract = await prisma.contract.findFirst({
            where: {
              propertyId: property.id,
              tenantName: row.tenant!,
              startDate: row.startDate!,
            },
          })

          if (!existingContract) {
            const contract = await prisma.contract.create({
              data: {
                propertyId: property.id,
                tenantName: row.tenant!,
                tenantEmail: row.email,
                tenantPhone: row.phone,
                tenantWhatsapp: row.whatsapp,
                startDate: row.startDate!,
                endDate: row.endDate!,
                reviewDate: row.reviewDate,
                monthlyRent: row.rent,
                annualIncrement: row.increment,
                depositAmount: row.deposit,
                status: row.endDate! > new Date() ? 'active' : 'expired',
              },
            })

            // Auto-create alerts
            const daysToEnd = Math.ceil((row.endDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            if (daysToEnd > 0 && daysToEnd <= 60) {
              await prisma.alert.create({
                data: {
                  type: 'contract_expiry',
                  title: `Contrato por vencer: ${row.name}`,
                  message: `El contrato de ${row.tenant} para ${row.name} vence el ${row.endDate!.toLocaleDateString('es-MX')}`,
                  dueDate: addDays(row.endDate!, -15),
                  contractId: contract.id,
                },
              })
            }

            if (row.reviewDate) {
              const daysToReview = Math.ceil((row.reviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              if (daysToReview > 0 && daysToReview <= 60) {
                await prisma.alert.create({
                  data: {
                    type: 'rent_review',
                    title: `Revisión de renta: ${row.name}`,
                    message: `Revisión de incremento para ${row.name} (${row.increment || 0}%) el ${row.reviewDate.toLocaleDateString('es-MX')}`,
                    dueDate: addDays(row.reviewDate, -15),
                    contractId: contract.id,
                  },
                })
              }
            }

            contractsCreated++
          }
        }
      } catch (err: any) {
        errors.push(`Error en ${row.number}: ${err.message}`)
      }
    }

    return NextResponse.json({
      imported,
      contracts: contractsCreated,
      zones: zonesCreated.size,
      errors,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
