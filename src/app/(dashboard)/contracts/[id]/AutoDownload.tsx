'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AutoDownload({ contractId }: { contractId: string }) {
  const searchParams = useSearchParams()
  const isNew = searchParams.get('new') === '1'
  const triggered = useRef(false)

  useEffect(() => {
    if (!isNew || triggered.current) return
    triggered.current = true

    // Descargar PDF
    const pdfLink = document.createElement('a')
    pdfLink.href = `/api/contracts/${contractId}/generate-pdf`
    pdfLink.target = '_blank'
    pdfLink.click()

    // Descargar DOCX con pequeño delay para evitar que el browser bloquee la segunda descarga
    setTimeout(() => {
      const docxLink = document.createElement('a')
      docxLink.href = `/api/contracts/${contractId}/generate-docx`
      docxLink.click()
    }, 1000)
  }, [isNew, contractId])

  if (!isNew) return null

  return (
    <div className="rounded-lg bg-green-50 border border-green-200 p-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 text-green-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-green-800">Contrato creado exitosamente</p>
          <p className="text-xs text-green-600 mt-0.5">Se estan descargando los archivos PDF y Word automaticamente. Sube el contrato firmado para activarlo.</p>
        </div>
      </div>
    </div>
  )
}
