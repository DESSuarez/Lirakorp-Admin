import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/utils'
import { differenceInMonths } from 'date-fns'

// Simple PDF builder (same as availability)
const PW = 612, PH = 792, M = 60, CW = PW - 2 * M

class PDF {
  private pageStreams: string[] = []
  private currentStream = ''
  private curY = PH - M

  get y() { return this.curY }
  set y(v: number) { this.curY = v }

  private esc(t: string) {
    return t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  }

  text(t: string, x: number, size: number, bold = false, r = 0, g = 0, b = 0) {
    this.currentStream += `BT ${bold ? '/F2' : '/F1'} ${size} Tf ${r} ${g} ${b} rg ${x} ${this.curY} Td (${this.esc(t)}) Tj ET\n`
  }

  rect(x: number, yy: number, w: number, h: number, r: number, g: number, b: number) {
    this.currentStream += `${r} ${g} ${b} rg ${x} ${yy} ${w} ${h} re f\n`
  }

  line(x1: number, yy: number, x2: number, r: number, g: number, b: number, w = 0.5) {
    this.currentStream += `${r} ${g} ${b} RG ${w} w ${x1} ${yy} m ${x2} ${yy} l S\n`
  }

  checkSpace(needed: number) {
    if (this.curY - needed < M) {
      this.newPage()
    }
  }

  newPage() {
    if (this.currentStream) this.pageStreams.push(this.currentStream)
    this.currentStream = ''
    this.curY = PH - M
  }

  // Write a paragraph with word wrap - uses character width estimation
  paragraph(t: string, x: number, maxWidth: number, size: number, bold = false, r = 0, g = 0, b = 0, lineHeight?: number) {
    const lh = lineHeight || size * 1.4
    const avgCharWidth = size * (bold ? 0.52 : 0.47)
    const maxChars = Math.floor(maxWidth / avgCharWidth)
    const words = t.split(/\s+/).filter(w => w)
    let curLine = ''

    for (const word of words) {
      const testLine = curLine ? curLine + ' ' + word : word
      if (testLine.length > maxChars && curLine) {
        this.checkSpace(lh + 2)
        this.text(curLine, x, size, bold, r, g, b)
        this.curY -= lh
        curLine = word
        // Handle single words longer than max
        while (curLine.length > maxChars) {
          this.checkSpace(lh + 2)
          this.text(curLine.substring(0, maxChars), x, size, bold, r, g, b)
          this.curY -= lh
          curLine = curLine.substring(maxChars)
        }
      } else {
        curLine = testLine
      }
    }
    if (curLine) {
      this.checkSpace(lh + 2)
      this.text(curLine, x, size, bold, r, g, b)
      this.curY -= lh
    }
  }

  build(): Buffer {
    if (this.currentStream) this.pageStreams.push(this.currentStream)
    const numPages = this.pageStreams.length
    const imgBaseObj = 5
    const pageBaseObj = imgBaseObj

    const parts: Buffer[] = []
    const offsets: number[] = []
    let pos = 0

    function write(s: string) { const b = Buffer.from(s, 'latin1'); parts.push(b); pos += b.length }
    function writeBin(b: Buffer) { parts.push(b); pos += b.length }
    function markOffset() { offsets.push(pos) }

    write('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')

    markOffset()
    write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

    markOffset()
    const kids = []
    for (let i = 0; i < numPages; i++) kids.push(`${pageBaseObj + i * 2 + 1} 0 R`)
    write(`2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${numPages} >>\nendobj\n`)

    markOffset()
    write('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n')

    markOffset()
    write('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n')

    for (let i = 0; i < numPages; i++) {
      const streamObjNum = pageBaseObj + i * 2
      const pageObjNum = pageBaseObj + i * 2 + 1
      const content = this.pageStreams[i]
      const contentBuf = Buffer.from(content, 'latin1')

      markOffset()
      write(`${streamObjNum} 0 obj\n<< /Length ${contentBuf.length} >>\nstream\n`)
      writeBin(contentBuf)
      write('\nendstream\nendobj\n')

      markOffset()
      write(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Contents ${streamObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n`)
    }

    const xrefPos = pos
    const totalObjs = offsets.length + 1
    write(`xref\n0 ${totalObjs}\n0000000000 65535 f \n`)
    for (const off of offsets) write(String(off).padStart(10, '0') + ' 00000 n \n')
    write(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`)

    return Buffer.concat(parts)
  }
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

  // Find template: first by zone, then general
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

  const months = differenceInMonths(contract.endDate, contract.startDate)

  // Build replacements map
  const replacements: Record<string, string> = {
    // Inquilino
    'LUIS MIGUEL ARIZA JIMENEZ': contract.tenantName,
    'MICA IMELY': contract.tenantName,
    // Fiador
    'ALICIA DIAZ NAVEZ': contract.fiadorName || '________________________',
    'LUIS FACUNDO IMELY': contract.fiadorName || '________________________',
    // Renta
    '$7,900.00': formatCurrency(contract.monthlyRent),
    'SIETE MIL NOVECIENTOS PESOS 00/100 M.N': `${numberToWords(contract.monthlyRent)} PESOS 00/100 M.N`,
    '$7,900.00  (SIETE MIL NOVECIENTOS PESOS 00/100 M.N.)': `${formatCurrency(contract.monthlyRent)} (${numberToWords(contract.monthlyRent)} PESOS 00/100 M.N.)`,
    // Fechas
    '15 de Diciembre del año 2025 dos mil veinticinco': formatDate(contract.startDate),
    '15 de Diciembre  de  2025': formatDate(contract.startDate),
    '14 de Diciembre 2026': formatDate(contract.endDate),
    '14 DE Diciembre  de  2026': formatDate(contract.endDate),
    '11 de Diciembre de 2025 dos mil veinticinco': formatDate(contract.startDate),
    // Departamento
    'DEPARTAMENTO # 08': `DEPARTAMENTO # ${contract.property.number}`,
  }

  const pdf = new PDF()

  if (template) {
    // Use template content with replacements
    let content = template.content

    // Apply replacements
    for (const [search, replace] of Object.entries(replacements)) {
      content = content.split(search).join(replace)
    }

    // Split into paragraphs and render
    const paragraphs = content.split('\n')

    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (!trimmed) {
        pdf.y -= 6 // blank line spacing
        continue
      }

      // Detect content types
      const isMainTitle = trimmed.includes('CONTRATO DE SUBARRENDAMIENTO') && trimmed.length < 45
      const isDeclaraciones = /^D\s*E\s*C\s*L\s*A\s*R\s*A\s*C\s*I\s*O\s*N\s*E\s*S/.test(trimmed)
      const isClausulas = /^C\s*L\s*A\s*U\s*S\s*U\s*L\s*A\s*S/.test(trimmed)
      const isClauseStart = /^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[EÉ]PTIMA|OCTAVA|NOVENA|D[EÉ]CIMA|VIG[EÉ]SI)/.test(trimmed)
      const isSectionHeader = /^[IVX]+\.\s*(DECLARA|FIADOR)/.test(trimmed) || /^\d+\.\-/.test(trimmed)
      const isSubItem = /^[A-H]\)\.\-|^[A-H]\)\.-|^[a-h]\)/.test(trimmed)

      if (isMainTitle) {
        pdf.checkSpace(35)
        pdf.y -= 8
        pdf.paragraph(trimmed, M, CW, 13, true, 0.1, 0.1, 0.1)
        pdf.y -= 10
      } else if (isDeclaraciones || isClausulas) {
        pdf.checkSpace(30)
        pdf.y -= 12
        pdf.paragraph(trimmed, M, CW, 11, true, 0.1, 0.1, 0.1)
        pdf.y -= 8
      } else if (isClauseStart) {
        pdf.checkSpace(25)
        pdf.y -= 8
        pdf.paragraph(trimmed, M, CW, 9, true, 0.1, 0.1, 0.1)
        pdf.y -= 3
      } else if (isSectionHeader) {
        pdf.checkSpace(22)
        pdf.y -= 6
        pdf.paragraph(trimmed, M, CW, 9.5, true, 0.15, 0.15, 0.15)
        pdf.y -= 3
      } else if (isSubItem) {
        pdf.checkSpace(15)
        pdf.paragraph(trimmed, M + 15, CW - 15, 8.5, false, 0.2, 0.2, 0.2)
        pdf.y -= 2
      } else {
        pdf.paragraph(trimmed, M, CW, 8.5, false, 0.18, 0.18, 0.18)
        pdf.y -= 2
      }
    }

    // Signature block
    pdf.checkSpace(100)
    pdf.y -= 30
    pdf.line(M, pdf.y, PW - M, 0.8, 0.8, 0.8, 0.5)
    pdf.y -= 30

    pdf.text('LA SUBARRENDADORA', M, 9, true, 0.1, 0.1, 0.1)
    pdf.text('LA SUBARRENDATARIA', M + CW / 2, 9, true, 0.1, 0.1, 0.1)
    pdf.y -= 30
    pdf.line(M, pdf.y, M + 180, 0.3, 0.3, 0.3, 0.5)
    pdf.line(M + CW / 2, pdf.y, M + CW / 2 + 180, 0.3, 0.3, 0.3, 0.5)
    pdf.y -= 12
    pdf.text('ACK CIMENTACIONES S.A. DE C.V.', M, 8, false, 0.3, 0.3, 0.3)
    pdf.text(contract.tenantName, M + CW / 2, 8, false, 0.3, 0.3, 0.3)

    if (contract.fiadorName) {
      pdf.y -= 30
      pdf.text('EL FIADOR', M + CW / 4, 9, true, 0.1, 0.1, 0.1)
      pdf.y -= 30
      pdf.line(M + CW / 4, pdf.y, M + CW / 4 + 180, 0.3, 0.3, 0.3, 0.5)
      pdf.y -= 12
      pdf.text(contract.fiadorName, M + CW / 4, 8, false, 0.3, 0.3, 0.3)
    }
  } else {
    // No template - generate basic contract
    pdf.text('CONTRATO DE SUBARRENDAMIENTO', M, 14, true, 0.1, 0.1, 0.1)
    pdf.y -= 25
    pdf.paragraph(`No se encontro plantilla para la zona "${contract.property.zone.name}". Por favor, suba una plantilla en la seccion de Plantillas.`, M, CW, 11, false, 0.5, 0.1, 0.1)
  }

  const pdfBuffer = pdf.build()
  const filename = `Contrato_${contract.property.name.replace(/\s+/g, '_')}_${contract.tenantName.replace(/\s+/g, '_')}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}

function numberToWords(n: number): string {
  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

  const num = Math.floor(n)
  if (num === 0) return 'CERO'
  if (num === 100) return 'CIEN'

  let result = ''
  const thousands = Math.floor(num / 1000)
  const remainder = num % 1000

  if (thousands > 0) {
    if (thousands === 1) result += 'MIL '
    else {
      const th = convertHundreds(thousands)
      result += th + ' MIL '
    }
  }

  if (remainder > 0) {
    result += convertHundreds(remainder)
  }

  return result.trim()

  function convertHundreds(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'CIEN'

    let r = ''
    const h = Math.floor(n / 100)
    const t = n % 100

    if (h > 0) r += hundreds[h] + ' '

    if (t >= 10 && t <= 19) {
      r += teens[t - 10]
    } else if (t >= 20 && t <= 29 && t !== 20) {
      r += 'VEINTI' + units[t - 20]
    } else {
      const d = Math.floor(t / 10)
      const u = t % 10
      if (d > 0) r += tens[d]
      if (d > 0 && u > 0) r += ' Y '
      if (u > 0) r += units[u]
    }

    return r.trim()
  }
}
