import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TemplateEditor from './TemplateEditor'

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'admin') redirect('/dashboard')

  const templates = await prisma.contractTemplate.findMany({
    include: { zone: true },
    orderBy: [{ contractType: 'asc' }, { year: 'desc' }],
  })

  const zones = await prisma.zone.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plantillas de Contrato</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gestiona las plantillas por tipo de contrato y zona/inmueble. Cada zona puede tener su propia plantilla.
        </p>
      </div>

      {/* How it works */}
      <div className="card bg-blue-50 border-blue-200">
        <h2 className="text-sm font-semibold text-blue-800 mb-2">Como funciona</h2>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Crea una plantilla <strong>general</strong> (sin zona) que aplica a todos los inmuebles.</li>
          <li>Crea una plantilla <strong>por zona</strong> para personalizar el contrato de un inmueble especifico.</li>
          <li>Al generar un contrato, el sistema busca primero la plantilla de la zona, y si no existe, usa la general.</li>
        </ul>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Variables disponibles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {[
            '{{ARRENDADOR_NOMBRE}}',
            '{{ARRENDATARIO_NOMBRE}}',
            '{{PROPIEDAD_NOMBRE}}',
            '{{PROPIEDAD_NUMERO}}',
            '{{PROPIEDAD_DIRECCION}}',
            '{{PROPIEDAD_M2}}',
            '{{PROPIEDAD_USO}}',
            '{{CONTRATO_TIPO}}',
            '{{CONTRATO_FECHA_INICIO}}',
            '{{CONTRATO_FECHA_FIN}}',
            '{{CONTRATO_FECHA_REVISION}}',
            '{{CONTRATO_DURACION}}',
            '{{CONTRATO_RENTA_MENSUAL}}',
            '{{CONTRATO_RENTA_LETRA}}',
            '{{CONTRATO_DEPOSITO}}',
            '{{CONTRATO_INCREMENTO}}',
            '{{FECHA_FIRMA}}',
            '{{LUGAR_FIRMA}}',
          ].map((v) => (
            <code key={v} className="bg-gray-100 px-2 py-1 rounded text-xs">{v}</code>
          ))}
        </div>
      </div>

      <TemplateEditor
        templates={templates.map(t => ({
          ...t,
          zoneName: t.zone?.name || null,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        }))}
        zones={zones.map(z => ({ id: z.id, name: z.name }))}
      />
    </div>
  )
}
