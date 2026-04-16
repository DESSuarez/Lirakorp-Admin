import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from 'docx'
import { formatCurrency, formatDate } from '@/lib/utils'
import { differenceInMonths } from 'date-fns'

function numberToWords(n: number): string {
  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']
  const num = Math.floor(n)
  if (num === 0) return 'CERO'
  if (num === 100) return 'CIEN'
  let result = ''
  const th = Math.floor(num / 1000)
  const rem = num % 1000
  if (th > 0) { result += (th === 1 ? 'MIL ' : convertH(th) + ' MIL ') }
  if (rem > 0) result += convertH(rem)
  return result.trim()
  function convertH(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'CIEN'
    let r = ''
    const h = Math.floor(n / 100), t = n % 100
    if (h > 0) r += hundreds[h] + ' '
    if (t >= 10 && t <= 19) r += teens[t - 10]
    else if (t >= 20 && t <= 29 && t !== 20) r += 'VEINTI' + units[t - 20]
    else { const d = Math.floor(t / 10), u = t % 10; if (d > 0) r += tens[d]; if (d > 0 && u > 0) r += ' Y '; if (u > 0) r += units[u] }
    return r.trim()
  }
}

function formatDateLong(d: Date): string {
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`
}

function formatDateLetras(d: Date): string {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const yearWords = numberToWords(d.getFullYear()).toLowerCase()
  return `${d.getDate()} de ${months[d.getMonth()]} del año ${d.getFullYear()} ${yearWords}`
}

const pend = (label: string) => `[PENDIENTE: ${label}]`

function pendienteRun(label: string): TextRun {
  return new TextRun({
    text: `[PENDIENTE: ${label}]`,
    bold: true,
    underline: {},
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FFFF00' },
    font: 'Arial',
    size: 22,
  })
}

function normalRun(text: string, bold = false, size = 22): TextRun {
  return new TextRun({ text, bold, font: 'Arial', size })
}

function applyPlaceholders(content: string, contract: any): string {
  const months = differenceInMonths(contract.endDate, contract.startDate)
  const propNumber = contract.property?.number || ''
  const propName = contract.property?.name || ''
  const propAddress = contract.property?.address || ''
  const propM2 = contract.property?.squareMeters || ''
  const inventory = contract.propertyInventory || contract.property?.description || pend('INVENTARIO DEL INMUEBLE')

  const replacements: Record<string, string> = {
    '{{ARRENDATARIO_NOMBRE}}': contract.tenantName || pend('NOMBRE DEL ARRENDATARIO'),
    '{{FIADOR_NOMBRE}}': contract.fiadorName || pend('NOMBRE DEL FIADOR'),
    '{{FIADOR_PROPIEDAD}}': contract.fiadorProperty || pend('PROPIEDAD DEL FIADOR'),
    '{{FECHA_INICIO}}': formatDateLong(contract.startDate),
    '{{FECHA_INICIO_LETRAS}}': formatDateLetras(contract.startDate),
    '{{FECHA_FIN}}': formatDateLong(contract.endDate),
    '{{FECHA_FIN_LETRAS}}': formatDateLetras(contract.endDate),
    '{{RENTA_MENSUAL}}': formatCurrency(contract.monthlyRent),
    '{{RENTA_LETRAS}}': `${numberToWords(contract.monthlyRent)} PESOS 00/100 M.N`,
    '{{DEPOSITO}}': contract.depositAmount ? formatCurrency(contract.depositAmount) : pend('DEPOSITO'),
    '{{DEPOSITO_LETRAS}}': contract.depositAmount ? `${numberToWords(contract.depositAmount)} PESOS 00/100 M.N` : pend('DEPOSITO EN LETRA'),
    '{{PROPIEDAD_NUMERO}}': propNumber,
    '{{PROPIEDAD_NOMBRE}}': propName,
    '{{PROPIEDAD_DIRECCION}}': propAddress || pend('DIRECCION DEL INMUEBLE'),
    '{{PROPIEDAD_M2}}': String(propM2),
    '{{PROPIEDAD_INVENTARIO}}': inventory,
    '{{PROPIEDAD_USO}}': contract.propertyUse || 'CASA HABITACION',
    '{{MANTENIMIENTO}}': contract.maintenanceFee ? formatCurrency(contract.maintenanceFee) : pend('CUOTA MANTENIMIENTO'),
    '{{MANTENIMIENTO_LETRAS}}': contract.maintenanceFee ? `${numberToWords(contract.maintenanceFee)} PESOS 00/100 M.N` : pend('CUOTA MANTENIMIENTO EN LETRA'),
    '{{DURACION}}': `${months} MESES`,
    '{{DURACION_LETRAS}}': months === 12 ? 'UN AÑO' : `${numberToWords(months)} MESES`,
    '{{CIUDAD_FIRMA}}': contract.signingCity || pend('CIUDAD DE FIRMA'),
    '{{HORA_FIRMA}}': contract.signingTime || '10:00',
    '{{ARRENDADOR_NOMBRE}}': 'CELSO SUAREZ GURROLA',
    '{{FECHA_FIRMA}}': formatDateLong(new Date()),
  }

  // Also support old hardcoded replacements for backward compatibility with existing templates
  const legacyReplacements: Record<string, string> = {
    'LUIS MIGUEL ARIZA JIMENEZ': contract.tenantName,
    'MICA IMELY': contract.tenantName,
    'ALFONSO GALINDO FRANCO': contract.tenantName,
    'JUAN ENRIQUE VENEGAS DIAZ': contract.tenantName,
    'ALICIA DIAZ NAVEZ': contract.fiadorName || pend('NOMBRE DEL FIADOR'),
    'LUIS FACUNDO IMELY': contract.fiadorName || pend('NOMBRE DEL FIADOR'),
    'ARACELI HERNANDEZ NUÑO': contract.fiadorName || pend('NOMBRE DEL FIADOR'),
    // Las Juntas dates
    '15 de Diciembre del año 2025 dos mil veinticinco': formatDateLetras(contract.startDate),
    '15 de Diciembre  de  2025': formatDateLong(contract.startDate),
    '15 de Diciembre de  2025': formatDateLong(contract.startDate),
    '14 de Diciembre 2026': formatDateLong(contract.endDate),
    '14 DE Diciembre  de  2026': formatDateLong(contract.endDate),
    '14 de Diciembre  de 2026': formatDateLong(contract.endDate),
    // Ciudad Granja dates
    '11 de Diciembre de 2025 dos mil veinticinco': formatDateLetras(contract.startDate),
    '10 de Diciembre de 2026': formatDateLong(contract.endDate),
    // Wolf Tower dates
    '14 de Octubre de 2025 dos mil veinticinco': formatDateLetras(contract.startDate),
    '14 de Noviembre de 2025 dos mil veinticinco': formatDateLetras(contract.startDate),
    '14  de Octubre del 2026': formatDateLong(contract.endDate),
    '14  de Noviembre del 2026': formatDateLong(contract.endDate),
    // Rent
    '$7,900.00': formatCurrency(contract.monthlyRent),
    'SIETE MIL NOVECIENTOS PESOS 00/100 M.N': `${numberToWords(contract.monthlyRent)} PESOS 00/100 M.N`,
    '$19,500.00': formatCurrency(contract.monthlyRent),
    'DIECINUEVE MIL QUINIENTOS PESOS 00/100 M.N': `${numberToWords(contract.monthlyRent)} PESOS 00/100 M.N`,
    '$ 22,500.00': formatCurrency(contract.monthlyRent),
    'VEINTIDOS MIL QUINIENTOS PESOS 00/100 M.N': `${numberToWords(contract.monthlyRent)} PESOS 00/100 M.N`,
    '$ 23,500.00': formatCurrency(contract.monthlyRent),
    'VEINTITRES MIL QUINIENTOS PESOS 00/100 M.N': `${numberToWords(contract.monthlyRent)} PESOS 00/100 M.N`,
    // Maintenance
    '$ 300.00': contract.maintenanceFee ? formatCurrency(contract.maintenanceFee) : pend('CUOTA MANTENIMIENTO'),
    'Trecientos pesos 00/100 M.N': contract.maintenanceFee ? `${numberToWords(contract.maintenanceFee)} PESOS 00/100 M.N` : pend('CUOTA MANTENIMIENTO EN LETRA'),
    // Property
    'DEPARTAMENTO # 08': `DEPARTAMENTO # ${propNumber}`,
    'DEPARTAMENTO No. 08': `DEPARTAMENTO No. ${propNumber}`,
    'DEPARTAMENTO NUMERO 202': `DEPARTAMENTO NUMERO ${propNumber}`,
    'DEPARTAMENTO NUMERO 302': `DEPARTAMENTO NUMERO ${propNumber}`,
    'CASA No, 1 (UNO)': `CASA No. ${propNumber}`,
    // Duration
    '( UN AÑO)': `(${months === 12 ? 'UN AÑO' : numberToWords(months) + ' MESES'})`,
    '(UN AÑO)': `(${months === 12 ? 'UN AÑO' : numberToWords(months) + ' MESES'})`,
  }

  let result = content
  // Apply new placeholders first
  for (const [search, replace] of Object.entries(replacements)) {
    result = result.split(search).join(replace)
  }
  // Then legacy replacements
  for (const [search, replace] of Object.entries(legacyReplacements)) {
    result = result.split(search).join(replace)
  }
  return result
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { property: { include: { zone: true } } },
  })

  if (!contract) return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })

  // Find template by zone + hasGuarantor, then zone only, then general
  const hasGuarantor = contract.hasGuarantor ?? true
  let template = await prisma.contractTemplate.findFirst({
    where: { zoneId: contract.property.zoneId, hasGuarantor, isActive: true },
    orderBy: { year: 'desc' },
  })
  if (!template) {
    template = await prisma.contractTemplate.findFirst({
      where: { zoneId: contract.property.zoneId, isActive: true },
      orderBy: { year: 'desc' },
    })
  }
  if (!template) {
    template = await prisma.contractTemplate.findFirst({
      where: { zoneId: null, isActive: true },
      orderBy: { year: 'desc' },
    })
  }

  if (!template) {
    return NextResponse.json({ error: 'No se encontro plantilla para esta zona. Suba una plantilla en la seccion de Plantillas.' }, { status: 404 })
  }

  // Apply placeholder substitutions
  const content = applyPlaceholders(template.content, contract)

  // Build Word document paragraphs
  const lines = content.split('\n')
  const paragraphs: Paragraph[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 100 } }))
      continue
    }

    const isMainTitle = trimmed.includes('CONTRATO DE SUBARRENDAMIENTO') && trimmed.length < 45
    const isDeclaraciones = /^D\s*E\s*C\s*L\s*A\s*R\s*A\s*C\s*I\s*O\s*N\s*E\s*S/.test(trimmed)
    const isClausulas = /^C\s*L\s*A\s*U\s*S\s*U\s*L\s*A\s*S/.test(trimmed)
    const isClauseStart = /^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[EÉ]PTIMA|OCTAVA|NOVENA|D[EÉ]CIMA|VIG[EÉ]SI)/.test(trimmed)
    const isSectionHeader = /^[IVX]+[\.\s]/.test(trimmed)

    const children: TextRun[] = []
    if (trimmed.includes('[PENDIENTE:')) {
      const regex = /\[PENDIENTE: ([^\]]+)\]/g
      let lastIndex = 0
      let match
      while ((match = regex.exec(trimmed)) !== null) {
        if (match.index > lastIndex) {
          children.push(normalRun(trimmed.substring(lastIndex, match.index), isClauseStart || isMainTitle || isDeclaraciones || isClausulas))
        }
        children.push(pendienteRun(match[1]))
        lastIndex = match.index + match[0].length
      }
      if (lastIndex < trimmed.length) {
        children.push(normalRun(trimmed.substring(lastIndex), isClauseStart || isMainTitle || isDeclaraciones || isClausulas))
      }
    } else {
      children.push(normalRun(trimmed, isClauseStart || isMainTitle || isDeclaraciones || isClausulas || isSectionHeader, isMainTitle ? 28 : 22))
    }

    paragraphs.push(new Paragraph({
      children,
      alignment: isMainTitle ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: {
        after: isMainTitle ? 300 : isDeclaraciones || isClausulas ? 200 : isClauseStart ? 150 : 80,
        before: isClauseStart ? 100 : 0,
      },
      heading: isMainTitle ? HeadingLevel.HEADING_1 : undefined,
    }))
  }

  // Signature block
  paragraphs.push(new Paragraph({ spacing: { before: 400, after: 200 } }))

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

  const sigRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({ children: [normalRun('_________________________', false, 20)], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [normalRun('"LA SUBARRENDADORA"', true, 20)], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [normalRun('ACK CIMENTACIONES S.A. DE C.V.', false, 18)], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [normalRun('CELSO SUAREZ GURROLA', false, 18)], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [normalRun('ADMINISTRADOR UNICO', false, 16)], alignment: AlignmentType.CENTER }),
          ],
          borders: noBorders,
          width: { size: 50, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            new Paragraph({ children: [normalRun('_________________________', false, 20)], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [normalRun('"LA SUBARRENDATARIA"', true, 20)], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [normalRun(contract.tenantName, false, 18)], alignment: AlignmentType.CENTER }),
          ],
          borders: noBorders,
          width: { size: 50, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
  ]

  if (hasGuarantor) {
    // Con aval: firma del fiador
    sigRows.push(new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({ spacing: { before: 300 } }),
            new Paragraph({ children: [normalRun('_________________________', false, 20)], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [normalRun('"EL FIADOR"', true, 20)], alignment: AlignmentType.CENTER }),
            new Paragraph({
              children: [contract.fiadorName ? normalRun(contract.fiadorName, false, 18) : pendienteRun('NOMBRE DEL FIADOR')],
              alignment: AlignmentType.CENTER,
            }),
          ],
          borders: noBorders,
          columnSpan: 2,
        }),
      ],
    }))
  } else {
    // Sin aval: firma de testigos
    sigRows.push(new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({ spacing: { before: 400 } }),
            new Paragraph({ children: [normalRun('TESTIGO:', true, 20)], alignment: AlignmentType.CENTER }),
            new Paragraph({ spacing: { before: 200 } }),
            new Paragraph({ children: [normalRun('_________________________', false, 20)], alignment: AlignmentType.CENTER }),
          ],
          borders: noBorders,
          width: { size: 50, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            new Paragraph({ spacing: { before: 400 } }),
            new Paragraph({ children: [normalRun('TESTIGO:', true, 20)], alignment: AlignmentType.CENTER }),
            new Paragraph({ spacing: { before: 200 } }),
            new Paragraph({ children: [normalRun('_________________________', false, 20)], alignment: AlignmentType.CENTER }),
          ],
          borders: noBorders,
          width: { size: 50, type: WidthType.PERCENTAGE },
        }),
      ],
    }))
  }

  const sigTable = new Table({
    rows: sigRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      children: [...paragraphs, sigTable],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const filename = `Contrato_${contract.property.name.replace(/\s+/g, '_')}_${contract.tenantName.replace(/\s+/g, '_')}.docx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
