import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { formatCurrency, formatDate, formatShortDate, daysUntil, getStatusLabel, getStatusColor } from '@/lib/utils';
import RenewContractDropdown from './RenewContractDropdown';

interface SearchParams {
  status?: string;
  zone?: string;
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const params = await searchParams;
  const statusFilter = params.status || '';
  const zoneFilter = params.zone || '';

  const where: Record<string, unknown> = {};

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (zoneFilter) {
    where.property = {
      zoneId: zoneFilter,
    };
  }

  const [contracts, zones] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: {
        property: {
          include: {
            zone: true,
          },
        },
      },
      orderBy: { endDate: 'asc' },
    }),
    prisma.zone.findMany({ orderBy: { name: 'asc' } }),
  ]);

  function getRowUrgencyClass(endDate: Date, status: string): string {
    if (status !== 'active') return '';
    const days = daysUntil(endDate);
    if (days < 15) return 'bg-red-50 border-l-4 border-red-500';
    if (days < 30) return 'bg-yellow-50 border-l-4 border-yellow-400';
    return '';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
        <div className="flex gap-3">
          <Link
            href="/contracts/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            + Crear Contrato
          </Link>
          <RenewContractDropdown contracts={contracts.filter(c => c.status === 'active' || c.status === 'pending_renewal')} />
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg bg-white p-4 shadow">
        <form method="GET" className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="expired">Vencido</option>
              <option value="pending_renewal">Pendiente de Renovación</option>
            </select>
          </div>

          <div>
            <label htmlFor="zone" className="block text-sm font-medium text-gray-700">
              Zona
            </label>
            <select
              id="zone"
              name="zone"
              defaultValue={zoneFilter}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Todas las zonas</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Filtrar
          </button>

          <Link
            href="/contracts"
            className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Limpiar filtros
          </Link>
        </form>
      </div>

      {/* Tabla de contratos */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Propiedad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Inquilino
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Fecha Inicio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Fecha Fin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Revisión
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Renta Mensual
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                  No se encontraron contratos.
                </td>
              </tr>
            ) : (
              contracts.map((contract) => {
                const urgencyClass = getRowUrgencyClass(contract.endDate, contract.status);
                const daysLeft = daysUntil(contract.endDate);

                return (
                  <tr key={contract.id} className={`${urgencyClass} hover:bg-gray-50`}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      <Link href={`/contracts/${contract.id}`} className="hover:text-blue-600">
                        {contract.property.name}
                      </Link>
                      <div className="text-xs text-gray-500">{contract.property.zone?.name}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {contract.tenantName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {formatShortDate(contract.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      <span>{formatShortDate(contract.endDate)}</span>
                      {contract.status === 'active' && daysLeft <= 30 && (
                        <span className="ml-2 text-xs font-medium text-red-600">
                          ({daysLeft} días)
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {contract.reviewDate ? formatShortDate(contract.reviewDate) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {formatCurrency(contract.monthlyRent)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(contract.status)}`}
                      >
                        {getStatusLabel(contract.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver
                      </Link>
                      <span className="mx-1 text-gray-300">|</span>
                      <Link
                        href={`/contracts/${contract.id}/edit`}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Leyenda de colores */}
      <div className="flex gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border-l-4 border-red-500 bg-red-50" />
          Vence en menos de 15 días
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border-l-4 border-yellow-400 bg-yellow-50" />
          Vence en menos de 30 días
        </div>
      </div>
    </div>
  );
}
