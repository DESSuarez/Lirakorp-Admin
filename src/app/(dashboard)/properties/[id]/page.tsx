import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import {
  formatCurrency,
  formatShortDate,
  getStatusLabel,
  getStatusColor,
} from '@/lib/utils';
import PhotoGallery from './photo-gallery';
import PhotoUploadButton from './photo-upload-button';
import ContractFileUpload from './contract-file-upload';

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
    (c) => c.status === 'ACTIVO'
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/properties" className="hover:text-blue-600 transition-colors">
              Propiedades
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
            href="/properties"
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
                  <dt className="text-sm font-medium text-gray-500">Descripci&oacute;n</dt>
                  <dd className="mt-1 text-sm text-red-600 font-bold whitespace-pre-wrap">
                    {property.description}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Admin Notes */}
          {property.adminNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                </div>
                <h2 className="text-sm font-semibold text-amber-800">Notas del Administrador</h2>
              </div>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{property.adminNotes}</p>
            </div>
          )}

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
          {/* Active Contract */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Contrato Activo
              </h2>
              {!activeContract && (
                <Link
                  href={`/contracts/new?propertyId=${property.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#2663EB] text-white rounded-lg hover:bg-[#1d4fc2] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Añadir contrato
                </Link>
              )}
            </div>
            {activeContract ? (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Inquilino</span>
                  <p className="text-sm font-medium text-gray-900">
                    {activeContract.tenantName || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Periodo</span>
                  <p className="text-sm text-gray-900">
                    {formatShortDate(activeContract.startDate)} &mdash;{' '}
                    {formatShortDate(activeContract.endDate)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Renta</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(activeContract.monthlyRent)}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="space-y-2 pt-2">
                  <Link
                    href={`/contracts/${activeContract.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Ver detalle del contrato
                  </Link>
                  <a
                    href={`/api/contracts/${activeContract.id}/generate-docx`}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Descargar Editable (Word)
                  </a>
                  <a
                    href={`/api/contracts/${activeContract.id}/generate-pdf`}
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    Descargar Editable (PDF)
                  </a>
                </div>

                {/* Upload final signed contract */}
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Contrato definitivo firmado:</p>
                  <ContractFileUpload
                    contractId={activeContract.id}
                    existingFileUrl={activeContract.contractFileUrl}
                    existingFileName={activeContract.contractFileName}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-sm text-gray-500 mb-3">
                  No hay contrato activo para esta propiedad.
                </p>
                <Link
                  href={`/contracts/new?propertyId=${property.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#2663EB] text-white rounded-lg hover:bg-[#1d4fc2] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Crear nuevo contrato
                </Link>
              </div>
            )}
          </div>

          {/* Contract History */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Historial de Contratos
              </h2>
              <span className="badge bg-gray-100 text-gray-600">{property.contracts.length}</span>
            </div>
            {property.contracts.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay contratos registrados.
              </p>
            ) : (
              <ul className="space-y-3">
                {property.contracts.map((contract) => {
                  const statusStyles =
                    contract.status === 'active' ? 'bg-green-100 text-green-800' :
                    contract.status === 'expired' ? 'bg-gray-100 text-gray-600' :
                    contract.status === 'pending_renewal' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  const statusLabel =
                    contract.status === 'active' ? 'Activo' :
                    contract.status === 'expired' ? 'Vencido' :
                    contract.status === 'pending_renewal' ? 'Renovacion' :
                    'Cancelado'

                  return (
                    <li key={contract.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="block hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {contract.tenantName || 'Sin inquilino'}
                          </span>
                          <span className={`badge ${statusStyles}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatShortDate(contract.startDate)} &mdash;{' '}
                          {formatShortDate(contract.endDate)}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs font-medium text-gray-700">
                            {formatCurrency(contract.monthlyRent)}/mes
                          </p>
                          {contract.contractFileUrl && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Contrato subido
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Add new contract button at bottom of history */}
            {activeContract && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  href={`/contracts/new?propertyId=${property.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Registrar nuevo contrato
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
