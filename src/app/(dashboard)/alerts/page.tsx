import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatDate, formatShortDate, daysUntil } from '@/lib/utils'
import { redirect } from 'next/navigation'
import AlertActions from './AlertActions'
import Link from 'next/link'

const ALERT_TYPE_LABELS: Record<string, string> = {
  contract_expiry: 'Vencimiento de Contrato',
  rent_review: 'Revision de Renta',
  renewal_contact: 'Contactar Inquilino',
  payment_due: 'Pago Pendiente',
}

function getUrgencyStyles(dueDate: Date) {
  const days = daysUntil(dueDate)
  if (days <= 3) return { border: 'border-l-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-800', label: 'Urgente' }
  if (days <= 7) return { border: 'border-l-orange-500', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800', label: 'Alta' }
  if (days <= 15) return { border: 'border-l-yellow-500', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800', label: 'Media' }
  return { border: 'border-l-blue-400', bg: 'bg-white', badge: 'bg-blue-100 text-blue-800', label: 'Baja' }
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const params = await searchParams
  const typeFilter = params.type
  const statusFilter = params.status || 'pending'

  const where: any = {}
  if (typeFilter) where.type = typeFilter
  if (statusFilter) where.status = statusFilter

  const alerts = await prisma.alert.findMany({
    where,
    orderBy: { dueDate: 'asc' },
    include: {
      contract: {
        include: { property: true },
      },
    },
  })

  const isAdmin = (session.user as any)?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona las alertas de contratos y propiedades</p>
        </div>
        <AlertActions />
      </div>

      {/* Filters */}
      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Type filter */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              </div>
              <span className="text-sm font-semibold text-gray-700">Tipo de alerta</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/alerts?status=${statusFilter}`} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!typeFilter ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Todos
              </Link>
              {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
                <Link key={key} href={`/alerts?type=${key}&status=${statusFilter}`} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${typeFilter === key ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:flex items-center justify-center px-2">
            <div className="w-px h-8 bg-gray-300" />
          </div>

          {/* Status filter */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-accent-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-sm font-semibold text-gray-700">Estado</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'pending', label: 'Pendientes' },
                { key: 'sent', label: 'Enviadas' },
                { key: 'dismissed', label: 'Descartadas' },
              ].map(({ key, label }) => (
                <Link key={key} href={`/alerts?status=${key}${typeFilter ? `&type=${typeFilter}` : ''}`} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === key ? 'bg-[#2663EB] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Active filters bar */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Filtros activos:</span>
            {!typeFilter && (
              <span className="text-xs text-gray-400 italic">Todos los tipos</span>
            )}
            {typeFilter && (
              <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-md text-xs font-medium">
                {ALERT_TYPE_LABELS[typeFilter] || typeFilter}
              </span>
            )}
            <span className="bg-accent-100 text-accent-700 px-2 py-0.5 rounded-md text-xs font-medium">
              {statusFilter === 'pending' ? 'Pendientes' : statusFilter === 'sent' ? 'Enviadas' : 'Descartadas'}
            </span>
          </div>
          {typeFilter && (
            <Link href={`/alerts?status=${statusFilter}`} className="text-sm text-red-500 hover:text-red-700 font-medium">
              Limpiar tipo
            </Link>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500">{alerts.length} alerta{alerts.length !== 1 ? 's' : ''}</p>

      {alerts.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-lg text-gray-500">No se encontraron alertas</p>
          <p className="text-sm text-gray-400 mt-1">Ejecuta una verificacion de alertas o ajusta los filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const urgency = getUrgencyStyles(alert.dueDate)
            const days = daysUntil(alert.dueDate)

            return (
              <div key={alert.id} className={`rounded-lg border border-l-4 ${urgency.border} ${urgency.bg} p-5 shadow-sm`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`badge ${urgency.badge}`}>{urgency.label}</span>
                      <span className="badge bg-gray-100 text-gray-700">
                        {ALERT_TYPE_LABELS[alert.type] || alert.type}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                    {alert.message && <p className="mt-1 text-sm text-gray-600">{alert.message}</p>}

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>Fecha: {formatDate(alert.dueDate)}</span>
                      <span className="font-medium">
                        {days > 0 ? `Faltan ${days} dia${days !== 1 ? 's' : ''}` : days === 0 ? 'Vence hoy' : `Vencio hace ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`}
                      </span>
                    </div>

                    {alert.contract && (
                      <div className="mt-3 p-3 bg-white/60 rounded-md text-sm">
                        <div className="flex flex-wrap gap-4 text-gray-600">
                          {alert.contract.property && (
                            <Link href={`/properties/${alert.contract.property.id}`} className="text-primary-600 hover:underline">
                              {alert.contract.property.name}
                            </Link>
                          )}
                          <span>Inquilino: {alert.contract.tenantName}</span>
                          <span>Vigencia: {formatShortDate(alert.contract.startDate)} - {formatShortDate(alert.contract.endDate)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {isAdmin && alert.status === 'pending' && (
                    <AlertActions alertId={alert.id} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
