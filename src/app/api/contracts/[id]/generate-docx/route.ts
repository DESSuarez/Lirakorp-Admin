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

// Create a PENDIENTE text run with yellow highlight
function pendiente(label: string): TextRun {
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { property: { include: { zone: true } } },
  })

  if (!contract) return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })

  // Find template by zone first, then general
  let template = await prisma.contractTemplate.findFirst({
    where: { zoneId: contract.property.zoneId, isActive: true },
    orderBy: { year: 'desc' },
  })
  if (!template) {
    template = await prisma.contractTemplate.findFirst({
      where: { zoneId: null, isActive: true },
      orderBy: { year: 'desc' },
    })
  }

  if (!template) {
    return NextResponse.json({ error: 'No se encontro plantilla para esta zona. Suba una plantilla en la seccion de Plantillas.' }, { status: 404 })
  }

  const months = differenceInMonths(contract.endDate, contract.startDate)

  // Build replacement map: key = text to find, value = replacement or null (PENDIENTE)
  const replacements: Record<string, string | null> = {
    // Tenant names (from both templates)
    'LUIS MIGUEL ARIZA JIMENEZ': contract.tenantName,
    'MICA IMELY': contract.tenantName,
    // Fiador names
    'ALICIA DIAZ NAVEZ': contract.fiadorName || null,
    'LUIS FACUNDO IMELY': contract.fiadorName || null,
    // Dates - Las Juntas template
    '15 de Diciembre del año 2025 dos mil veinticinco': formatDate(contract.startDate),
    '15 de Diciembre  de  2025': formatDate(contract.startDate),
    '15 de Diciembre de  2025': formatDate(contract.startDate),
    '14 de Diciembre 2026': formatDate(contract.endDate),
    '14 DE Diciembre  de  2026': formatDate(contract.endDate),
    '14 de Diciembre  de 2026': formatDate(contract.endDate),
    // Dates - Ciudad Granja template
    '11 de Diciembre de 2025 dos mil veinticinco': formatDate(contract.startDate),
    '10 de Diciembre de 2026': formatDate(contract.endDate),
    // Rent amounts
    '$7,900.00': formatCurrency(contract.monthlyRent),
    'SIETE MIL NOVECIENTOS PESOS 00/100 M.N': `${numberToWords(contract.monthlyRent)} PESOS 00/100 M.N`,
    '$19,500.00': formatCurrency(contract.monthlyRent),
    'DIECINUEVE MIL QUINIENTOS PESOS 00/100 M.N': `${numberToWords(contract.monthlyRent)} PESOS 00/100 M.N`,
    // Maintenance
    '$ 300.00': contract.maintenanceFee ? formatCurrency(contract.maintenanceFee) : null,
    'Trecientos pesos 00/100 M.N': contract.maintenanceFee ? `${numberToWords(contract.maintenanceFee)} PESOS 00/100 M.N` : null,
    // Department/property number
    'DEPARTAMENTO # 08': `DEPARTAMENTO # ${contract.property.number}`,
    'DEPARTAMENTO No. 08': `DEPARTAMENTO No. ${contract.property.number}`,
    'CASA No, 1 (UNO)': `CASA No. ${contract.property.number}`,
    // Duration
    '( UN AÑO)': `(${months} MESES)`,
    'UN AÑO': `${months} MESES`,
  }

  // Process template: replace known values, mark unknowns as PENDIENTE
  let content = template.content

  for (const [search, replace] of Object.entries(replacements)) {
    if (replace !== null) {
      content = content.split(search).join(replace)
    }
  }

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

    // Check for null replacements (PENDIENTE fields) and create mixed runs
    const children: TextRun[] = []
    let processedText = trimmed

    // Replace null values with PENDIENTE markers
    for (const [search, replace] of Object.entries(replacements)) {
      if (replace === null && processedText.includes(search)) {
        const parts = processedText.split(search)
        // Rebuild with PENDIENTE - we'll handle this in a simple way
        processedText = processedText.split(search).join(`[PENDIENTE: ${search}]`)
      }
    }

    // Check if text contains PENDIENTE markers
    if (processedText.includes('[PENDIENTE:')) {
      const regex = /\[PENDIENTE: ([^\]]+)\]/g
      let lastIndex = 0
      let match
      while ((match = regex.exec(processedText)) !== null) {
        // Text before PENDIENTE
        if (match.index > lastIndex) {
          children.push(normalRun(processedText.substring(lastIndex, match.index), isClauseStart || isMainTitle || isDeclaraciones || isClausulas))
        }
        // PENDIENTE marker
        children.push(pendiente(match[1]))
        lastIndex = match.index + match[0].length
      }
      // Text after last PENDIENTE
      if (lastIndex < processedText.length) {
        children.push(normalRun(processedText.substring(lastIndex), isClauseStart || isMainTitle || isDeclaraciones || isClausulas))
      }
    } else {
      children.push(normalRun(processedText, isClauseStart || isMainTitle || isDeclaraciones || isClausulas || isSectionHeader, isMainTitle ? 28 : 22))
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

  paragraphs.push(new Paragraph({
    children: [],
  }))

  // Signature table
  const sigTable = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [normalRun('_________________________', false, 20)], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [normalRun('LA SUBARRENDADORA', true, 20)], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [normalRun('ACK CIMENTACIONES S.A. DE C.V.', false, 18)], alignment: AlignmentType.CENTER }),
            ],
            borders: noBorders,
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [normalRun('_________________________', false, 20)], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [normalRun('LA SUBARRENDATARIA', true, 20)], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [normalRun(contract.tenantName, false, 18)], alignment: AlignmentType.CENTER }),
            ],
            borders: noBorders,
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ spacing: { before: 300 } }),
              new Paragraph({ children: [normalRun('_________________________', false, 20)], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [normalRun('EL FIADOR', true, 20)], alignment: AlignmentType.CENTER }),
              new Paragraph({
                children: [contract.fiadorName ? normalRun(contract.fiadorName, false, 18) : pendiente('NOMBRE DEL FIADOR')],
                alignment: AlignmentType.CENTER,
              }),
            ],
            borders: noBorders,
            columnSpan: 2,
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
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
