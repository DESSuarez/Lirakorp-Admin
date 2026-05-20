'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RenewContractForm({ contractId, propertyId }: { contractId: string; propertyId: string }) {
  const router = useRouter()
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!endDate) return
    setLoading(true)
    setError('')

    try {
      // Fetch current contract data
      const res = await fetch(`/api/contracts/${contractId}`)
      if (!res.ok) throw new Error('No se pudo obtener el contrato actual')
      const current = await res.json()

      // New start = old end + 1 day
      const oldEnd = new Date(current.endDate)
      const newStart = new Date(oldEnd)
      newStart.setDate(newStart.getDate() + 1)

      // Calculate new rent with increment
      const increment = current.annualIncrement || 0
      const newRent = Math.round(current.monthlyRent * (1 + increment / 100))

      // Create new contract with same data + new dates
      const createRes = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: current.propertyId,
          contractType: current.contractType || 'arrendamiento',
          hasGuarantor: current.hasGuarantor ?? true,
          tenantName: current.tenantName,
          tenantEmail: current.tenantEmail || '',
          tenantPhone: current.tenantPhone || '',
          tenantWhatsapp: current.tenantWhatsapp || '',
          startDate: newStart.toISOString().split('T')[0],
          endDate: endDate,
          monthlyRent: newRent,
          annualIncrement: increment,
          depositAmount: current.depositAmount || 0,
          fiadorName: current.fiadorName || 'Celso Suárez Gurrola',
          fiadorProperty: current.fiadorProperty || '',
          propertyInventory: current.propertyInventory || '',
          maintenanceFee: current.maintenanceFee || null,
          propertyUse: current.propertyUse || 'CASA HABITACION',
          signingCity: current.signingCity || '',
          signingTime: current.signingTime || '10:00',
          notes: `Renovacion del contrato anterior`,
        }),
      })

      if (!createRes.ok) {
        const data = await createRes.json()
        throw new Error(data.error || 'Error al crear el contrato')
      }

      // Mark old contract as expired
      await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'expired' }),
      })

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
        <p className="text-sm font-medium text-green-700">Contrato renovado</p>
        <p className="text-xs text-gray-500 mt-1">La pagina se actualizara automaticamente.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-gray-600">Ingresa la nueva fecha de vencimiento. Los datos del inquilino y renta se copian del contrato actual.</p>
      <div>
        <label htmlFor="renewEndDate" className="block text-sm font-medium text-gray-700 mb-1">
          Nueva fecha de fin
        </label>
        <input
          type="date"
          id="renewEndDate"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !endDate}
        className="flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Renovando...' : 'Renovar Contrato'}
      </button>
    </form>
  )
}
