'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Zone {
  id: string;
  name: string;
}

const PROPERTY_TYPES = ['LOCAL', 'OFICINA', 'BODEGA', 'TERRENO', 'DEPARTAMENTO', 'CASA'];
const STATUSES = ['DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO', 'INACTIVO'];

export default function NewPropertyPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);

  const [form, setForm] = useState({
    number: '',
    name: '',
    squareMeters: '',
    propertyType: '',
    zoneId: '',
    address: '',
    description: '',
    monthlyRent: '',
    status: 'DISPONIBLE',
  });

  useEffect(() => {
    async function fetchZones() {
      try {
        const res = await fetch('/api/zones');
        if (res.ok) {
          const data = await res.json();
          setZones(data);
        }
      } catch {
        toast.error('Error al cargar las zonas');
      } finally {
        setLoadingZones(false);
      }
    }
    fetchZones();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body = {
        ...form,
        squareMeters: parseFloat(form.squareMeters),
        monthlyRent: parseFloat(form.monthlyRent),
      };

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear la propiedad');
      }

      toast.success('Propiedad creada exitosamente');
      router.push('/properties');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al crear la propiedad'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/properties" className="hover:text-blue-600 transition-colors">
            Propiedades
          </Link>
          <span>/</span>
          <span className="text-gray-900">Nueva Propiedad</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Propiedad</h1>
        <p className="mt-1 text-sm text-gray-500">
          Completa los datos para registrar una nueva propiedad.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Number */}
          <div>
            <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
              N&uacute;mero <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="number"
              name="number"
              required
              value={form.number}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              placeholder="Ej: A-101"
            />
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              placeholder="Ej: Local Centro Norte"
            />
          </div>

          {/* Square Meters */}
          <div>
            <label htmlFor="squareMeters" className="block text-sm font-medium text-gray-700 mb-1">
              Metros Cuadrados (m&sup2;) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="squareMeters"
              name="squareMeters"
              required
              min="0"
              step="0.01"
              value={form.squareMeters}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              placeholder="Ej: 120.5"
            />
          </div>

          {/* Monthly Rent */}
          <div>
            <label htmlFor="monthlyRent" className="block text-sm font-medium text-gray-700 mb-1">
              Renta Mensual <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                id="monthlyRent"
                name="monthlyRent"
                required
                min="0"
                step="0.01"
                value={form.monthlyRent}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm pl-7"
                placeholder="Ej: 15000.00"
              />
            </div>
          </div>

          {/* Property Type */}
          <div>
            <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Propiedad <span className="text-red-500">*</span>
            </label>
            <select
              id="propertyType"
              name="propertyType"
              required
              value={form.propertyType}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">Seleccionar tipo...</option>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Zone */}
          <div>
            <label htmlFor="zoneId" className="block text-sm font-medium text-gray-700 mb-1">
              Zona <span className="text-red-500">*</span>
            </label>
            <select
              id="zoneId"
              name="zoneId"
              required
              value={form.zoneId}
              onChange={handleChange}
              disabled={loadingZones}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm disabled:bg-gray-100"
            >
              <option value="">
                {loadingZones ? 'Cargando zonas...' : 'Seleccionar zona...'}
              </option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              name="status"
              required
              value={form.status}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Direcci&oacute;n
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={form.address}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            placeholder="Ej: Av. Principal #123, Col. Centro"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripci&oacute;n
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            placeholder="Descripci&oacute;n detallada de la propiedad..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/properties"
            className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Guardando...
              </>
            ) : (
              'Crear Propiedad'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
