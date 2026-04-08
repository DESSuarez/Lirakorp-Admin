import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  TabStopPosition,
  TabStopType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
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

    // Buscar plantilla en BD
    let templateText: string | null = null;
    try {
      const template = await prisma.contractTemplate.findFirst({
        where: { isActive: true },
      });
      templateText = template?.content || null;
    } catch {
      // Si no existe el modelo, usar plantilla por defecto
    }

    const noBorder = {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
    };

    let paragraphs: Paragraph[];

    if (templateText) {
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

      paragraphs = processedText.split('\n').map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line, size: 24, font: 'Arial' })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 },
          })
      );
    } else {
      const clauseNumber = { current: 1 };

      const makeClause = (title: string, text: string): Paragraph => {
        const num = clauseNumber.current++;
        const ordinals = ['', 'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA'];
        const ordinal = ordinals[num] || `CLÁUSULA ${num}`;

        return new Paragraph({
          children: [
            new TextRun({ text: `${ordinal}. ${title}. `, bold: true, size: 22, font: 'Arial' }),
            new TextRun({ text, size: 22, font: 'Arial' }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
        });
      }

      paragraphs = [
        new Paragraph({
          children: [
            new TextRun({
              text: 'CONTRATO DE ARRENDAMIENTO',
              bold: true,
              size: 32,
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          heading: HeadingLevel.TITLE,
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `En la ciudad de México, a ${formatDate(new Date())}, celebran el presente contrato de arrendamiento, por una parte como ARRENDADOR (en lo sucesivo "EL ARRENDADOR") y por la otra parte:`,
              size: 22,
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: `ARRENDATARIO: ${contract.tenantName}`, bold: true, size: 22, font: 'Arial' }),
          ],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Correo electrónico: ${contract.tenantEmail}`, size: 22, font: 'Arial' }),
          ],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Teléfono: ${contract.tenantPhone || 'N/A'}`, size: 22, font: 'Arial' }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: '(en lo sucesivo "EL ARRENDATARIO"), conforme a las siguientes:',
              size: 22,
              font: 'Arial',
            }),
          ],
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [new TextRun({ text: 'DECLARACIONES', bold: true, size: 28, font: 'Arial' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: 'I. Declara EL ARRENDADOR ser legítimo propietario del inmueble objeto de este contrato.',
              size: 22,
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `II. Que el inmueble objeto de este contrato se ubica en: ${contract.property.address}${contract.property.zone ? `, Zona: ${contract.property.zone.name}` : ''}.`,
              size: 22,
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `III. Que el inmueble se identifica como: ${contract.property.name}.`,
              size: 22,
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [new TextRun({ text: 'CLÁUSULAS', bold: true, size: 28, font: 'Arial' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          heading: HeadingLevel.HEADING_1,
        }),

        makeClause(
          'OBJETO',
          'EL ARRENDADOR concede en arrendamiento a EL ARRENDATARIO el inmueble descrito en las declaraciones del presente contrato, para uso habitacional o comercial según corresponda.'
        ),

        makeClause(
          'VIGENCIA',
          `El presente contrato tendrá una vigencia que comenzará el ${formatDate(contract.startDate)} y concluirá el ${formatDate(contract.endDate)}.`
        ),

        makeClause(
          'RENTA',
          `EL ARRENDATARIO se obliga a pagar como renta mensual la cantidad de ${formatCurrency(contract.monthlyRent)} (pesos mexicanos), pagadera por adelantado dentro de los primeros cinco días de cada mes.`
        ),

        makeClause(
          'INCREMENTO ANUAL',
          `Las partes acuerdan que la renta se incrementará anualmente en un ${contract.annualIncrement}% sobre el monto de la renta vigente.`
        ),

        makeClause(
          'DEPÓSITO EN GARANTÍA',
          `EL ARRENDATARIO entrega en este acto la cantidad de ${formatCurrency(contract.depositAmount)} (pesos mexicanos) como depósito en garantía, el cual será devuelto al término del contrato, previa verificación del estado del inmueble.`
        ),

        makeClause(
          'OBLIGACIONES DEL ARRENDATARIO',
          'EL ARRENDATARIO se obliga a: a) Pagar puntualmente la renta; b) Conservar el inmueble en buen estado; c) No subarrendar total ni parcialmente el inmueble; d) Permitir las visitas de inspección por parte del ARRENDADOR previo aviso.'
        ),

        makeClause(
          'OBLIGACIONES DEL ARRENDADOR',
          'EL ARRENDADOR se obliga a: a) Entregar el inmueble en condiciones óptimas de uso; b) Realizar las reparaciones mayores necesarias; c) Respetar el uso pacífico del inmueble por parte del ARRENDATARIO.'
        ),
      ];

      if (contract.reviewDate) {
        paragraphs.push(
          makeClause(
            'REVISIÓN',
            `Las partes acuerdan realizar una revisión de las condiciones del presente contrato el día ${formatDate(contract.reviewDate)}.`
          )
        );
      }

      paragraphs.push(
        makeClause(
          'JURISDICCIÓN',
          'Para la interpretación y cumplimiento de este contrato, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que por razón de su domicilio presente o futuro pudiera corresponderles.'
        )
      );

      if (contract.notes) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'OBSERVACIONES: ', bold: true, size: 22, font: 'Arial' }),
              new TextRun({ text: contract.notes, size: 22, font: 'Arial' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 200, after: 300 },
          })
        );
      }

      // Firmas
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Leído que fue el presente contrato, las partes lo firman de conformidad.',
              size: 22,
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 600 },
        }),

        new Paragraph({
          children: [],
          spacing: { after: 200 },
        }),

        // Tabla de firmas
        new Paragraph({ children: [] }), // espaciador
      );

      paragraphs.push(
        new Paragraph({ children: [], spacing: { after: 400 } }),
      );

      // Firma del arrendador
      const signatureTable = new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: '_______________________________', size: 22, font: 'Arial' })],
                    alignment: AlignmentType.CENTER,
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'EL ARRENDADOR', bold: true, size: 22, font: 'Arial' })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: noBorder,
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: '_______________________________', size: 22, font: 'Arial' })],
                    alignment: AlignmentType.CENTER,
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'EL ARRENDATARIO', bold: true, size: 22, font: 'Arial' })],
                    alignment: AlignmentType.CENTER,
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: contract.tenantName, size: 22, font: 'Arial' })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: noBorder,
              }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      });

      // Replace last empty paragraph with table
      paragraphs.pop();
      paragraphs.push(new Paragraph({ children: [] })); // We'll add table separately

      // Build final children array including the table
      const docChildren: (Paragraph | Table)[] = [...paragraphs, signatureTable];

      const docWithTable = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440,
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
            children: docChildren,
          },
        ],
      });

      const buffer = await Packer.toBuffer(docWithTable);
      const filename = `contrato_${contract.property.name.replace(/\s+/g, '_')}_${contract.tenantName.replace(/\s+/g, '_')}.docx`;

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // If using template text, build simple document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: paragraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `contrato_${contract.property.name.replace(/\s+/g, '_')}_${contract.tenantName.replace(/\s+/g, '_')}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error al generar DOCX:', error);
    return NextResponse.json(
      { error: 'Error al generar el documento Word' },
      { status: 500 }
    );
  }
}
