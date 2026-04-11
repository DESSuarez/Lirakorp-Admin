import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  sendEmail,
  buildAdminRenewalContactEmail,
  buildAdminExpiryEmail,
} from '@/lib/email';
import { daysUntil } from '@/lib/utils';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const activeContracts = await prisma.contract.findMany({
      where: { status: 'active' },
      include: { property: { include: { zone: true } } },
    });

    const adminEmail = session.user?.email;
    let createdCount = 0;
    let emailsSent = 0;

    for (const contract of activeContracts) {
      if (!contract.endDate) continue;

      const daysLeft = daysUntil(contract.endDate);
      const propertyName = contract.property?.name || 'Propiedad';
      const tenantName = contract.tenantName || 'Inquilino';
      const endDateStr = contract.endDate.toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric',
      });

      // ═══════════════════════════════════════════
      // ALERTA 30 DÍAS - ADMIN: Contactar inquilino
      // ═══════════════════════════════════════════
      if (daysLeft > 0 && daysLeft <= 30) {
        const exists30Admin = await prisma.alert.findFirst({
          where: {
            contractId: contract.id,
            recipientType: 'admin',
            triggerDaysBefore: 30,
            type: 'renewal_contact',
            status: { not: 'dismissed' },
          },
        });

        if (!exists30Admin) {
          await prisma.alert.create({
            data: {
              type: 'renewal_contact',
              recipientType: 'admin',
              triggerDaysBefore: 30,
              title: `Contactar inquilino para renovación - ${propertyName}`,
              message: `Contactar a ${tenantName} sobre la renovación del contrato en ${propertyName}. El contrato vence en ${daysLeft} día(s), el ${endDateStr}.`,
              dueDate: new Date(contract.endDate.getTime() - 30 * 24 * 60 * 60 * 1000),
              contractId: contract.id,
            },
          });
          createdCount++;

          // Enviar email al admin
          if (adminEmail) {
            try {
              const html = buildAdminRenewalContactEmail({
                tenantName,
                propertyName,
                endDate: endDateStr,
                daysLeft,
                tenantEmail: contract.tenantEmail || undefined,
                tenantPhone: contract.tenantPhone || undefined,
              });
              await sendEmail(adminEmail, `Contactar inquilino - ${propertyName}`, html);
              emailsSent++;
            } catch (e) {
              console.error('Error enviando email admin 30d:', e);
            }
          }
        }
      }

      // ═══════════════════════════════════════════
      // ALERTA 7 DÍAS - ADMIN: Vencimiento de contrato
      // ═══════════════════════════════════════════
      if (daysLeft > 0 && daysLeft <= 7) {
        const exists7Admin = await prisma.alert.findFirst({
          where: {
            contractId: contract.id,
            recipientType: 'admin',
            triggerDaysBefore: 7,
            type: 'contract_expiry',
            status: { not: 'dismissed' },
          },
        });

        if (!exists7Admin) {
          await prisma.alert.create({
            data: {
              type: 'contract_expiry',
              recipientType: 'admin',
              triggerDaysBefore: 7,
              title: `Vencimiento de contrato - ${propertyName}`,
              message: `El contrato de ${tenantName} en ${propertyName} vence en ${daysLeft} día(s), el ${endDateStr}.`,
              dueDate: new Date(contract.endDate.getTime() - 7 * 24 * 60 * 60 * 1000),
              contractId: contract.id,
            },
          });
          createdCount++;

          // Enviar email al admin
          if (adminEmail) {
            try {
              const html = buildAdminExpiryEmail({
                tenantName,
                propertyName,
                endDate: endDateStr,
                daysLeft,
              });
              await sendEmail(adminEmail, `URGENTE: Vencimiento de contrato - ${propertyName}`, html);
              emailsSent++;
            } catch (e) {
              console.error('Error enviando email admin 7d:', e);
            }
          }
        }
      }

    }

    return NextResponse.json({
      message: 'Verificación de alertas completada',
      contractsChecked: activeContracts.length,
      alertsCreated: createdCount,
      emailsSent,
    });
  } catch (error) {
    console.error('Error en verificación de alertas:', error);
    return NextResponse.json(
      { error: 'Error al verificar alertas' },
      { status: 500 },
    );
  }
}
