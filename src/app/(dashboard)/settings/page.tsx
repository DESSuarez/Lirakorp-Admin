import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Configura el sistema de administración</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Configuración de Correo (SMTP)</h2>
        <div className="space-y-3 text-sm">
          <p className="text-gray-600">
            Para configurar el envío de correos, edita el archivo <code className="bg-gray-100 px-2 py-1 rounded">.env</code> con los datos de tu servidor SMTP.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs space-y-1">
            <p>SMTP_HOST=smtp.hostinger.com</p>
            <p>SMTP_PORT=465</p>
            <p>SMTP_USER=tu-correo@tudominio.com</p>
            <p>SMTP_PASS=tu-contraseña</p>
            <p>EMAIL_FROM=Administración &lt;tu-correo@tudominio.com&gt;</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Configuración de WhatsApp (Twilio)</h2>
        <div className="space-y-3 text-sm">
          <p className="text-gray-600">
            Para enviar mensajes de WhatsApp, necesitas una cuenta de Twilio. Configura las credenciales en el archivo <code className="bg-gray-100 px-2 py-1 rounded">.env</code>.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs space-y-1">
            <p>TWILIO_ACCOUNT_SID=tu_account_sid</p>
            <p>TWILIO_AUTH_TOKEN=tu_auth_token</p>
            <p>TWILIO_WHATSAPP_FROM=whatsapp:+14155238886</p>
          </div>
          <p className="text-gray-500 text-xs">
            Nota: Twilio ofrece un sandbox gratuito para pruebas. Los inquilinos deben enviar un mensaje al número de WhatsApp de Twilio primero para recibir notificaciones.
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Alertas Automáticas</h2>
        <div className="space-y-3 text-sm">
          <p className="text-gray-600">
            El sistema genera alertas automáticamente para:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>15 días antes del vencimiento de contrato</li>
            <li>15 días antes de la revisión de renta</li>
            <li>30 días antes del vencimiento para contactar al inquilino sobre renovación</li>
          </ul>
          <p className="text-gray-600 mt-3">
            Para ejecutar la verificación de alertas automáticamente, configura un cron job:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
            <p># Ejecutar diariamente a las 8am</p>
            <p>0 8 * * * cd /ruta/a/property-manager && npm run cron:alerts</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Verificar Alertas Manualmente</h2>
        <form action="/api/alerts/check" method="POST">
          <button type="submit" className="btn-primary">
            Ejecutar Verificación de Alertas
          </button>
        </form>
      </div>
    </div>
  )
}
