import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string; type?: string }>
}) {
  const params = await searchParams
  const zoneFilter = params.zone
  const typeFilter = params.type

  const allZones = await prisma.zone.findMany({ orderBy: { name: 'asc' } })

  // Build property filter
  const propertyWhere: any = { status: 'available' }
  if (zoneFilter) propertyWhere.zoneId = zoneFilter
  if (typeFilter) propertyWhere.propertyType = typeFilter

  const availableProperties = await prisma.property.findMany({
    where: propertyWhere,
    include: { zone: true, photos: { where: { isPrimary: true }, take: 1 } },
    orderBy: { zone: { name: 'asc' } },
  })

  // Get unique property types from available properties
  const allAvailable = await prisma.property.findMany({
    where: { status: 'available' },
    select: { propertyType: true },
    distinct: ['propertyType'],
  })
  const propertyTypes = allAvailable.map((p) => p.propertyType)

  // Group by zone
  const grouped = new Map<string, { zoneName: string; properties: typeof availableProperties }>()
  for (const prop of availableProperties) {
    const key = prop.zone.id
    if (!grouped.has(key)) {
      grouped.set(key, { zoneName: prop.zone.name, properties: [] })
    }
    grouped.get(key)!.properties.push(prop)
  }

  // Build PDF URL with same filters
  const pdfParams = new URLSearchParams()
  if (zoneFilter) pdfParams.set('zone', zoneFilter)
  if (typeFilter) pdfParams.set('type', typeFilter)
  const pdfUrl = `/api/availability/pdf${pdfParams.toString() ? '?' + pdfParams.toString() : ''}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disponibilidad</h1>
          <p className="text-gray-500 text-sm mt-1">
            {availableProperties.length} propiedad{availableProperties.length !== 1 ? 'es' : ''} disponible{availableProperties.length !== 1 ? 's' : ''} para renta
          </p>
        </div>
        <a href={pdfUrl} className="btn-primary text-center" target="_blank">
          Descargar PDF de Disponibilidad
        </a>
      </div>

      {/* Filters */}
      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Zone filter */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <span className="text-sm font-semibold text-gray-700">Zona / Inmueble</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/availability${typeFilter ? `?type=${typeFilter}` : ''}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!zoneFilter ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Todas
              </Link>
              {allZones.map((zone) => (
                <Link
                  key={zone.id}
                  href={`/availability?zone=${zone.id}${typeFilter ? `&type=${typeFilter}` : ''}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${zoneFilter === zone.id ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {zone.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Divider icon (desktop only) */}
          <div className="hidden md:flex items-center justify-center px-2">
            <div className="w-px h-8 bg-gray-300" />
          </div>

          {/* Type filter */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-accent-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <span className="text-sm font-semibold text-gray-700">Tipo de propiedad</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/availability${zoneFilter ? `?zone=${zoneFilter}` : ''}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!typeFilter ? 'bg-[#2663EB] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Todos
              </Link>
              {propertyTypes.map((type) => (
                <Link
                  key={type}
                  href={`/availability?type=${type}${zoneFilter ? `&zone=${zoneFilter}` : ''}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${typeFilter === type ? 'bg-[#2663EB] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {type}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Active filters bar - always visible */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Filtros activos:</span>
            {!zoneFilter && !typeFilter && (
              <span className="text-xs text-gray-400 italic">Mostrando todo</span>
            )}
            {zoneFilter && (
              <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-md text-xs font-medium">
                {allZones.find((z) => z.id === zoneFilter)?.name}
              </span>
            )}
            {typeFilter && (
              <span className="bg-accent-100 text-accent-700 px-2 py-0.5 rounded-md text-xs font-medium capitalize">
                {typeFilter}
              </span>
            )}
          </div>
          {(zoneFilter || typeFilter) && (
            <Link href="/availability" className="text-sm text-red-500 hover:text-red-700 font-medium">
              Limpiar filtros
            </Link>
          )}
        </div>
      </div>

      {/* Properties grouped by zone */}
      {Array.from(grouped.values()).map(({ zoneName, properties }) => (
        <div key={zoneName} className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">{zoneName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => (
              <Link key={property.id} href={`/properties/${property.id}`} className="card hover:shadow-md transition-shadow group">
                <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  {property.photos[0] ? (
                    <img
                      src={property.photos[0].url}
                      alt={property.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-4xl">🏠</div>
                        <p className="text-sm mt-1">Sin foto</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{property.name}</h3>
                    <span className="badge bg-blue-100 text-blue-700 flex-shrink-0">Disponible</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{property.number}</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo:</span>
                      <span className="capitalize">{property.propertyType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Superficie:</span>
                      <span>{property.squareMeters} m²</span>
                    </div>
                    {property.monthlyRent && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Renta:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(property.monthlyRent)}/mes
                        </span>
                      </div>
                    )}
                    {property.address && (
                      <p className="text-gray-400 text-xs mt-2">{property.address}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {availableProperties.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-semibold text-gray-900">
            {zoneFilter || typeFilter ? 'No hay propiedades disponibles con estos filtros' : 'Todas las propiedades estan rentadas'}
          </h3>
          <p className="text-gray-500 mt-1">
            {zoneFilter || typeFilter ? 'Prueba con otros filtros' : 'No hay propiedades disponibles en este momento'}
          </p>
        </div>
      )}
    </div>
  )
}
