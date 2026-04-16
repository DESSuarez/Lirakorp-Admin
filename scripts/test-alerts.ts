import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function sendEmail(to: string, subject: string, html: string) {
  const testOverride = process.env.TEST_EMAIL_OVERRIDE
  const actualTo = testOverride || to
  const actualSubject = testOverride ? `[TEST → ${to}] ${subject}` : subject

  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: actualTo,
    subject: actualSubject,
    html,
  })
}

function daysUntil(date: Date): number {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Import email templates inline
function buildAdminRenewalContactEmail(data: { tenantName: string; propertyName: string; endDate: string; daysLeft: number; tenantEmail?: string; tenantPhone?: string }) {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 20px;">LIRAKORP - Alerta de Renovación</h1>
    </div>
    <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
      <h2 style="color: #d97706;">Contactar inquilino para renovación</h2>
      <div style="background: #fef3c7; border-left: 4px solid #d97706; padding: 12px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold;">Faltan ${data.daysLeft} día(s) para el vencimiento del contrato</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #6b7280;">Inquilino:</td><td style="padding: 8px 0; font-weight: bold;">${data.tenantName}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Propiedad:</td><td style="padding: 8px 0; font-weight: bold;">${data.propertyName}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Vencimiento:</td><td style="padding: 8px 0; font-weight: bold;">${data.endDate}</td></tr>
        ${data.tenantEmail ? `<tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;">${data.tenantEmail}</td></tr>` : ''}
        ${data.tenantPhone ? `<tr><td style="padding: 8px 0; color: #6b7280;">Teléfono:</td><td style="padding: 8px 0;">${data.tenantPhone}</td></tr>` : ''}
      </table>
      <p>Es necesario contactar al inquilino para conocer su intención de renovación.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #6b7280; font-size: 12px;">Mensaje automático - LIRAKORP</p>
    </div>
  </div>`
}

function buildAdminExpiryEmail(data: { tenantName: string; propertyName: string; endDate: string; daysLeft: number }) {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 20px;">LIRAKORP - Vencimiento de Contrato</h1>
    </div>
    <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
      <h2 style="color: #dc2626;">Vencimiento de contrato inminente</h2>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #dc2626;">FALTAN ${data.daysLeft} DÍA(S)</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #6b7280;">Inquilino:</td><td style="padding: 8px 0; font-weight: bold;">${data.tenantName}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Propiedad:</td><td style="padding: 8px 0; font-weight: bold;">${data.propertyName}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Fecha de vencimiento:</td><td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${data.endDate}</td></tr>
      </table>
      <p>El contrato está próximo a vencer. Asegúrese de tener el nuevo contrato listo o confirmar la no renovación.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #6b7280; font-size: 12px;">Mensaje automático - LIRAKORP</p>
    </div>
  </div>`
}

function buildTenantRenewalEmail(data: { tenantName: string; propertyName: string; endDate: string; daysLeft: number; renewalUrl: string }) {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 20px;">LIRAKORP - Aviso de Renovación</h1>
    </div>
    <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
      <p>Estimado/a <strong>${data.tenantName}</strong>,</p>
      <p>Se acerca la fecha de renovación de su contrato de arrendamiento. El administrador del inmueble se pondrá en contacto con usted.</p>
      <div style="background: #eff6ff; border-left: 4px solid #1e40af; padding: 12px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>Propiedad:</strong> ${data.propertyName}</p>
        <p style="margin: 8px 0 0 0;"><strong>Fecha de vencimiento:</strong> ${data.endDate}</p>
        <p style="margin: 8px 0 0 0;"><strong>Días restantes:</strong> ${data.daysLeft}</p>
      </div>
      <p>Por favor indíquenos su decisión:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.renewalUrl}?response=wants_renewal" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 8px;">Quiero renovar contrato</a>
      </div>
      <div style="text-align: center; margin: 8px 0 24px 0;">
        <a href="${data.renewalUrl}?response=no_renewal" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 8px;">No quiero renovar contrato</a>
      </div>
      <p style="color: #6b7280; font-size: 13px;">También puede acceder directamente al siguiente enlace:</p>
      <p style="color: #1e40af; font-size: 13px; word-break: break-all;">${data.renewalUrl}</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #6b7280; font-size: 12px;">Mensaje automático - LIRAKORP Administración de Propiedades</p>
    </div>
  </div>`
}

async function main() {
  const adminEmail = 'celsosuarez@lirakorp.com'
  const appUrl = 'https://admin.lirakorp.com'

  console.log('=== TEST DE ALERTAS POR CORREO ===')
  console.log(`TEST_EMAIL_OVERRIDE: ${process.env.TEST_EMAIL_OVERRIDE || '(no configurado)'}`)
  console.log(`Todos los correos irán a: ${process.env.TEST_EMAIL_OVERRIDE || 'DESTINATARIOS REALES'}`)
  console.log('')

  const activeContracts = await prisma.contract.findMany({
    where: { status: 'active' },
    include: { property: { include: { zone: true } } },
  })

  console.log(`Contratos activos: ${activeContracts.length}`)

  let emailsSent = 0
  let alertsCreated = 0

  for (const contract of activeContracts) {
    if (!contract.endDate) continue

    const daysLeft = daysUntil(contract.endDate)
    const propertyName = contract.property?.name || 'Propiedad'
    const tenantName = contract.tenantName || 'Inquilino'
    const endDateStr = contract.endDate.toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    // Solo procesar contratos que venzan en los próximos 30 días
    if (daysLeft <= 0 || daysLeft > 30) continue

    console.log(`\n--- ${propertyName} | ${tenantName} | Vence en ${daysLeft} días (${endDateStr}) ---`)

    // ADMIN: Contactar inquilino (30 días)
    const exists30Admin = await prisma.alert.findFirst({
      where: { contractId: contract.id, recipientType: 'admin', triggerDaysBefore: 30, type: 'renewal_contact', status: { not: 'dismissed' } },
    })

    if (!exists30Admin) {
      await prisma.alert.create({
        data: {
          type: 'renewal_contact', recipientType: 'admin', triggerDaysBefore: 30,
          title: `Contactar inquilino para renovación - ${propertyName}`,
          message: `Contactar a ${tenantName} sobre la renovación del contrato en ${propertyName}. Vence en ${daysLeft} día(s), el ${endDateStr}.`,
          dueDate: new Date(contract.endDate.getTime() - 30 * 24 * 60 * 60 * 1000),
          contractId: contract.id,
        },
      })
      alertsCreated++

      try {
        const html = buildAdminRenewalContactEmail({ tenantName, propertyName, endDate: endDateStr, daysLeft, tenantEmail: contract.tenantEmail || undefined, tenantPhone: contract.tenantPhone || undefined })
        await sendEmail(adminEmail, `Contactar inquilino - ${propertyName}`, html)
        emailsSent++
        console.log(`  ✅ EMAIL ADMIN: Contactar inquilino → ${process.env.TEST_EMAIL_OVERRIDE || adminEmail}`)
      } catch (e: any) {
        console.log(`  ❌ ERROR email admin:`, e.message)
      }
    } else {
      console.log(`  ⏭️  Alerta admin 30d ya existe`)
    }

    // INQUILINO: Renovación con botones (30 días)
    const exists30Tenant = await prisma.alert.findFirst({
      where: { contractId: contract.id, recipientType: 'tenant', triggerDaysBefore: 30, type: 'contract_expiry', status: { not: 'dismissed' } },
    })

    if (!exists30Tenant && contract.tenantEmail && contract.renewalToken) {
      await prisma.alert.create({
        data: {
          type: 'contract_expiry', recipientType: 'tenant', triggerDaysBefore: 30,
          title: `Renovación próxima - ${propertyName}`,
          message: `${tenantName}, su contrato en ${propertyName} vence el ${endDateStr}. Por favor indique si desea renovar.`,
          dueDate: new Date(contract.endDate.getTime() - 30 * 24 * 60 * 60 * 1000),
          contractId: contract.id,
        },
      })
      alertsCreated++

      try {
        const renewalUrl = `${appUrl}/renewal/${contract.renewalToken}`
        const html = buildTenantRenewalEmail({ tenantName, propertyName, endDate: endDateStr, daysLeft, renewalUrl })
        await sendEmail(contract.tenantEmail, `Renovación de contrato - ${propertyName}`, html)
        emailsSent++
        console.log(`  ✅ EMAIL INQUILINO: Renovación con botones → ${process.env.TEST_EMAIL_OVERRIDE || contract.tenantEmail}`)
      } catch (e: any) {
        console.log(`  ❌ ERROR email inquilino:`, e.message)
      }
    } else if (!contract.tenantEmail) {
      console.log(`  ⚠️  Inquilino sin email registrado`)
    } else if (exists30Tenant) {
      console.log(`  ⏭️  Alerta inquilino 30d ya existe`)
    }

    // ADMIN: Vencimiento (7 días)
    if (daysLeft <= 7) {
      const exists7Admin = await prisma.alert.findFirst({
        where: { contractId: contract.id, recipientType: 'admin', triggerDaysBefore: 7, type: 'contract_expiry', status: { not: 'dismissed' } },
      })

      if (!exists7Admin) {
        await prisma.alert.create({
          data: {
            type: 'contract_expiry', recipientType: 'admin', triggerDaysBefore: 7,
            title: `Vencimiento de contrato - ${propertyName}`,
            message: `El contrato de ${tenantName} en ${propertyName} vence en ${daysLeft} día(s), el ${endDateStr}.`,
            dueDate: new Date(contract.endDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            contractId: contract.id,
          },
        })
        alertsCreated++

        try {
          const html = buildAdminExpiryEmail({ tenantName, propertyName, endDate: endDateStr, daysLeft })
          await sendEmail(adminEmail, `URGENTE: Vencimiento de contrato - ${propertyName}`, html)
          emailsSent++
          console.log(`  ✅ EMAIL ADMIN: Vencimiento urgente → ${process.env.TEST_EMAIL_OVERRIDE || adminEmail}`)
        } catch (e: any) {
          console.log(`  ❌ ERROR email admin 7d:`, e.message)
        }
      } else {
        console.log(`  ⏭️  Alerta admin 7d ya existe`)
      }

      // INQUILINO: Recordatorio 7 días
      if (!contract.renewalResponse) {
        const exists7Tenant = await prisma.alert.findFirst({
          where: { contractId: contract.id, recipientType: 'tenant', triggerDaysBefore: 7, type: 'contract_expiry', status: { not: 'dismissed' } },
        })

        if (!exists7Tenant && contract.tenantEmail && contract.renewalToken) {
          await prisma.alert.create({
            data: {
              type: 'contract_expiry', recipientType: 'tenant', triggerDaysBefore: 7,
              title: `URGENTE: Renovación en ${daysLeft} días - ${propertyName}`,
              message: `${tenantName}, su contrato en ${propertyName} vence en ${daysLeft} día(s). Por favor indique su decisión.`,
              dueDate: new Date(contract.endDate.getTime() - 7 * 24 * 60 * 60 * 1000),
              contractId: contract.id,
            },
          })
          alertsCreated++

          try {
            const renewalUrl = `${appUrl}/renewal/${contract.renewalToken}`
            const html = buildTenantRenewalEmail({ tenantName, propertyName, endDate: endDateStr, daysLeft, renewalUrl })
            await sendEmail(contract.tenantEmail, `URGENTE: Renovación de contrato - ${propertyName}`, html)
            emailsSent++
            console.log(`  ✅ EMAIL INQUILINO: Urgente 7d → ${process.env.TEST_EMAIL_OVERRIDE || contract.tenantEmail}`)
          } catch (e: any) {
            console.log(`  ❌ ERROR email inquilino 7d:`, e.message)
          }
        }
      }
    }
  }

  console.log('\n=== RESUMEN ===')
  console.log(`Contratos revisados: ${activeContracts.length}`)
  console.log(`Alertas creadas: ${alertsCreated}`)
  console.log(`Correos enviados: ${emailsSent}`)
  console.log(`Destino real: ${process.env.TEST_EMAIL_OVERRIDE || 'DESTINATARIOS REALES'}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
