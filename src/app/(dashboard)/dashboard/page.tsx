import { prisma } from '@/lib/prisma'
import { formatCurrency, formatShortDate, daysUntil, getAlertLevel, getStatusLabel, getStatusColor } from '@/lib/utils'
import Link from 'next/link'
import { addDays, addMonths } from 'date-fns'

async function getDashboardData() {
  const now = new Date()
  const in15Days = addDays(now, 15)
  const in30Days = addDays(now, 30)
  const in60Days = addMonths(now, 2)

  const [properties, contracts, zones, upcomingContracts, reviewContracts, recentAlerts] = await Promise.all([
    prisma.property.findMany({ include: { zone: true } }),
    prisma.contract.findMany({ where: { status: { in: ['active', 'pending_renewal'] } }, include: { property: { include: { zone: true } } } }),
    prisma.zone.findMany({ include: { properties: { include: { contracts: { where: { status: { in: ['active', 'pending_renewal'] } } } } } } }),
    // Contracts expiring in next 60 days
    prisma.contract.findMany({
      where: { status: { in: ['active', 'pending_renewal'] }, endDate: { lte: in60Days } },
      include: { property: { include: { zone: true } } },
      orderBy: { endDate: 'asc' },
    }),
    // Contracts with upcoming rent reviews
    prisma.contract.findMany({
      where: { status: 'active', reviewDate: { lte: in60Days, gte: now } },
      include: { property: { include: { zone: true } } },
      orderBy: { reviewDate: 'asc' },
    }),
    prisma.alert.findMany({
      where: { status: 'pending' },
      include: { contract: { include: { property: true } } },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
  ])

  const totalProperties = properties.length
  const rentedProperties = properties.filter((p) => p.status === 'rented').length
  const availableProperties = properties.filter((p) => p.status === 'available').length
  const occupancyRate = totalProperties > 0 ? (rentedProperties / totalProperties) * 100 : 0
  const totalMonthlyRent = contracts.reduce((sum, c) => sum + c.monthlyRent, 0)

  // By zone
  const zoneStats = zones.map((zone) => {
    const total = zone.properties.length
    const rented = zone.properties.filter((p) => p.contracts.length > 0).length
    const zoneRent = zone.properties.reduce((sum, p) => {
      const activeContract = p.contracts[0]
      return sum + (activeContract?.monthlyRent || 0)
    }, 0)
    return {
      name: zone.name,
      total,
      rented,
      available: total - rented,
      occupancy: total > 0 ? (rented / total) * 100 : 0,
      monthlyRent: zoneRent,
    }
  })

  // Categorize upcoming events
  const thisWeek = upcomingContracts.filter((c) => daysUntil(c.endDate) <= 7)
  const thisMonth = upcomingContracts.filter((c) => daysUntil(c.endDate) > 7 && daysUntil(c.endDate) <= 30)
  const nextTwoMonths = upcomingContracts.filter((c) => daysUntil(c.endDate) > 30 && daysUntil(c.endDate) <= 60)

  return {
    totalProperties, rentedProperties, availableProperties, occupancyRate, totalMonthlyRent,
    zoneStats, thisWeek, thisMonth, nextTwoMonths, reviewContracts, recentAlerts, upcomingContracts,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Resumen general de propiedades y contratos</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Propiedades" value={data.totalProperties.toString()} color="blue" />
        <KPICard title="Rentadas" value={data.rentedProperties.toString()} color="green" />
        <KPICard title="Disponibles" value={data.availableProperties.toString()} color="yellow" />
        <KPICard title="Ocupación" value={`${data.occupancyRate.toFixed(1)}%`} color="purple" />
        <KPICard title="Renta Mensual Total" value={formatCurrency(data.totalMonthlyRent)} color="emerald" />
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AlertSection title="Esta Semana" items={data.thisWeek} level="danger" />
        <AlertSection title="Este Mes" items={data.thisMonth} level="warning" />
        <AlertSection title="Próximos 2 Meses" items={data.nextTwoMonths} level="info" />
      </div>

      {/* Rent Reviews */}
      {data.reviewContracts.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Revisiones de Renta Próximas</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Propiedad</th>
                  <th className="table-header">Inquilino</th>
                  <th className="table-header">Fecha Revisión</th>
                  <th className="table-header">Renta Actual</th>
                  <th className="table-header">Incremento</th>
                  <th className="table-header">Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.reviewContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{contract.property.name}</td>
                    <td className="table-cell">{contract.tenantName}</td>
                    <td className="table-cell">{formatShortDate(contract.reviewDate!)}</td>
                    <td className="table-cell">{formatCurrency(contract.monthlyRent)}</td>
                    <td className="table-cell">{contract.annualIncrement}%</td>
                    <td className="table-cell">
                      <DaysBadge days={daysUntil(contract.reviewDate!)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Zone Stats */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Resumen por Zona</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.zoneStats.map((zone) => (
            <div key={zone.name} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900">{zone.name}</h3>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Propiedades:</span>
                  <span className="font-medium">{zone.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Rentadas:</span>
                  <span className="font-medium text-green-600">{zone.rented}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Disponibles:</span>
                  <span className="font-medium text-blue-600">{zone.available}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ocupación:</span>
                  <span className="font-medium">{zone.occupancy.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#2663EB] h-2 rounded-full transition-all"
                    style={{ width: `${zone.occupancy}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm pt-1 border-t">
                  <span className="text-gray-500">Renta mensual:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(zone.monthlyRent)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Alerts */}
      {data.recentAlerts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Alertas Pendientes</h2>
            <Link href="/alerts" className="text-primary-600 text-sm hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  daysUntil(alert.dueDate) <= 7 ? 'bg-red-500' : daysUntil(alert.dueDate) <= 30 ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-sm text-gray-500 truncate">{alert.message}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatShortDate(alert.dueDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KPICard({ title, value, color }: { title: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-75">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

function AlertSection({ title, items, level }: { title: string; items: any[]; level: string }) {
  const bgMap: Record<string, string> = {
    danger: 'border-red-200 bg-red-50',
    warning: 'border-yellow-200 bg-yellow-50',
    info: 'border-blue-200 bg-blue-50',
  }
  const titleMap: Record<string, string> = {
    danger: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  }

  return (
    <div className={`rounded-xl border p-4 ${bgMap[level]}`}>
      <h3 className={`font-semibold ${titleMap[level]} mb-3`}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Sin eventos próximos</p>
      ) : (
        <div className="space-y-2">
          {items.map((contract) => (
            <Link key={contract.id} href={`/properties/${contract.property.id}`} className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
              <p className="text-sm font-medium">{contract.property.name}</p>
              <p className="text-xs text-gray-500">{contract.tenantName}</p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400">Vence: {formatShortDate(contract.endDate)}</span>
                <DaysBadge days={daysUntil(contract.endDate)} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function DaysBadge({ days }: { days: number }) {
  const color = days <= 7 ? 'bg-red-100 text-red-700' : days <= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
  const label = days < 0 ? `Vencido hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `${days} días`
  return <span className={`badge ${color}`}>{label}</span>
}
