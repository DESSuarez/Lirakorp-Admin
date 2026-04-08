import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'
import ReportCharts from '@/components/Charts'

interface ZoneReport {
  zone: string
  totalProperties: number
  rentedProperties: number
  availableProperties: number
  occupancyRate: number
  totalMonthlyRent: number
}

async function getZoneReports(): Promise<ZoneReport[]> {
  const zones = await prisma.zone.findMany({
    include: {
      properties: {
        include: {
          contracts: { where: { status: 'active' } },
        },
      },
    },
  })

  return zones.map((zone) => {
    const total = zone.properties.length
    const rented = zone.properties.filter((p) => p.contracts.length > 0).length
    const available = total - rented
    const monthlyRent = zone.properties.reduce((sum, p) => {
      const activeContract = p.contracts[0]
      return sum + (activeContract?.monthlyRent || 0)
    }, 0)

    return {
      zone: zone.name,
      totalProperties: total,
      rentedProperties: rented,
      availableProperties: available,
      occupancyRate: total > 0 ? Math.round((rented / total) * 100) : 0,
      totalMonthlyRent: monthlyRent,
    }
  }).sort((a, b) => a.zone.localeCompare(b.zone))
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const zoneReports = await getZoneReports()

  const zones = zoneReports.map((r) => r.zone)
  const totalProperties = zoneReports.reduce((sum, r) => sum + r.totalProperties, 0)
  const totalRented = zoneReports.reduce((sum, r) => sum + r.rentedProperties, 0)
  const totalAvailable = zoneReports.reduce((sum, r) => sum + r.availableProperties, 0)
  const totalMonthlyRent = zoneReports.reduce((sum, r) => sum + r.totalMonthlyRent, 0)
  const globalOccupancy = totalProperties > 0 ? Math.round((totalRented / totalProperties) * 100) : 0

  const occupancyData = {
    labels: zones,
    datasets: [{
      label: 'Tasa de Ocupacion (%)',
      data: zoneReports.map((r) => r.occupancyRate),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
    }],
  }

  const rentData = {
    labels: zones,
    datasets: [{
      label: 'Renta Mensual',
      data: zoneReports.map((r) => r.totalMonthlyRent),
      backgroundColor: 'rgba(34, 197, 94, 0.7)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 1,
    }],
  }

  const distributionData = {
    labels: ['Rentadas', 'Disponibles'],
    datasets: [{
      data: [totalRented, totalAvailable],
      backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(59, 130, 246, 0.8)'],
      borderColor: ['rgb(34, 197, 94)', 'rgb(59, 130, 246)'],
      borderWidth: 2,
    }],
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen general por zona</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Total Propiedades</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalProperties}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Ocupacion Global</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{globalOccupancy}%</p>
          <p className="text-sm text-gray-400">{totalRented} rentadas / {totalAvailable} disponibles</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Renta Mensual Total</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalMonthlyRent)}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Renta Anual Estimada</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalMonthlyRent * 12)}</p>
        </div>
      </div>

      {/* Charts */}
      <ReportCharts
        occupancyData={occupancyData}
        rentData={rentData}
        collectionData={distributionData}
      />

      {/* Zone Detail Table */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Detalle por Zona</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Zona</th>
                <th className="table-header text-center">Total</th>
                <th className="table-header text-center">Rentadas</th>
                <th className="table-header text-center">Disponibles</th>
                <th className="table-header text-center">Ocupacion</th>
                <th className="table-header text-right">Renta Mensual</th>
                <th className="table-header text-right">Renta Anual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {zoneReports.map((report) => (
                <tr key={report.zone} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{report.zone}</td>
                  <td className="table-cell text-center">{report.totalProperties}</td>
                  <td className="table-cell text-center">{report.rentedProperties}</td>
                  <td className="table-cell text-center">{report.availableProperties}</td>
                  <td className="table-cell text-center">
                    <span className={`badge ${
                      report.occupancyRate >= 80 ? 'bg-green-100 text-green-800' :
                      report.occupancyRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {report.occupancyRate}%
                    </span>
                  </td>
                  <td className="table-cell text-right">{formatCurrency(report.totalMonthlyRent)}</td>
                  <td className="table-cell text-right">{formatCurrency(report.totalMonthlyRent * 12)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr className="font-semibold">
                <td className="table-cell">Totales</td>
                <td className="table-cell text-center">{totalProperties}</td>
                <td className="table-cell text-center">{totalRented}</td>
                <td className="table-cell text-center">{totalAvailable}</td>
                <td className="table-cell text-center">
                  <span className="badge bg-blue-100 text-blue-800">{globalOccupancy}%</span>
                </td>
                <td className="table-cell text-right font-bold">{formatCurrency(totalMonthlyRent)}</td>
                <td className="table-cell text-right font-bold">{formatCurrency(totalMonthlyRent * 12)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
