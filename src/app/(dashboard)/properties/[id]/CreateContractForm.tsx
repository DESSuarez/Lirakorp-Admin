'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateContractForm({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  const [tenantName, setTenantName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantName || !startDate || !endDate || !monthlyRent) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          contractType: 'arrendamiento',
          hasGuarantor: true,
          tenantName,
          tenantEmail: '',
          startDate,
          endDate,
          monthlyRent: parseFloat(monthlyRent),
          annualIncrement: 0,
          depositAmount: 0,
          fiadorName: 'Celso Suárez Gurrola',
          propertyUse: 'CASA HABITACION',
          notes: '',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear el contrato')
      }

      setSuccess(true)
      setTimeout(() => router.refresh(), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-3">
        <div className="text-2xl mb-1">&#10003;</div>
        <p className="text-sm font-medium text-green-700">Contrato creado</p>
        <p className="text-xs text-gray-500 mt-1">La pagina se actualizara automaticamente.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-gray-600">Ingresa los datos basicos del nuevo contrato.</p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del inquilino</label>
        <input
          type="text"
          value={tenantName}
          onChange={(e) => setTenantName(e.target.value)}
          required
          placeholder="Nombre completo"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Renta mensual (MXN)</label>
        <input
          type="number"
          value={monthlyRent}
          onChange={(e) => setMonthlyRent(e.target.value)}
          required
          min="0"
          step="0.01"
          placeholder="15000"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !tenantName || !startDate || !endDate || !monthlyRent}
        className="flex w-full items-center justify-center rounded-lg bg-[#2663EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4fc2] transition-colors disabled:opacity-50"
      >
        {loading ? 'Creando...' : 'Crear Contrato'}
      </button>
    </form>
  )
}
