'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Zone {
  id: string;
  name: string;
}

const PROPERTY_TYPES = ['LOCAL', 'OFICINA', 'BODEGA', 'TERRENO', 'DEPARTAMENTO', 'CASA'];
const STATUSES = ['DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO', 'INACTIVO', 'CONVENIO CON PROPIETARIO'];

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    number: '',
    name: '',
    squareMeters: '',
    propertyType: '',
    zoneId: '',
    address: '',
    description: '',
    adminNotes: '',
    monthlyRent: '',
    status: '',
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [propertyRes, zonesRes] = await Promise.all([
          fetch(`/api/properties/${id}`),
          fetch('/api/zones'),
        ]);

        if (!propertyRes.ok) {
          toast.error('Propiedad no encontrada');
          router.push('/properties');
          return;
        }

        const property = await propertyRes.json();
        const zonesData = await zonesRes.json();

        setForm({
          number: property.number || '',
          name: property.name || '',
          squareMeters: property.squareMeters?.toString() || '',
          propertyType: property.propertyType || '',
          zoneId: property.zoneId || '',
          address: property.address || '',
          description: property.description || '',
          adminNotes: property.adminNotes || '',
          monthlyRent: property.monthlyRent?.toString() || '',
          status: property.status || '',
        });
        setZones(zonesData);
      } catch {
        toast.error('Error al cargar los datos');
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, [id, router]);

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

      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar la propiedad');
      }

      toast.success('Propiedad actualizada exitosamente');
      router.push(`/properties/${id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar la propiedad'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/properties" className="hover:text-blue-600 transition-colors">
            Propiedades
          </Link>
          <span>/</span>
          <Link href={`/properties/${id}`} className="hover:text-blue-600 transition-colors">
            {form.name || 'Detalle'}
          </Link>
          <span>/</span>
          <span className="text-gray-900">Editar</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Propiedad</h1>
        <p className="mt-1 text-sm text-gray-500">
          Modifica los datos de la propiedad.
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">Seleccionar zona...</option>
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
          />
        </div>

        {/* Admin Notes */}
        <div>
          <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-1">
            Notas del Administrador
          </label>
          <p className="text-xs text-gray-400 mb-1">Solo visible para administradores. Usa este campo para notas internas, observaciones o recordatorios.</p>
          <textarea
            id="adminNotes"
            name="adminNotes"
            rows={3}
            value={form.adminNotes}
            onChange={handleChange}
            placeholder="Ej: Pendiente revision de pintura, llave entregada a portero..."
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href={`/properties/${id}`}
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
              'Guardar Cambios'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
