'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface ContractInfo {
  tenantName: string
  propertyName: string
  propertyAddress: string
  zoneName: string
  startDate: string
  endDate: string
  monthlyRent: number
  renewalResponse: string | null
  renewalRespondedAt: string | null
  status: string
}

export default function RenewalPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string

  const [contract, setContract] = useState<ContractInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [responseMessage, setResponseMessage] = useState('')

  useEffect(() => {
    fetchContract()
  }, [token])

  // Auto-submit si viene con ?response=wants_renewal o ?response=no_renewal desde el email
  useEffect(() => {
    const autoResponse = searchParams.get('response')
    if (autoResponse && contract && !contract.renewalResponse && !submitted) {
      handleSubmit(autoResponse)
    }
  }, [contract, searchParams])

  async function fetchContract() {
    try {
      const res = await fetch(`/api/renewal/${token}`)
      if (!res.ok) {
        setError('Enlace inválido o contrato no encontrado.')
        return
      }
      const data = await res.json()
      setContract(data)
    } catch {
      setError('Error al cargar la información.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(response: string) {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/renewal/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitted(true)
        setResponseMessage(data.message)
        setContract((prev) => prev ? { ...prev, renewalResponse: response } : prev)
      } else {
        setError(data.error || 'Error al registrar respuesta.')
        if (data.response) {
          setContract((prev) => prev ? { ...prev, renewalResponse: data.response } : prev)
        }
      }
    } catch {
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  const formatCurrency = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error && !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">&#10060;</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace no v&aacute;lido</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!contract) return null

  // Ya respondió previamente
  if (contract.renewalResponse && !submitted) {
    const isRenewal = contract.renewalResponse === 'wants_renewal'
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
          <div className="text-5xl mb-4">{isRenewal ? '\u2705' : '\u274C'}</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Respuesta ya registrada</h1>
          <p className="text-gray-600 mb-4">
            {isRenewal
              ? 'Ya indicaste que deseas renovar tu contrato. El administrador se pondrá en contacto contigo.'
              : 'Ya indicaste que no deseas renovar tu contrato. Gracias por tu tiempo.'}
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left text-sm">
            <p><span className="text-gray-500">Propiedad:</span> <strong>{contract.propertyName}</strong></p>
            <p><span className="text-gray-500">Vencimiento:</span> <strong>{formatDate(contract.endDate)}</strong></p>
          </div>
        </div>
      </div>
    )
  }

  // Respuesta enviada en esta sesión
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
          <div className="text-5xl mb-4">{contract.renewalResponse === 'wants_renewal' ? '\u2705' : '\uD83D\uDC4B'}</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Respuesta registrada</h1>
          <p className="text-gray-600">{responseMessage}</p>
        </div>
      </div>
    )
  }

  // Formulario de decisión
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-700 text-white p-6">
          <h1 className="text-xl font-bold">Renovaci&oacute;n de Contrato</h1>
          <p className="text-blue-200 text-sm mt-1">LIRAKORP - Administraci&oacute;n de Propiedades</p>
        </div>

        {/* Info */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Estimado/a <strong>{contract.tenantName}</strong>, se acerca la fecha de renovaci&oacute;n
            de su contrato de arrendamiento. El administrador del inmueble se pondr&aacute; en contacto
            con usted.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Propiedad</span>
              <span className="font-semibold text-sm">{contract.propertyName}</span>
            </div>
            {contract.propertyAddress && (
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Direcci&oacute;n</span>
                <span className="text-sm">{contract.propertyAddress}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Zona</span>
              <span className="text-sm">{contract.zoneName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Renta mensual</span>
              <span className="font-semibold text-sm">{formatCurrency(contract.monthlyRent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Vigencia</span>
              <span className="text-sm">{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</span>
            </div>
          </div>

          <p className="text-gray-700 font-medium mb-4">Por favor ind&iacute;quenos su decisi&oacute;n:</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => handleSubmit('wants_renewal')}
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 text-lg"
            >
              {submitting ? 'Enviando...' : 'Quiero renovar contrato'}
            </button>
            <button
              onClick={() => handleSubmit('no_renewal')}
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 text-lg"
            >
              {submitting ? 'Enviando...' : 'No quiero renovar contrato'}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-4 text-center">
          <p className="text-gray-400 text-xs">LIRAKORP - Administraci&oacute;n de Propiedades</p>
        </div>
      </div>
    </div>
  )
}
