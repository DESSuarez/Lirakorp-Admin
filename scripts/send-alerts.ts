import { PrismaClient } from '@prisma/client'
import { addDays } from 'date-fns'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function sendWhatsApp(to: string, message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!sid || !token || !from) return

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: `whatsapp:${to}`, Body: message }).toString(),
  })
}

async function main() {
  console.log('Verificando contratos y generando alertas...')
  const now = new Date()
  const in15Days = addDays(now, 15)
  const in30Days = addDays(now, 30)

  // Contracts expiring within 15 days
  const expiringContracts = await prisma.contract.findMany({
    where: { status: 'active', endDate: { lte: in15Days, gte: now } },
    include: { property: true },
  })

  for (const contract of expiringContracts) {
    const existing = await prisma.alert.findFirst({
      where: { contractId: contract.id, type: 'contract_expiry', status: 'pending' },
    })

    if (!existing) {
      await prisma.alert.create({
        data: {
          type: 'contract_expiry',
          title: `Contrato por vencer: ${contract.property.name}`,
          message: `El contrato de ${contract.tenantName} vence el ${contract.endDate.toLocaleDateString('es-MX')}. Renta: $${contract.monthlyRent.toLocaleString('es-MX')}/mes.`,
          dueDate: contract.endDate,
          contractId: contract.id,
        },
      })

      // Send email
      if (contract.tenantEmail && process.env.SMTP_USER) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: contract.tenantEmail,
            subject: `Renovación de contrato - ${contract.property.name}`,
            html: `
              <h2>Estimado(a) ${contract.tenantName},</h2>
              <p>Le recordamos que su contrato de arrendamiento para <strong>${contract.property.name}</strong> vence el <strong>${contract.endDate.toLocaleDateString('es-MX')}</strong>.</p>
              <p>¿Le interesaría renovar su contrato? Por favor contáctenos para discutir los términos de renovación.</p>
              <p>Saludos cordiales,<br/>Administración de Propiedades</p>
            `,
          })
          console.log(`Email enviado a ${contract.tenantEmail}`)
        } catch (err) {
          console.error(`Error enviando email a ${contract.tenantEmail}:`, err)
        }
      }

      // Send WhatsApp
      if (contract.tenantWhatsapp) {
        try {
          await sendWhatsApp(
            contract.tenantWhatsapp,
            `Hola ${contract.tenantName}, le recordamos que su contrato para ${contract.property.name} vence el ${contract.endDate.toLocaleDateString('es-MX')}. ¿Estaría interesado(a) en renovar? Contáctenos para más información.`
          )
          console.log(`WhatsApp enviado a ${contract.tenantWhatsapp}`)
        } catch (err) {
          console.error(`Error enviando WhatsApp a ${contract.tenantWhatsapp}:`, err)
        }
      }
    }
  }

  // Rent reviews within 15 days
  const reviewContracts = await prisma.contract.findMany({
    where: { status: 'active', reviewDate: { lte: in15Days, gte: now } },
    include: { property: true },
  })

  for (const contract of reviewContracts) {
    const existing = await prisma.alert.findFirst({
      where: { contractId: contract.id, type: 'rent_review', status: 'pending' },
    })

    if (!existing) {
      await prisma.alert.create({
        data: {
          type: 'rent_review',
          title: `Revisión de renta: ${contract.property.name}`,
          message: `Revisión de incremento (${contract.annualIncrement || 0}%) para ${contract.property.name}. Renta actual: $${contract.monthlyRent.toLocaleString('es-MX')}/mes.`,
          dueDate: contract.reviewDate!,
          contractId: contract.id,
        },
      })
    }
  }

  // Renewal contacts within 30 days
  const renewalContracts = await prisma.contract.findMany({
    where: { status: 'active', endDate: { lte: in30Days, gte: now } },
    include: { property: true },
  })

  for (const contract of renewalContracts) {
    const existing = await prisma.alert.findFirst({
      where: { contractId: contract.id, type: 'renewal_contact', status: 'pending' },
    })

    if (!existing) {
      await prisma.alert.create({
        data: {
          type: 'renewal_contact',
          title: `Contactar para renovación: ${contract.property.name}`,
          message: `Contactar a ${contract.tenantName} (${contract.tenantPhone || contract.tenantEmail || 'sin contacto'}) para renovación de ${contract.property.name}.`,
          dueDate: addDays(contract.endDate, -30),
          contractId: contract.id,
        },
      })
    }
  }

  // Update expired contracts
  await prisma.contract.updateMany({
    where: { status: 'active', endDate: { lt: now } },
    data: { status: 'expired' },
  })

  console.log('Verificación completada.')
  console.log(`- Contratos por vencer (15 días): ${expiringContracts.length}`)
  console.log(`- Revisiones de renta: ${reviewContracts.length}`)
  console.log(`- Contactos de renovación: ${renewalContracts.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
