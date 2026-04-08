import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, buildAlertEmail } from '@/lib/email';
import { sendWhatsApp } from '@/lib/whatsapp';
import { daysUntil } from '@/lib/utils';

interface AlertToCreate {
  type: string;
  title: string;
  message: string;
  dueDate: Date;
  contractId: string;
  propertyId: string | null;
  tenantPhone?: string | null;
  tenantEmail?: string | null;
  tenantName?: string | null;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const activeContracts = await prisma.contract.findMany({
      where: {
        status: 'active',
      },
      include: {
        property: true,
      },
    });

    const alertsToCreate: AlertToCreate[] = [];
    const now = new Date();

    for (const contract of activeContracts) {
      const propertyName =
        contract.property?.name || contract.property?.address || 'Propiedad';
      const tenantName = contract.tenantName || 'Inquilino';

      // 15 days before contract end -> "contract_expiry" alert
      if (contract.endDate) {
        const daysToEnd = daysUntil(contract.endDate);
        if (daysToEnd > 0 && daysToEnd <= 15) {
          alertsToCreate.push({
            type: 'contract_expiry',
            title: `Contrato por vencer - ${propertyName}`,
            message: `El contrato de ${tenantName} en ${propertyName} vence en ${daysToEnd} día(s), el ${contract.endDate.toLocaleDateString('es-MX')}.`,
            dueDate: contract.endDate,
            contractId: contract.id,
            propertyId: contract.propertyId,
            tenantPhone: contract.tenantPhone,
            tenantEmail: contract.tenantEmail,
            tenantName,
          });
        }
      }

      // 15 days before review date -> "rent_review" alert
      if (contract.reviewDate) {
        const daysToReview = daysUntil(contract.reviewDate);
        if (daysToReview > 0 && daysToReview <= 15) {
          alertsToCreate.push({
            type: 'rent_review',
            title: `Revisión de renta - ${propertyName}`,
            message: `La revisión de renta de ${tenantName} en ${propertyName} es en ${daysToReview} día(s), el ${contract.reviewDate.toLocaleDateString('es-MX')}.`,
            dueDate: contract.reviewDate,
            contractId: contract.id,
            propertyId: contract.propertyId,
            tenantPhone: contract.tenantPhone,
            tenantEmail: contract.tenantEmail,
            tenantName,
          });
        }
      }

      // 30 days before contract end -> "renewal_contact" alert
      if (contract.endDate) {
        const daysToEnd = daysUntil(contract.endDate);
        if (daysToEnd > 15 && daysToEnd <= 30) {
          alertsToCreate.push({
            type: 'renewal_contact',
            title: `Contactar inquilino para renovación - ${propertyName}`,
            message: `Contactar a ${tenantName} sobre la renovación del contrato en ${propertyName}. El contrato vence en ${daysToEnd} día(s).`,
            dueDate: new Date(
              contract.endDate.getTime() - 30 * 24 * 60 * 60 * 1000
            ),
            contractId: contract.id,
            propertyId: contract.propertyId,
            tenantPhone: contract.tenantPhone,
            tenantEmail: contract.tenantEmail,
            tenantName,
          });
        }
      }
    }

    // Create alerts, avoiding duplicates
    let createdCount = 0;
    const urgentAlerts: AlertToCreate[] = [];

    for (const alertData of alertsToCreate) {
      // Check if a similar active alert already exists
      const existing = await prisma.alert.findFirst({
        where: {
          type: alertData.type,
          contractId: alertData.contractId,
          status: 'pending',
        },
      });

      if (!existing) {
        await prisma.alert.create({
          data: {
            type: alertData.type,
            title: alertData.title,
            message: alertData.message,
            dueDate: alertData.dueDate,
            status: 'pending',
            contractId: alertData.contractId,
          },
        });
        createdCount++;

        // Check if urgent (<=7 days) for notifications
        const daysLeft = daysUntil(alertData.dueDate);
        if (daysLeft <= 7) {
          urgentAlerts.push(alertData);
        }
      }
    }

    // Send notifications for urgent alerts (<=7 days)
    let emailsSent = 0;
    let whatsappSent = 0;

    for (const urgent of urgentAlerts) {
      // Send email notification
      try {
        const emailHtml = buildAlertEmail({
          title: urgent.title,
          message: urgent.message,
          dueDate: urgent.dueDate.toLocaleDateString('es-MX'),
        });

        if (urgent.tenantEmail) {
          await sendEmail(
            urgent.tenantEmail,
            `Alerta: ${urgent.title}`,
            emailHtml,
          );
          emailsSent++;
        }

        // Also send to admin/session user
        if (session.user?.email) {
          await sendEmail(
            session.user.email,
            `Alerta Urgente: ${urgent.title}`,
            emailHtml,
          );
          emailsSent++;
        }
      } catch (emailError) {
        console.error('Error al enviar email de alerta:', emailError);
      }

      // Send WhatsApp notification
      try {
        if (urgent.tenantPhone) {
          await sendWhatsApp(
            urgent.tenantPhone,
            `*${urgent.title}*\n\n${urgent.message}`,
          );
          whatsappSent++;
        }
      } catch (whatsappError) {
        console.error('Error al enviar WhatsApp de alerta:', whatsappError);
      }
    }

    return NextResponse.json({
      message: 'Verificación de alertas completada',
      contractsChecked: activeContracts.length,
      created: createdCount,
      urgent: urgentAlerts.length,
      emailsSent,
      whatsappSent,
    });
  } catch (error) {
    console.error('Error en verificación de alertas:', error);
    return NextResponse.json(
      { error: 'Error al verificar alertas' },
      { status: 500 }
    );
  }
}
