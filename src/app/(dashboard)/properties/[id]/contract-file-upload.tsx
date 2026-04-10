'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface ContractFileUploadProps {
  contractId: string
  existingFileUrl?: string | null
  existingFileName?: string | null
}

export default function ContractFileUpload({ contractId, existingFileUrl, existingFileName }: ContractFileUploadProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF y Word')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe exceder 10MB')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/contracts/${contractId}/upload-file`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Contrato subido exitosamente')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar el archivo de contrato?')) return
    try {
      const res = await fetch(`/api/contracts/${contractId}/upload-file`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Archivo eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar archivo')
    }
  }

  function getFileIcon(name: string) {
    if (name.endsWith('.pdf')) return '📕'
    if (name.endsWith('.doc') || name.endsWith('.docx')) return '📘'
    return '📄'
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-gray-700 mb-2"></p>

      {existingFileUrl && existingFileName ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-2xl">{getFileIcon(existingFileName)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{existingFileName}</p>
            <p className="text-xs text-green-600">Archivo cargado</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <a
              href={existingFileUrl}
              target="_blank"
              className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Ver
            </a>
            <a
              href={existingFileUrl}
              download={existingFileName}
              className="px-3 py-1.5 text-xs font-medium bg-[#2663EB] text-white rounded-lg hover:bg-[#1d4fc2] transition-colors"
            >
              Descargar
            </a>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <label className={`flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">
              {uploading ? 'Subiendo...' : 'Subir contrato firmado'}
            </p>
            <p className="text-xs text-gray-400">PDF o Word, max 10MB</p>
          </div>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  )
}
