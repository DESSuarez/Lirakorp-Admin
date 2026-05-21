'use client'

import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function DeletePropertyButton({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`¿Eliminar la propiedad "${propertyName}"? Esta acción no se puede deshacer.`)) return

    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar')
      }
      toast.success('Propiedad eliminada')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar propiedad')
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-red-400 hover:text-red-600 transition-colors ml-2"
      title="Eliminar propiedad"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}
