import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail(to: string, subject: string, html: string) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  })
}

export function buildAlertEmail(alert: {
  title: string
  message: string
  dueDate: string
  propertyName?: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Administración de Propiedades</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1e40af;">${alert.title}</h2>
        ${alert.propertyName ? `<p><strong>Propiedad:</strong> ${alert.propertyName}</p>` : ''}
        <p>${alert.message}</p>
        <p><strong>Fecha:</strong> ${alert.dueDate}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Este es un mensaje automático del sistema de administración de propiedades.</p>
      </div>
    </div>
  `
}
