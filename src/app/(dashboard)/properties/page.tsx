import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { formatCurrency, getStatusLabel, getStatusColor } from '@/lib/utils';

interface SearchParams {
  zone?: string;
  status?: string;
  type?: string;
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');

  const params = await searchParams;
  const { zone, status, type } = params;

  const where: Record<string, unknown> = {};
  if (zone) where.zoneId = zone;
  if (status) where.status = status;
  if (type) where.propertyType = type;

  const [properties, zones] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { zone: true },
      orderBy: { number: 'asc' },
    }),
    prisma.zone.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const statuses = ['DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO', 'INACTIVO'];
  const propertyTypes = ['LOCAL', 'OFICINA', 'BODEGA', 'TERRENO', 'DEPARTAMENTO', 'CASA'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propiedades</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona todas las propiedades del portafolio
          </p>
        </div>
        <Link
          href="/properties/new"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva Propiedad
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <label htmlFor="zone" className="block text-sm font-medium text-gray-700 mb-1">
            Zona
          </label>
          <select
            id="zone"
            name="zone"
            defaultValue={zone || ''}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">Todas las zonas</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status || ''}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">Todos los estados</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {getStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type || ''}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">Todos los tipos</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 flex gap-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Filtrar
          </button>
          <Link
            href="/properties"
            className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Limpiar filtros
          </Link>
        </div>
      </form>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        {properties.length} {properties.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
      </p>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                No.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                m&sup2;
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zona
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Renta Mensual
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {properties.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  No se encontraron propiedades
                </td>
              </tr>
            ) : (
              properties.map((property) => (
                <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {property.number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <Link
                      href={`/properties/${property.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {property.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {property.squareMeters} m&sup2;
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {property.propertyType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {property.zone?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(property.status)}`}
                    >
                      {getStatusLabel(property.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(property.monthlyRent)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/properties/${property.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Grid */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {properties.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No se encontraron propiedades
          </div>
        ) : (
          properties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-900">
                  #{property.number}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(property.status)}`}
                >
                  {getStatusLabel(property.status)}
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {property.name}
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>
                  <span className="text-gray-400">Tipo:</span> {property.propertyType}
                </div>
                <div>
                  <span className="text-gray-400">m&sup2;:</span> {property.squareMeters}
                </div>
                <div>
                  <span className="text-gray-400">Zona:</span> {property.zone?.name || '—'}
                </div>
                <div className="font-medium text-gray-900">
                  {formatCurrency(property.monthlyRent)}/mes
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
