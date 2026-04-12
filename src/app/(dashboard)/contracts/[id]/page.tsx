import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { formatCurrency, formatDate, formatShortDate, daysUntil, getStatusLabel, getStatusColor } from '@/lib/utils';
import AutoDownload from './AutoDownload';
import ContractFileUpload from '../../properties/[id]/contract-file-upload';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      property: {
        include: {
          zone: true,
        },
      },
    },
  });

  if (!contract) notFound();

  const daysLeft = daysUntil(contract.endDate);
  const reviewDaysLeft = contract.reviewDate ? daysUntil(contract.reviewDate) : null;

  const timelineEvents = [
    {
      label: 'Inicio del contrato',
      date: contract.startDate,
      icon: 'start',
      past: new Date() >= contract.startDate,
    },
    ...(contract.reviewDate
      ? [
          {
            label: 'Fecha de revision',
            date: contract.reviewDate,
            icon: 'review',
            past: new Date() >= contract.reviewDate,
          },
        ]
      : []),
    {
      label: 'Fin del contrato',
      date: contract.endDate,
      icon: 'end',
      past: new Date() >= contract.endDate,
    },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-6">
      {/* Auto-descarga PDF+DOCX si es contrato nuevo */}
      <AutoDownload contractId={contract.id} />

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/properties/${contract.property.id}`} className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {contract.property.name}
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/contracts" className="text-gray-500 hover:text-gray-700">
              Todos los contratos
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Contrato - {contract.property.name}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/contracts/${contract.id}/edit`}
            className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Informacion del contrato */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Informacion del Contrato</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Estado</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(contract.status)}`}
                  >
                    {getStatusLabel(contract.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Renta Mensual</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatCurrency(contract.monthlyRent)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fecha de Inicio</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(contract.startDate)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fecha de Fin</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(contract.endDate)}
                  {contract.status === 'active' && (
                    <span
                      className={`ml-2 text-xs font-medium ${daysLeft < 15 ? 'text-red-600' : daysLeft < 30 ? 'text-yellow-600' : 'text-green-600'}`}
                    >
                      ({daysLeft} dias restantes)
                    </span>
                  )}
                </dd>
              </div>
              {contract.reviewDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Fecha de Revision</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(contract.reviewDate)}
                    {reviewDaysLeft !== null && reviewDaysLeft > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({reviewDaysLeft} dias restantes)
                      </span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Incremento Anual</dt>
                <dd className="mt-1 text-sm text-gray-900">{contract.annualIncrement}%</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Deposito</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatCurrency(contract.depositAmount || 0)}
                </dd>
              </div>
            </dl>
            {contract.notes && (
              <div className="mt-4 border-t pt-4">
                <dt className="text-sm font-medium text-gray-500">Notas</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {contract.notes}
                </dd>
              </div>
            )}
          </div>

          {/* Informacion de la propiedad */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Propiedad</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                <dd className="mt-1 text-sm text-gray-900">{contract.property.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Zona</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.property.zone?.name || '\u2014'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Direccion</dt>
                <dd className="mt-1 text-sm text-gray-900">{contract.property.address}</dd>
              </div>
              {contract.property.propertyType && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                  <dd className="mt-1 text-sm text-gray-900">{contract.property.propertyType}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Informacion del inquilino */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Datos del Inquilino</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                <dd className="mt-1 text-sm text-gray-900">{contract.tenantName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Correo Electronico</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.tenantEmail ? (
                    <a href={`mailto:${contract.tenantEmail}`} className="text-blue-600 hover:underline">
                      {contract.tenantEmail}
                    </a>
                  ) : '\u2014'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefono</dt>
                <dd className="mt-1 text-sm text-gray-900">{contract.tenantPhone || '\u2014'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">WhatsApp</dt>
                <dd className="mt-1 text-sm text-gray-900">{contract.tenantWhatsapp || '\u2014'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Barra lateral */}
        <div className="space-y-6">
          {/* Contrato firmado / Upload */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Contrato Firmado</h2>
            {contract.status === 'pending_renewal' && !contract.contractFileUrl && (
              <div className="mb-3 rounded-md bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-xs text-yellow-800 font-medium">Sube el contrato firmado para activar este contrato.</p>
              </div>
            )}
            <ContractFileUpload
              contractId={contract.id}
              existingFileUrl={contract.contractFileUrl}
              existingFileName={contract.contractFileName}
            />
          </div>

          {/* Acciones */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Acciones</h2>
            <div className="space-y-3">
              {(contract.status === 'active' || contract.status === 'pending_renewal') && (
                <Link
                  href={`/contracts/new?renewFrom=${contract.id}`}
                  className="flex w-full items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Renovar Contrato
                </Link>
              )}
              <a
                href={`/api/contracts/${contract.id}/generate-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Descargar PDF
              </a>
              <a
                href={`/api/contracts/${contract.id}/generate-docx`}
                className="flex w-full items-center justify-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Descargar Word
              </a>
            </div>
          </div>

          {/* Linea de tiempo */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Linea de Tiempo</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />
              <ul className="space-y-6">
                {timelineEvents.map((event, index) => (
                  <li key={index} className="relative flex items-start gap-3 pl-10">
                    <span
                      className={`absolute left-2 flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                        event.past ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {event.past ? '\u2713' : '\u25CB'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{event.label}</p>
                      <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
