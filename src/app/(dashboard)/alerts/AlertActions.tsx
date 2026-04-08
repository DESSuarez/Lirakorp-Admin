'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AlertActions({ alertId }: { alertId?: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCheckAlerts() {
    setLoading(true)
    try {
      const res = await fetch('/api/alerts/check', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Verificacion completada. ${data.created} alerta(s) creada(s).`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al verificar alertas')
    } finally {
      setLoading(false)
    }
  }

  async function handleDismiss() {
    if (!alertId) return
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      })
      if (!res.ok) throw new Error('Error al descartar')
      toast.success('Alerta descartada')
      router.refresh()
    } catch {
      toast.error('Error al descartar alerta')
    }
  }

  if (alertId) {
    return (
      <button onClick={handleDismiss} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded-lg flex-shrink-0">
        Descartar
      </button>
    )
  }

  return (
    <button onClick={handleCheckAlerts} disabled={loading} className="btn-primary flex-shrink-0">
      {loading ? 'Verificando...' : 'Verificar Alertas'}
    </button>
  )
}
