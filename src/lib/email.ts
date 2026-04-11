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

export async function sendEmail(to: string, subject: string, html: string, attachments?: { filename: string; path: string }[]) {
  const testOverride = process.env.TEST_EMAIL_OVERRIDE
  const actualTo = testOverride || to
  const actualSubject = testOverride ? `[TEST → ${to}] ${subject}` : subject

  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: actualTo,
    subject: actualSubject,
    html,
    attachments,
  })
}

// ─── Email para ADMINISTRADOR ───

export function buildAlertEmail(alert: {
  title: string
  message: string
  dueDate: string
  propertyName?: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">LIRAKORP - Administraci&oacute;n de Propiedades</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1e40af;">${alert.title}</h2>
        ${alert.propertyName ? `<p><strong>Propiedad:</strong> ${alert.propertyName}</p>` : ''}
        <p>${alert.message}</p>
        <p><strong>Fecha:</strong> ${alert.dueDate}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Este es un mensaje autom&aacute;tico del sistema de administraci&oacute;n LIRAKORP.</p>
      </div>
    </div>
  `
}

// ─── Alertas ADMIN: contactar inquilino (30 días) ───

export function buildAdminRenewalContactEmail(data: {
  tenantName: string
  propertyName: string
  endDate: string
  daysLeft: number
  tenantEmail?: string
  tenantPhone?: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">LIRAKORP - Alerta de Renovaci&oacute;n</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #d97706;">Contactar inquilino para renovaci&oacute;n</h2>
        <div style="background: #fef3c7; border-left: 4px solid #d97706; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold;">Faltan ${data.daysLeft} d&iacute;a(s) para el vencimiento del contrato</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Inquilino:</td><td style="padding: 8px 0; font-weight: bold;">${data.tenantName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Propiedad:</td><td style="padding: 8px 0; font-weight: bold;">${data.propertyName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Vencimiento:</td><td style="padding: 8px 0; font-weight: bold;">${data.endDate}</td></tr>
          ${data.tenantEmail ? `<tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;">${data.tenantEmail}</td></tr>` : ''}
          ${data.tenantPhone ? `<tr><td style="padding: 8px 0; color: #6b7280;">Tel&eacute;fono:</td><td style="padding: 8px 0;">${data.tenantPhone}</td></tr>` : ''}
        </table>
        <p>Es necesario contactar al inquilino para conocer su intenci&oacute;n de renovaci&oacute;n.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Mensaje autom&aacute;tico - LIRAKORP</p>
      </div>
    </div>
  `
}

// ─── Alertas ADMIN: vencimiento de contrato (7 días) ───

export function buildAdminExpiryEmail(data: {
  tenantName: string
  propertyName: string
  endDate: string
  daysLeft: number
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">LIRAKORP - Vencimiento de Contrato</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #dc2626;">Vencimiento de contrato inminente</h2>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold; color: #dc2626;">FALTAN ${data.daysLeft} D&Iacute;A(S)</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Inquilino:</td><td style="padding: 8px 0; font-weight: bold;">${data.tenantName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Propiedad:</td><td style="padding: 8px 0; font-weight: bold;">${data.propertyName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Fecha de vencimiento:</td><td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${data.endDate}</td></tr>
        </table>
        <p>El contrato est&aacute; pr&oacute;ximo a vencer. Aseg&uacute;rese de tener el nuevo contrato listo o confirmar la no renovaci&oacute;n.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Mensaje autom&aacute;tico - LIRAKORP</p>
      </div>
    </div>
  `
}

// ─── Alertas ADMIN: contrato firmado subido ───

export function buildAdminContractUploadedEmail(data: {
  tenantName: string
  propertyName: string
  fileName: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">LIRAKORP - Contrato Subido</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #059669;">Contrato firmado subido a la plataforma</h2>
        <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0;">El contrato firmado ha sido cargado exitosamente.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Inquilino:</td><td style="padding: 8px 0; font-weight: bold;">${data.tenantName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Propiedad:</td><td style="padding: 8px 0; font-weight: bold;">${data.propertyName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Archivo:</td><td style="padding: 8px 0;">${data.fileName}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Mensaje autom&aacute;tico - LIRAKORP</p>
      </div>
    </div>
  `
}

// ─── Email para INQUILINO: renovación con botones (30 y 7 días) ───

export function buildTenantRenewalEmail(data: {
  tenantName: string
  propertyName: string
  endDate: string
  daysLeft: number
  renewalUrl: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">LIRAKORP - Aviso de Renovaci&oacute;n</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Estimado/a <strong>${data.tenantName}</strong>,</p>
        <p>Se acerca la fecha de renovaci&oacute;n de su contrato de arrendamiento. El administrador del inmueble se pondr&aacute; en contacto con usted.</p>
        <div style="background: #eff6ff; border-left: 4px solid #1e40af; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>Propiedad:</strong> ${data.propertyName}</p>
          <p style="margin: 8px 0 0 0;"><strong>Fecha de vencimiento:</strong> ${data.endDate}</p>
          <p style="margin: 8px 0 0 0;"><strong>D&iacute;as restantes:</strong> ${data.daysLeft}</p>
        </div>
        <p>Por favor ind&iacute;quenos su decisi&oacute;n:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.renewalUrl}?response=wants_renewal" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 8px;">Quiero renovar contrato</a>
        </div>
        <div style="text-align: center; margin: 8px 0 24px 0;">
          <a href="${data.renewalUrl}?response=no_renewal" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 8px;">No quiero renovar contrato</a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">Tambi&eacute;n puede acceder directamente al siguiente enlace para indicar su decisi&oacute;n:</p>
        <p style="color: #1e40af; font-size: 13px; word-break: break-all;">${data.renewalUrl}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Mensaje autom&aacute;tico - LIRAKORP Administraci&oacute;n de Propiedades</p>
      </div>
    </div>
  `
}

// ─── Email para INQUILINO: contrato renovado + copia firmada ───

export function buildTenantContractRenewedEmail(data: {
  tenantName: string
  propertyName: string
  startDate: string
  endDate: string
  fileName?: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">LIRAKORP - Contrato Renovado</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Estimado/a <strong>${data.tenantName}</strong>,</p>
        <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <h2 style="margin: 0 0 8px 0; color: #059669;">Contrato renovado exitosamente</h2>
          <p style="margin: 0;">Muchas gracias por renovar con nosotros.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Propiedad:</td><td style="padding: 8px 0; font-weight: bold;">${data.propertyName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Vigencia:</td><td style="padding: 8px 0; font-weight: bold;">${data.startDate} - ${data.endDate}</td></tr>
        </table>
        ${data.fileName ? `<p>Se adjunta una copia de su contrato firmado (<strong>${data.fileName}</strong>).</p>` : '<p>El contrato firmado ser&aacute; enviado pr&oacute;ximamente.</p>'}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Mensaje autom&aacute;tico - LIRAKORP Administraci&oacute;n de Propiedades</p>
      </div>
    </div>
  `
}
