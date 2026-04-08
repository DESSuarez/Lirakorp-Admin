import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import path from 'path'

// ── PDF builder with image support ──

const PW = 612, PH = 792, M = 50, CW = PW - 2 * M

interface ImageData {
  data: Buffer
  width: number
  height: number
}

function getJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xFF) return null
    const marker = buf[i + 1]
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
    }
    const blockLen = buf.readUInt16BE(i + 2)
    i += 2 + blockLen
  }
  return null
}

class PDF {
  private pageStreams: string[] = []
  private currentStream = ''
  private curY = PH - M
  private images: { data: Buffer; width: number; height: number }[] = []
  private pageImages: Map<number, number[]> = new Map() // page index -> image indices

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

  roundRect(x: number, yy: number, w: number, h: number, r: number, g: number, b: number) {
    this.currentStream += `${r} ${g} ${b} rg ${x} ${yy} ${w} ${h} re f\n`
  }

  // Draw a JPEG image at position (x, y) with given display width/height
  drawImage(imgIndex: number, x: number, yy: number, w: number, h: number) {
    const pageIdx = this.pageStreams.length // current page (before commit)
    if (!this.pageImages.has(pageIdx)) this.pageImages.set(pageIdx, [])
    const refs = this.pageImages.get(pageIdx)!
    if (!refs.includes(imgIndex)) refs.push(imgIndex)
    this.currentStream += `q ${w} 0 0 ${h} ${x} ${yy} cm /Img${imgIndex} Do Q\n`
  }

  addImage(data: Buffer, width: number, height: number): number {
    this.images.push({ data, width, height })
    return this.images.length - 1
  }

  newPage() {
    if (this.currentStream) {
      this.pageStreams.push(this.currentStream)
    }
    this.currentStream = ''
    this.curY = PH - M
  }

  build(): Buffer {
    if (this.currentStream) {
      this.pageStreams.push(this.currentStream)
    }

    const numPages = this.pageStreams.length
    const numImages = this.images.length

    // Object layout:
    // 1 = Catalog, 2 = Pages, 3 = Font1, 4 = Font2
    // 5..5+numImages-1 = Image XObjects
    // Then for each page: stream + page = 2 objs per page
    const imgBaseObj = 5
    const pageBaseObj = imgBaseObj + numImages

    const parts: Buffer[] = []
    const offsets: number[] = []
    let pos = 0

    function write(s: string) {
      const b = Buffer.from(s, 'latin1')
      parts.push(b)
      pos += b.length
    }

    function writeBin(b: Buffer) {
      parts.push(b)
      pos += b.length
    }

    function markOffset() {
      offsets.push(pos)
    }

    write('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')

    // 1: Catalog
    markOffset()
    write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

    // 2: Pages
    markOffset()
    const kids = []
    for (let i = 0; i < numPages; i++) {
      kids.push(`${pageBaseObj + i * 2 + 1} 0 R`)
    }
    write(`2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${numPages} >>\nendobj\n`)

    // 3: Font
    markOffset()
    write('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n')

    // 4: Font Bold
    markOffset()
    write('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n')

    // Image XObjects (5, 6, 7, ...)
    for (let i = 0; i < numImages; i++) {
      const img = this.images[i]
      const objNum = imgBaseObj + i
      markOffset()
      write(`${objNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>\nstream\n`)
      writeBin(img.data)
      write('\nendstream\nendobj\n')
    }

    // Pages (stream + page obj per page)
    for (let i = 0; i < numPages; i++) {
      const streamObjNum = pageBaseObj + i * 2
      const pageObjNum = pageBaseObj + i * 2 + 1
      const content = this.pageStreams[i]
      const contentBuf = Buffer.from(content, 'latin1')

      // Stream object
      markOffset()
      write(`${streamObjNum} 0 obj\n<< /Length ${contentBuf.length} >>\nstream\n`)
      writeBin(contentBuf)
      write('\nendstream\nendobj\n')

      // Build XObject references for this page
      let xobjRefs = ''
      const imgRefs = this.pageImages.get(i)
      if (imgRefs && imgRefs.length > 0) {
        const refs = imgRefs.map(idx => `/Img${idx} ${imgBaseObj + idx} 0 R`).join(' ')
        xobjRefs = ` /XObject << ${refs} >>`
      }

      // Page object
      markOffset()
      write(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Contents ${streamObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xobjRefs} >> >>\nendobj\n`)
    }

    // XRef
    const xrefPos = pos
    const totalObjs = offsets.length + 1
    write(`xref\n0 ${totalObjs}\n0000000000 65535 f \n`)
    for (const off of offsets) {
      write(String(off).padStart(10, '0') + ' 00000 n \n')
    }
    write(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`)

    return Buffer.concat(parts)
  }
}

// ── Helpers ──

function fmtMoney(n: number | null) {
  if (!n) return 'Consultar'
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0 })
}

function fmtType(t: string) {
  const map: Record<string, string> = { departamento: 'Departamento', casa: 'Casa', bodega: 'Bodega', local: 'Local Comercial', terreno: 'Terreno' }
  return map[t] || t.charAt(0).toUpperCase() + t.slice(1)
}

async function loadPropertyImages(photos: any[]): Promise<{ imgData: ImageData; photoUrl: string }[]> {
  const sharp = (await import('sharp')).default
  const results: { imgData: ImageData; photoUrl: string }[] = []
  for (const photo of photos) {
    try {
      const filePath = path.join(process.cwd(), 'public', photo.url)
      const fileData = await readFile(filePath)
      // Convert any image to JPEG using sharp
      const jpegBuffer = await sharp(fileData)
        .resize(600, 450, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer()
      const dims = getJpegDimensions(jpegBuffer)
      if (dims) {
        results.push({ imgData: { data: jpegBuffer, ...dims }, photoUrl: photo.url })
      }
    } catch (e) {
      // Skip files that can't be read or converted
    }
  }
  return results
}

// ── Page builders ──

function drawCoverPage(pdf: PDF, zones: any[], filterLabel: string, dateStr: string) {
  const totalAvailable = zones.reduce((sum: number, z: any) => sum + z.properties.length, 0)
  const zonesWithProps = zones.filter((z: any) => z.properties.length > 0)

  pdf.rect(0, PH - 180, PW, 180, 0.118, 0.247, 0.541)
  pdf.y = PH - 65
  pdf.text('PROPIEDADES', M + 10, 34, true, 1, 1, 1)
  pdf.y -= 42
  pdf.text('DISPONIBLES', M + 10, 34, true, 0.749, 0.859, 0.996)

  pdf.y = PH - 210
  if (filterLabel) {
    pdf.text(filterLabel, M, 16, true, 0.231, 0.510, 0.965)
    pdf.y -= 22
  }
  pdf.text(`Generado el ${dateStr}`, M, 11, false, 0.45, 0.45, 0.45)
  pdf.y -= 35

  pdf.line(M, pdf.y, PW - M, 0.85, 0.85, 0.85, 1)
  pdf.y -= 35

  const bw = (CW - 20) / 3
  const stats = [
    { label: 'Total disponibles', value: String(totalAvailable) },
    { label: 'Zonas', value: String(zonesWithProps.length) },
    { label: 'Renta minima', value: fmtMoney(Math.min(...zones.flatMap((z: any) => z.properties.map((p: any) => p.monthlyRent || Infinity)).filter((n: number) => n < Infinity)) || 0) },
  ]
  const statsY = pdf.y
  for (let i = 0; i < stats.length; i++) {
    const bx = M + i * (bw + 10)
    pdf.roundRect(bx, statsY - 55, bw, 60, 0.945, 0.949, 0.976)
    pdf.y = statsY - 15
    pdf.text(stats[i].value, bx + 15, 22, true, 0.118, 0.247, 0.541)
    pdf.y = statsY - 43
    pdf.text(stats[i].label, bx + 15, 10, false, 0.45, 0.45, 0.45)
  }

  pdf.y = statsY - 80
  pdf.text('Zonas incluidas:', M, 12, true, 0.2, 0.2, 0.2)
  pdf.y -= 22
  for (const zone of zonesWithProps) {
    pdf.text(`   ${zone.name}  -  ${zone.properties.length} propiedad${zone.properties.length > 1 ? 'es' : ''}`, M, 10, false, 0.35, 0.35, 0.35)
    pdf.y -= 16
  }

  pdf.y = M + 15
  pdf.line(M, pdf.y + 10, PW - M, 0.88, 0.88, 0.88, 0.5)
  pdf.text('PropAdmin - Sistema de Gestion de Propiedades', M, 8, false, 0.6, 0.6, 0.6)
}

async function drawPropertyPage(pdf: PDF, property: any, zoneName: string, dateStr: string) {
  // Header
  pdf.rect(0, PH - 55, PW, 55, 0.118, 0.247, 0.541)
  pdf.y = PH - 22
  pdf.text('FICHA DE PROPIEDAD', M, 9, false, 0.749, 0.859, 0.996)
  pdf.y -= 16
  pdf.text(property.name, M, 17, true, 1, 1, 1)
  pdf.y = PH - 35
  pdf.text(zoneName, PW - M - 160, 10, true, 0.749, 0.859, 0.996)

  pdf.y = PH - 80

  // Badge
  pdf.roundRect(M, pdf.y - 16, 88, 20, 0.231, 0.510, 0.965)
  pdf.y -= 3
  pdf.text('DISPONIBLE', M + 10, 10, true, 1, 1, 1)
  pdf.y -= 28

  pdf.line(M, pdf.y, PW - M, 0.88, 0.88, 0.88, 1)
  pdf.y -= 22

  // Info section
  pdf.text('INFORMACION GENERAL', M, 12, true, 0.118, 0.247, 0.541)
  pdf.y -= 8

  const fields = [
    [['Numero', property.number], ['Superficie', property.squareMeters > 0 ? `${property.squareMeters} m2` : 'No especificada']],
    [['Nombre', property.name], ['Renta Mensual', property.monthlyRent ? fmtMoney(property.monthlyRent) + ' MXN' : 'Consultar']],
    [['Tipo', fmtType(property.propertyType)], ['Estado', 'Disponible']],
    [['Zona', zoneName], ['Direccion', property.address || 'No especificada']],
  ]

  const col2x = M + CW / 2 + 10
  for (const row of fields) {
    pdf.y -= 10
    const rowY = pdf.y
    pdf.y = rowY
    pdf.text(row[0][0], M, 8, false, 0.5, 0.5, 0.5)
    pdf.y -= 14
    pdf.text(row[0][1], M, 11, true, 0.15, 0.15, 0.15)
    pdf.y = rowY
    pdf.text(row[1][0], col2x, 8, false, 0.5, 0.5, 0.5)
    pdf.y -= 14
    const isPrice = row[1][0] === 'Renta Mensual' && property.monthlyRent
    pdf.text(row[1][1], col2x, 11, true, isPrice ? 0.086 : 0.15, isPrice ? 0.635 : 0.15, isPrice ? 0.255 : 0.15)
    pdf.y -= 10
  }

  pdf.y -= 10
  pdf.line(M, pdf.y, PW - M, 0.88, 0.88, 0.88, 1)
  pdf.y -= 22

  // Price box
  if (property.monthlyRent) {
    pdf.roundRect(M, pdf.y - 55, CW, 60, 0.941, 0.992, 0.953)
    const py = pdf.y
    pdf.y -= 12
    pdf.text('RENTA MENSUAL', M + 20, 9, true, 0.059, 0.420, 0.180)
    pdf.y -= 28
    pdf.text(fmtMoney(property.monthlyRent), M + 20, 26, true, 0.059, 0.502, 0.231)
    pdf.y = py - 36
    const ml = fmtMoney(property.monthlyRent).length
    pdf.text('MXN / mes', M + 20 + ml * 14.5, 10, false, 0.059, 0.420, 0.180)
    pdf.y = py - 12
    pdf.text(`Renta anual: ${fmtMoney(property.monthlyRent * 12)} MXN`, PW - M - 220, 10, false, 0.059, 0.420, 0.180)
    pdf.y = py - 70
  }

  // Gallery section
  pdf.text('GALERIA', M, 12, true, 0.118, 0.247, 0.541)
  pdf.y -= 15

  const photos = property.photos || []
  const loadedImages = await loadPropertyImages(photos)

  if (loadedImages.length > 0) {
    // 3-column grid
    const cols = 3
    const gap = 10
    const imgW = (CW - gap * (cols - 1)) / cols
    const imgH = imgW * 0.75 // 4:3 aspect ratio

    for (let i = 0; i < loadedImages.length; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)

      // Check if we need space (first row of images)
      if (col === 0 && row > 0) {
        pdf.y -= imgH + gap
      }

      const imgIdx = pdf.addImage(loadedImages[i].imgData.data, loadedImages[i].imgData.width, loadedImages[i].imgData.height)
      const x = M + col * (imgW + gap)
      const yPos = pdf.y - imgH

      // Gray background placeholder
      pdf.roundRect(x, yPos, imgW, imgH, 0.95, 0.95, 0.95)
      // Draw image
      pdf.drawImage(imgIdx, x, yPos, imgW, imgH)
    }

    // Move Y past the images
    const totalRows = Math.ceil(loadedImages.length / cols)
    pdf.y -= imgH + (totalRows > 1 ? 0 : 0) + 10
  } else {
    pdf.roundRect(M, pdf.y - 55, CW, 60, 0.96, 0.96, 0.96)
    pdf.y -= 22
    pdf.text('Fotografias disponibles proximamente', M + CW / 2 - 110, 10, false, 0.55, 0.55, 0.55)
    pdf.y -= 16
    pdf.text('Visite la aplicacion web para ver la galeria', M + CW / 2 - 120, 9, false, 0.65, 0.65, 0.65)
    pdf.y -= 25
  }

  // Description
  if (property.description) {
    pdf.y -= 5
    pdf.text('DESCRIPCION', M, 12, true, 0.118, 0.247, 0.541)
    pdf.y -= 16
    const words = property.description.split(' ')
    let curLine = ''
    for (const word of words) {
      if ((curLine + ' ' + word).length > 85) {
        pdf.text(curLine, M, 10, false, 0.3, 0.3, 0.3)
        pdf.y -= 14
        curLine = word
      } else {
        curLine = curLine ? curLine + ' ' + word : word
      }
    }
    if (curLine) {
      pdf.text(curLine, M, 10, false, 0.3, 0.3, 0.3)
    }
  }

  // Footer
  pdf.y = M + 12
  pdf.line(M, pdf.y + 8, PW - M, 0.9, 0.9, 0.9, 0.5)
  pdf.text(`PropAdmin  |  ${zoneName}  |  ${property.number}`, M, 7, false, 0.65, 0.65, 0.65)
  pdf.text(dateStr, PW - M - 100, 7, false, 0.65, 0.65, 0.65)
}

// ── API Route ──

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const zoneFilter = searchParams.get('zone')
  const typeFilter = searchParams.get('type')

  const propertyWhere: any = { status: 'available' }
  if (zoneFilter) propertyWhere.zoneId = zoneFilter
  if (typeFilter) propertyWhere.propertyType = typeFilter

  const zones = await prisma.zone.findMany({
    include: {
      properties: {
        where: propertyWhere,
        include: { photos: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  let filterLabel = ''
  if (zoneFilter) {
    const zone = zones.find(z => z.id === zoneFilter)
    if (zone) filterLabel = zone.name
  }
  if (typeFilter) {
    filterLabel += (filterLabel ? ' - ' : '') + typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1) + 's'
  }

  const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  const pdf = new PDF()

  drawCoverPage(pdf, zones, filterLabel, dateStr)

  const zonesWithProps = zones.filter(z => z.properties.length > 0)
  for (const zone of zonesWithProps) {
    for (const property of zone.properties) {
      pdf.newPage()
      await drawPropertyPage(pdf, property, zone.name, dateStr)
    }
  }

  const pdfBuffer = pdf.build()
  const zoneName = filterLabel || (zonesWithProps.length <= 2 ? zonesWithProps.map(z => z.name).join(' y ') : 'Todos los Inmuebles')
  const filename = `Disponibilidad de Renta (${zoneName}).pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
