'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Property {
  id: string;
  name: string;
  address: string;
  zone?: { name: string };
}

export default function NewContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const renewFrom = searchParams.get('renewFrom');
  const propertyIdParam = searchParams.get('propertyId');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  const [form, setForm] = useState({
    propertyId: '',
    contractType: 'arrendamiento',
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    tenantWhatsapp: '',
    startDate: '',
    endDate: '',
    reviewDate: '',
    monthlyRent: '',
    annualIncrement: '5',
    depositAmount: '',
    fiadorName: '',
    fiadorProperty: '',
    propertyInventory: '',
    maintenanceFee: '',
    signingCity: '',
    signingTime: '10:00',
    propertyUse: 'CASA HABITACION',
    notes: '',
  });

  const CONTRACT_TYPES = [
    { value: 'arrendamiento', label: 'Arrendamiento' },
    { value: 'comodato', label: 'Comodato' },
    { value: 'temporal', label: 'Temporal / Vacacional' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'bodega', label: 'Bodega / Almacen' },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const propsRes = await fetch('/api/properties?status=available');
        if (propsRes.ok) {
          const data = await propsRes.json();
          setProperties(data);
        }

        if (renewFrom) {
          const contractRes = await fetch(`/api/contracts/${renewFrom}`);
          if (contractRes.ok) {
            const contract = await contractRes.json();
            const oldEnd = new Date(contract.endDate);
            const newStart = new Date(oldEnd);
            newStart.setDate(newStart.getDate() + 1);
            const newEnd = new Date(newStart);
            newEnd.setFullYear(newEnd.getFullYear() + 1);

            setForm((prev) => ({
              ...prev,
              propertyId: contract.propertyId,
              tenantName: contract.tenantName,
              tenantEmail: contract.tenantEmail,
              tenantPhone: contract.tenantPhone || '',
              tenantWhatsapp: contract.tenantWhatsapp || '',
              startDate: newStart.toISOString().split('T')[0],
              endDate: newEnd.toISOString().split('T')[0],
              monthlyRent: String(
                Math.round(
                  contract.monthlyRent * (1 + contract.annualIncrement / 100)
                )
              ),
              annualIncrement: String(contract.annualIncrement),
              depositAmount: String(contract.depositAmount),
              notes: `Renovación del contrato anterior (ID: ${renewFrom})`,
            }));
          }
        }
      } catch {
        setError('Error al cargar los datos');
      } finally {
        setLoadingProperties(false);
      }
    }
    loadData();
  }, [renewFrom]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...form,
        monthlyRent: parseFloat(form.monthlyRent),
        annualIncrement: parseFloat(form.annualIncrement),
        depositAmount: parseFloat(form.depositAmount),
        reviewDate: form.reviewDate || null,
      };

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear el contrato');
      }

      const contract = await res.json();
      router.push(`/contracts/${contract.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-3 text-sm">
          {propertyIdParam ? (
            <>
              <Link href={`/properties/${propertyIdParam}`} className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Volver a la propiedad
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/contracts" className="text-gray-500 hover:text-gray-700">
                Todos los contratos
              </Link>
            </>
          ) : (
            <Link href="/contracts" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Volver a Contratos
            </Link>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {renewFrom ? 'Renovar Contrato' : 'Nuevo Contrato'}
        </h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
        {/* Propiedad */}
        <div>
          <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700">
            Propiedad *
          </label>
          <select
            id="propertyId"
            name="propertyId"
            required
            value={form.propertyId}
            onChange={handleChange}
            disabled={loadingProperties}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Seleccionar propiedad...</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.address} {p.zone ? `(${p.zone.name})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de contrato */}
        <div>
          <label htmlFor="contractType" className="block text-sm font-medium text-gray-700">
            Tipo de Contrato *
          </label>
          <select
            id="contractType"
            name="contractType"
            required
            value={form.contractType}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {CONTRACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            La plantilla del contrato se selecciona automaticamente segun el tipo y la zona de la propiedad.
          </p>
        </div>

        {/* Datos del inquilino */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-gray-900">Datos del Inquilino</legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700">
                Nombre Completo *
              </label>
              <input
                type="text"
                id="tenantName"
                name="tenantName"
                required
                value={form.tenantName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="tenantEmail" className="block text-sm font-medium text-gray-700">
                Correo Electrónico *
              </label>
              <input
                type="email"
                id="tenantEmail"
                name="tenantEmail"
                required
                value={form.tenantEmail}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="tenantPhone" className="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input
                type="tel"
                id="tenantPhone"
                name="tenantPhone"
                value={form.tenantPhone}
                onChange={handleChange}
                placeholder="+52 ..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="tenantWhatsapp" className="block text-sm font-medium text-gray-700">
                WhatsApp
              </label>
              <input
                type="tel"
                id="tenantWhatsapp"
                name="tenantWhatsapp"
                value={form.tenantWhatsapp}
                onChange={handleChange}
                placeholder="+52 ..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* Fechas */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-gray-900">Fechas</legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                required
                value={form.startDate}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                Fecha de Fin *
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                required
                value={form.endDate}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="reviewDate" className="block text-sm font-medium text-gray-700">
                Fecha de Revisión
              </label>
              <input
                type="date"
                id="reviewDate"
                name="reviewDate"
                value={form.reviewDate}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* Términos financieros */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-gray-900">Términos Financieros</legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="monthlyRent" className="block text-sm font-medium text-gray-700">
                Renta Mensual (MXN) *
              </label>
              <input
                type="number"
                id="monthlyRent"
                name="monthlyRent"
                required
                min="0"
                step="0.01"
                value={form.monthlyRent}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="annualIncrement" className="block text-sm font-medium text-gray-700">
                Incremento Anual (%)
              </label>
              <input
                type="number"
                id="annualIncrement"
                name="annualIncrement"
                min="0"
                max="100"
                step="0.1"
                value={form.annualIncrement}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700">
                Depósito (MXN) *
              </label>
              <input
                type="number"
                id="depositAmount"
                name="depositAmount"
                required
                min="0"
                step="0.01"
                value={form.depositAmount}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* Fiador */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-gray-900">Datos del Fiador</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fiadorName" className="block text-sm font-medium text-gray-700">
                Nombre completo del Fiador
              </label>
              <input
                type="text"
                id="fiadorName"
                name="fiadorName"
                value={form.fiadorName}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez López"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="fiadorProperty" className="block text-sm font-medium text-gray-700">
                Propiedad del Fiador (garantía)
              </label>
              <textarea
                id="fiadorProperty"
                name="fiadorProperty"
                rows={2}
                value={form.fiadorProperty}
                onChange={handleChange}
                placeholder="Ej: Terreno en Valle de Banderas, 575 m2, escritura #1234..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* Datos del inmueble para contrato */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-gray-900">Datos del Inmueble para Contrato</legend>
          <div>
            <label htmlFor="propertyInventory" className="block text-sm font-medium text-gray-700">
              Inventario / Características del inmueble
            </label>
            <textarea
              id="propertyInventory"
              name="propertyInventory"
              rows={3}
              value={form.propertyInventory}
              onChange={handleChange}
              placeholder="Ej: SALA-COMEDOR, COCINA INTEGRAL, 2 RECÁMARAS CON CLOSET, PATIO DE SERVICIO, 2 BAÑOS..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="maintenanceFee" className="block text-sm font-medium text-gray-700">
                Cuota de mantenimiento (MXN/mes)
              </label>
              <input
                type="number"
                id="maintenanceFee"
                name="maintenanceFee"
                min="0"
                step="0.01"
                value={form.maintenanceFee}
                onChange={handleChange}
                placeholder="300"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="propertyUse" className="block text-sm font-medium text-gray-700">
                Uso autorizado del inmueble
              </label>
              <input
                type="text"
                id="propertyUse"
                name="propertyUse"
                value={form.propertyUse}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* Datos de firma */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-gray-900">Datos de Firma</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="signingCity" className="block text-sm font-medium text-gray-700">
                Ciudad de firma
              </label>
              <input
                type="text"
                id="signingCity"
                name="signingCity"
                value={form.signingCity}
                onChange={handleChange}
                placeholder="Ej: Puerto Vallarta, Jalisco"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="signingTime" className="block text-sm font-medium text-gray-700">
                Hora de firma
              </label>
              <input
                type="text"
                id="signingTime"
                name="signingTime"
                value={form.signingTime}
                onChange={handleChange}
                placeholder="10:00"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* Notas */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notas
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Link
            href="/contracts"
            className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Crear Contrato'}
          </button>
        </div>
      </form>
    </div>
  );
}
