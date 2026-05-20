import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import {
  formatCurrency,
  formatShortDate,
  daysUntil,
  getStatusLabel,
  getStatusColor,
} from '@/lib/utils';
import PhotoGallery from './photo-gallery';
import PhotoUploadButton from './photo-upload-button';
import ContractFileUpload from './contract-file-upload';
import RenewContractForm from './RenewContractForm';
import EditContractDates from './EditContractDates';
import CreateContractForm from './CreateContractForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      zone: true,
      photos: { orderBy: { createdAt: 'desc' } },
      contracts: {
        include: { property: true },
        orderBy: { startDate: 'desc' },
      },
    },
  });

  if (!property) notFound();

  const activeContract = property.contracts.find(
    (c) => c.status === 'active' || c.status === 'pending_renewal'
  );

  // Contract status with colors
  const getContractStatus = () => {
    if (!activeContract) return { label: 'Sin Contrato', color: 'bg-gray-100 text-gray-600', level: 'none' }
    const days = daysUntil(activeContract.endDate)
    if (days < 0) return { label: 'Vencido', color: 'bg-red-100 text-red-700 border border-red-200', level: 'expired' }
    if (days <= 30) return { label: `Por Vencer (${days}d)`, color: 'bg-orange-100 text-orange-700 border border-orange-200', level: 'warning' }
    return { label: 'Activo', color: 'bg-green-100 text-green-700 border border-green-200', level: 'active' }
  }
  const contractStatus = getContractStatus();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href={`/properties?zone=${property.zoneId}`} className="hover:text-blue-600 transition-colors">
              {property.zone?.name || 'Propiedades'}
            </Link>
            <span>/</span>
            <span className="text-gray-900">{property.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            #{property.number} &mdash; {property.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/properties/${property.id}/edit`}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
            Editar
          </Link>
          <Link
            href={`/properties?zone=${property.zoneId}`}
            className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Volver
          </Link>
        </div>
      </div>

      {/* Property Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informaci&oacute;n General
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">N&uacute;mero</dt>
                <dd className="mt-1 text-sm text-gray-900">{property.number}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                <dd className="mt-1 text-sm text-gray-900">{property.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                <dd className="mt-1 text-sm text-gray-900">{property.propertyType}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Superficie</dt>
                <dd className="mt-1 text-sm text-gray-900">{property.squareMeters} m&sup2;</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Zona</dt>
                <dd className="mt-1 text-sm text-gray-900">{property.zone?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Estado</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(property.status)}`}
                  >
                    {getStatusLabel(property.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Renta Mensual</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatCurrency(property.monthlyRent)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Direcci&oacute;n</dt>
                <dd className="mt-1 text-sm text-gray-900">{property.address || '—'}</dd>
              </div>
              {property.description && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Inventario / Caracter&iacute;sticas</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {property.description}
                  </dd>
                </div>
              )}
              {property.adminNotes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-amber-700">Notas del Administrador</dt>
                  <dd className="mt-1 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3 whitespace-pre-wrap">
                    {property.adminNotes}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Photo Gallery */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Fotos ({property.photos.length})
              </h2>
              <PhotoUploadButton propertyId={property.id} />
            </div>
            {property.photos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No hay fotos disponibles. Sube la primera foto de esta propiedad.
              </p>
            ) : (
              <PhotoGallery photos={property.photos} propertyId={property.id} />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Estatus de Contrato */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Estatus de Contrato</h2>
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${contractStatus.color}`}>
              {contractStatus.label}
            </div>

            {activeContract ? (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Inquilino</span>
                  <span className="font-medium text-gray-900">{activeContract.tenantName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vigencia</span>
                  <span className="text-gray-900">{formatShortDate(activeContract.startDate)} - {formatShortDate(activeContract.endDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Renta</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(activeContract.monthlyRent)}/mes</span>
                </div>
                <EditContractDates
                  contractId={activeContract.id}
                  currentStart={activeContract.startDate.toISOString().split('T')[0]}
                  currentEnd={activeContract.endDate.toISOString().split('T')[0]}
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">No hay contrato activo.</p>
            )}
          </div>

          {/* Renovar / Crear Contrato — solo si NO hay contrato activo vigente */}
          {(!activeContract || contractStatus.level === 'expired') && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {activeContract ? 'Renovar Contrato' : 'Crear Contrato'}
              </h2>
              {activeContract ? (
                <RenewContractForm contractId={activeContract.id} propertyId={property.id} />
              ) : (
                <CreateContractForm propertyId={property.id} />
              )}
            </div>
          )}

          {/* Contrato Firmado (upload) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contrato Firmado</h2>
            {activeContract ? (
              <ContractFileUpload
                contractId={activeContract.id}
                existingFileUrl={activeContract.contractFileUrl}
                existingFileName={activeContract.contractFileName}
              />
            ) : (
              <p className="text-sm text-gray-500">Renueva o crea un contrato primero.</p>
            )}
          </div>

          {/* Historial de Contratos */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Historial</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{property.contracts.length}</span>
            </div>
            {property.contracts.length === 0 ? (
              <p className="text-sm text-gray-500">No hay contratos registrados.</p>
            ) : (
              <ul className="space-y-2">
                {property.contracts.map((contract) => {
                  const d = daysUntil(contract.endDate)
                  const stStyle =
                    contract.status === 'active' && d > 30 ? 'bg-green-100 text-green-700' :
                    contract.status === 'active' && d > 0 ? 'bg-orange-100 text-orange-700' :
                    contract.status === 'active' && d <= 0 ? 'bg-red-100 text-red-700' :
                    contract.status === 'expired' ? 'bg-gray-100 text-gray-600' :
                    contract.status === 'pending_renewal' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  const stLabel =
                    contract.status === 'active' && d <= 0 ? 'Vencido' :
                    contract.status === 'active' && d <= 30 ? 'Por Vencer' :
                    contract.status === 'active' ? 'Activo' :
                    contract.status === 'expired' ? 'Vencido' :
                    contract.status === 'pending_renewal' ? 'Pendiente' :
                    'Cancelado'

                  return (
                    <li key={contract.id} className="p-2 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 truncate">{contract.tenantName || 'Sin inquilino'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stStyle}`}>{stLabel}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatShortDate(contract.startDate)} - {formatShortDate(contract.endDate)}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs font-medium text-gray-700">{formatCurrency(contract.monthlyRent)}/mes</p>
                        {contract.contractFileUrl && (
                          <a
                            href={contract.contractFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Ver contrato
                          </a>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
