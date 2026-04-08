'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Contract {
  id: string;
  propertyId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string | null;
  tenantWhatsapp: string | null;
  startDate: string;
  endDate: string;
  reviewDate: string | null;
  monthlyRent: number;
  annualIncrement: number;
  depositAmount: number;
  notes: string | null;
  status: string;
  property: {
    name: string;
    address: string;
  };
}

export default function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loadingContract, setLoadingContract] = useState(true);
  const [error, setError] = useState('');
  const [contract, setContract] = useState<Contract | null>(null);

  const [form, setForm] = useState({
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    tenantWhatsapp: '',
    startDate: '',
    endDate: '',
    reviewDate: '',
    monthlyRent: '',
    annualIncrement: '',
    depositAmount: '',
    notes: '',
    status: '',
  });

  useEffect(() => {
    async function loadContract() {
      try {
        const res = await fetch(`/api/contracts/${id}`);
        if (!res.ok) throw new Error('Error al cargar el contrato');

        const data: Contract = await res.json();
        setContract(data);

        setForm({
          tenantName: data.tenantName,
          tenantEmail: data.tenantEmail,
          tenantPhone: data.tenantPhone || '',
          tenantWhatsapp: data.tenantWhatsapp || '',
          startDate: data.startDate.split('T')[0],
          endDate: data.endDate.split('T')[0],
          reviewDate: data.reviewDate ? data.reviewDate.split('T')[0] : '',
          monthlyRent: String(data.monthlyRent),
          annualIncrement: String(data.annualIncrement),
          depositAmount: String(data.depositAmount),
          notes: data.notes || '',
          status: data.status,
        });
      } catch {
        setError('Error al cargar el contrato');
      } finally {
        setLoadingContract(false);
      }
    }
    loadContract();
  }, [id]);

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

      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar el contrato');
      }

      router.push(`/contracts/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que deseas eliminar este contrato? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar el contrato');
      router.push('/contracts');
    } catch {
      setError('Error al eliminar el contrato');
    }
  }

  if (loadingContract) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Cargando contrato...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-500">No se encontró el contrato.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/contracts/${id}`} className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Volver al Contrato
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Editar Contrato - {contract.property.name}
        </h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
        {/* Estado */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Estado
          </label>
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="active">Activo</option>
            <option value="expired">Vencido</option>
            <option value="pending_renewal">Pendiente de Renovación</option>
          </select>
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

        {/* Notas */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notas
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={form.notes}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Botones */}
        <div className="flex items-center justify-between border-t pt-4">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Eliminar Contrato
          </button>
          <div className="flex gap-3">
            <Link
              href={`/contracts/${id}`}
              className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
