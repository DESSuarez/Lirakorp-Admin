import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, buildAlertEmail } from '@/lib/email';
import { sendWhatsApp } from '@/lib/whatsapp';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const results: { email?: boolean; whatsapp?: boolean } = {};

    // Enviar correo electrónico
    const emailSubject = `Renovación de Contrato - ${contract.property.name}`;
    const emailBody = buildAlertEmail({
      title: 'Aviso de Renovacion de Contrato',
      message: `Estimado/a ${contract.tenantName}, le informamos que su contrato de arrendamiento para la propiedad "${contract.property.name}" esta proximo a vencer. Le solicitamos que nos indique si esta interesado/a en renovar.`,
      dueDate: formatDate(contract.endDate),
      propertyName: contract.property.name,
    });

    try {
      if (!contract.tenantEmail) throw new Error('Sin correo')
      await sendEmail(contract.tenantEmail, emailSubject, emailBody);
      results.email = true;
    } catch (emailError) {
      console.error('Error al enviar correo de renovación:', emailError);
      results.email = false;
    }

    // Enviar WhatsApp si el número está disponible
    if (contract.tenantWhatsapp) {
      const whatsappMessage = [
        `Estimado/a ${contract.tenantName},`,
        '',
        `Le informamos que su contrato de arrendamiento para la propiedad "${contract.property.name}" está próximo a vencer el ${formatDate(contract.endDate)}.`,
        '',
        `Renta actual: ${formatCurrency(contract.monthlyRent)}`,
        '',
        '¿Está interesado/a en renovar el contrato? Por favor háganoslo saber para acordar las nuevas condiciones.',
        '',
        'Saludos cordiales.',
      ].join('\n');

      try {
        await sendWhatsApp(contract.tenantWhatsapp, whatsappMessage);
        results.whatsapp = true;
      } catch (whatsappError) {
        console.error('Error al enviar WhatsApp de renovación:', whatsappError);
        results.whatsapp = false;
      }
    }

    // Actualizar estado del contrato a pending_renewal
    await prisma.contract.update({
      where: { id },
      data: { status: 'pending_renewal' },
    });

    // Determinar mensaje de respuesta
    const messages: string[] = [];
    if (results.email === true) {
      messages.push('Correo electrónico enviado exitosamente');
    } else if (results.email === false) {
      messages.push('Error al enviar correo electrónico');
    }

    if (results.whatsapp === true) {
      messages.push('Mensaje de WhatsApp enviado exitosamente');
    } else if (results.whatsapp === false) {
      messages.push('Error al enviar mensaje de WhatsApp');
    } else if (!contract.tenantWhatsapp) {
      messages.push('No se envió WhatsApp (sin número registrado)');
    }

    const allSuccess =
      results.email === true && (results.whatsapp === true || !contract.tenantWhatsapp);

    return NextResponse.json(
      {
        success: allSuccess,
        message: messages.join('. '),
        details: results,
      },
      { status: allSuccess ? 200 : 207 }
    );
  } catch (error) {
    console.error('Error al enviar notificación de renovación:', error);
    return NextResponse.json(
      { error: 'Error al enviar la notificación de renovación' },
      { status: 500 }
    );
  }
}
