import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import PDFDocument from 'pdfkit';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        property: {
          include: { zone: true },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    // Buscar plantilla de contrato en BD
    let templateText: string | null = null;
    try {
      const template = await prisma.contractTemplate.findFirst({
        where: { isActive: true },
      });
      templateText = template?.content || null;
    } catch {
      // Si no existe el modelo ContractTemplate, usar plantilla por defecto
    }

    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    if (templateText) {
      // Reemplazar placeholders en la plantilla
      const replacements: Record<string, string> = {
        '{{TENANT_NAME}}': contract.tenantName,
        '{{TENANT_EMAIL}}': contract.tenantEmail || 'N/A',
        '{{TENANT_PHONE}}': contract.tenantPhone || 'N/A',
        '{{PROPERTY_NAME}}': contract.property.name,
        '{{PROPERTY_ADDRESS}}': contract.property.address || 'N/A',
        '{{ZONE}}': (contract.property as any).zone?.name || 'N/A',
        '{{START_DATE}}': formatDate(contract.startDate),
        '{{END_DATE}}': formatDate(contract.endDate),
        '{{MONTHLY_RENT}}': formatCurrency(contract.monthlyRent),
        '{{ANNUAL_INCREMENT}}': `${contract.annualIncrement || 0}%`,
        '{{DEPOSIT_AMOUNT}}': formatCurrency(contract.depositAmount || 0),
        '{{REVIEW_DATE}}': contract.reviewDate ? formatDate(contract.reviewDate) : 'N/A',
        '{{CURRENT_DATE}}': formatDate(new Date()),
        '{{NOTES}}': contract.notes || '',
      };

      let processedText = templateText;
      for (const [placeholder, value] of Object.entries(replacements)) {
        processedText = processedText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      }

      doc.fontSize(12).text(processedText, { align: 'justify' });
    } else {
      // Plantilla por defecto: formato de contrato mexicano
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('CONTRATO DE ARRENDAMIENTO', { align: 'center' })
        .moveDown(2);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          `En la ciudad de México, a ${formatDate(new Date())}, celebran el presente contrato de arrendamiento, por una parte como ARRENDADOR (en lo sucesivo "EL ARRENDADOR") y por la otra parte:`,
          { align: 'justify' }
        )
        .moveDown();

      doc
        .font('Helvetica-Bold')
        .text(`ARRENDATARIO: ${contract.tenantName}`, { align: 'left' })
        .font('Helvetica')
        .text(`Correo electrónico: ${contract.tenantEmail}`)
        .text(`Teléfono: ${contract.tenantPhone || 'N/A'}`)
        .moveDown();

      doc
        .text('(en lo sucesivo "EL ARRENDATARIO"), conforme a las siguientes:')
        .moveDown();

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DECLARACIONES', { align: 'center' })
        .moveDown()
        .fontSize(10)
        .font('Helvetica');

      doc
        .text(
          'I. Declara EL ARRENDADOR ser legítimo propietario del inmueble objeto de este contrato.',
          { align: 'justify' }
        )
        .moveDown(0.5);

      doc
        .text(
          `II. Que el inmueble objeto de este contrato se ubica en: ${contract.property.address}${contract.property.zone ? `, Zona: ${contract.property.zone.name}` : ''}.`,
          { align: 'justify' }
        )
        .moveDown(0.5);

      doc
        .text(
          `III. Que el inmueble se identifica como: ${contract.property.name}.`,
          { align: 'justify' }
        )
        .moveDown();

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('CLÁUSULAS', { align: 'center' })
        .moveDown()
        .fontSize(10)
        .font('Helvetica');

      doc
        .font('Helvetica-Bold')
        .text('PRIMERA. OBJETO. ', { continued: true })
        .font('Helvetica')
        .text(
          `EL ARRENDADOR concede en arrendamiento a EL ARRENDATARIO el inmueble descrito en las declaraciones del presente contrato, para uso habitacional o comercial según corresponda.`,
          { align: 'justify' }
        )
        .moveDown();

      doc
        .font('Helvetica-Bold')
        .text('SEGUNDA. VIGENCIA. ', { continued: true })
        .font('Helvetica')
        .text(
          `El presente contrato tendrá una vigencia que comenzará el ${formatDate(contract.startDate)} y concluirá el ${formatDate(contract.endDate)}.`,
          { align: 'justify' }
        )
        .moveDown();

      doc
        .font('Helvetica-Bold')
        .text('TERCERA. RENTA. ', { continued: true })
        .font('Helvetica')
        .text(
          `EL ARRENDATARIO se obliga a pagar como renta mensual la cantidad de ${formatCurrency(contract.monthlyRent)} (pesos mexicanos), pagadera por adelantado dentro de los primeros cinco días de cada mes.`,
          { align: 'justify' }
        )
        .moveDown();

      doc
        .font('Helvetica-Bold')
        .text('CUARTA. INCREMENTO ANUAL. ', { continued: true })
        .font('Helvetica')
        .text(
          `Las partes acuerdan que la renta se incrementará anualmente en un ${contract.annualIncrement}% sobre el monto de la renta vigente.`,
          { align: 'justify' }
        )
        .moveDown();

      doc
        .font('Helvetica-Bold')
        .text('QUINTA. DEPÓSITO EN GARANTÍA. ', { continued: true })
        .font('Helvetica')
        .text(
          `EL ARRENDATARIO entrega en este acto la cantidad de ${formatCurrency(contract.depositAmount)} (pesos mexicanos) como depósito en garantía, el cual será devuelto al término del contrato, previa verificación del estado del inmueble.`,
          { align: 'justify' }
        )
        .moveDown();

      doc
        .font('Helvetica-Bold')
        .text('SEXTA. OBLIGACIONES DEL ARRENDATARIO. ', { continued: true })
        .font('Helvetica')
        .text(
          'EL ARRENDATARIO se obliga a: a) Pagar puntualmente la renta; b) Conservar el inmueble en buen estado; c) No subarrendar total ni parcialmente el inmueble; d) Permitir las visitas de inspección por parte del ARRENDADOR previo aviso.',
          { align: 'justify' }
        )
        .moveDown();

      doc
        .font('Helvetica-Bold')
        .text('SÉPTIMA. OBLIGACIONES DEL ARRENDADOR. ', { continued: true })
        .font('Helvetica')
        .text(
          'EL ARRENDADOR se obliga a: a) Entregar el inmueble en condiciones óptimas de uso; b) Realizar las reparaciones mayores necesarias; c) Respetar el uso pacífico del inmueble por parte del ARRENDATARIO.',
          { align: 'justify' }
        )
        .moveDown();

      if (contract.reviewDate) {
        doc
          .font('Helvetica-Bold')
          .text('OCTAVA. REVISIÓN. ', { continued: true })
          .font('Helvetica')
          .text(
            `Las partes acuerdan realizar una revisión de las condiciones del presente contrato el día ${formatDate(contract.reviewDate)}.`,
            { align: 'justify' }
          )
          .moveDown();
      }

      doc
        .font('Helvetica-Bold')
        .text(`${contract.reviewDate ? 'NOVENA' : 'OCTAVA'}. JURISDICCIÓN. `, { continued: true })
        .font('Helvetica')
        .text(
          'Para la interpretación y cumplimiento de este contrato, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que por razón de su domicilio presente o futuro pudiera corresponderles.',
          { align: 'justify' }
        )
        .moveDown(2);

      if (contract.notes) {
        doc
          .font('Helvetica-Bold')
          .text('OBSERVACIONES:', { align: 'left' })
          .font('Helvetica')
          .text(contract.notes, { align: 'justify' })
          .moveDown(2);
      }

      // Firmas
      doc
        .text('Leído que fue el presente contrato, las partes lo firman de conformidad.', {
          align: 'center',
        })
        .moveDown(3);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = pageWidth / 2 - 20;

      const y = doc.y;

      doc
        .text('_______________________________', doc.page.margins.left, y, {
          width: colWidth,
          align: 'center',
        })
        .text('EL ARRENDADOR', doc.page.margins.left, y + 15, {
          width: colWidth,
          align: 'center',
        });

      doc
        .text('_______________________________', doc.page.margins.left + colWidth + 40, y, {
          width: colWidth,
          align: 'center',
        })
        .text('EL ARRENDATARIO', doc.page.margins.left + colWidth + 40, y + 15, {
          width: colWidth,
          align: 'center',
        })
        .text(contract.tenantName, doc.page.margins.left + colWidth + 40, y + 30, {
          width: colWidth,
          align: 'center',
        });
    }

    doc.end();
    const pdfBuffer = await pdfPromise;

    const filename = `contrato_${contract.property.name.replace(/\s+/g, '_')}_${contract.tenantName.replace(/\s+/g, '_')}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return NextResponse.json(
      { error: 'Error al generar el PDF' },
      { status: 500 }
    );
  }
}
