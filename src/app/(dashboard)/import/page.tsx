'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any[] | null>(null)
  const [result, setResult] = useState<any>(null)

  async function handlePreview() {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('action', 'preview')

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreview(data.rows)
      toast.success(`${data.rows.length} registros encontrados`)
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar archivo')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('action', 'import')

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      toast.success(`${data.imported} propiedades importadas exitosamente`)
    } catch (err: any) {
      toast.error(err.message || 'Error al importar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar / Exportar Excel</h1>
        <p className="text-gray-500 text-sm mt-1">Importa nuevas propiedades o descarga el inventario actual</p>
      </div>

      {/* Export Section */}
      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] divide-y md:divide-y-0 md:divide-x divide-gray-200">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
                <span className="text-lg">📤</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Exportar inventario</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Descarga un Excel con todas las propiedades, contratos activos e informacion de inquilinos.
            </p>
            <a
              href="/api/export"
              className="btn-success inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Descargar Excel
            </a>
          </div>

          <div className="hidden md:flex items-center justify-center px-2">
            <div className="w-px h-8 bg-gray-300" />
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <span className="text-lg">📥</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Importar propiedades</h2>
            </div>
            <p className="text-sm text-gray-500 mb-1">
              Sube un archivo Excel para agregar nuevas propiedades. Las existentes se actualizan, no se duplican.
            </p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Solo se añaden nuevos registros, los existentes no se borran
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Formato esperado del Excel</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-header">Columna</th>
                <th className="table-header">Descripción</th>
                <th className="table-header">Ejemplo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                ['Número', 'Identificador de la propiedad', 'PV-001'],
                ['Nombre', 'Nombre de la propiedad', 'Casa Vista al Mar'],
                ['M2', 'Metros cuadrados', '120'],
                ['Tipo', 'Tipo de propiedad', 'casa, departamento, bodega, local'],
                ['Zona', 'Zona geográfica', 'Puerto Vallarta'],
                ['Dirección', 'Dirección completa', 'Av. México 123'],
                ['Inicio Contrato', 'Fecha inicio (dd/mm/aaaa)', '01/01/2025'],
                ['Fin Contrato', 'Fecha terminación', '31/12/2025'],
                ['Revisión', 'Fecha revisión incrementos', '01/07/2025'],
                ['Renta', 'Importe mensual de renta', '15000'],
                ['Inquilino', 'Nombre del arrendatario', 'Juan Pérez'],
                ['Email', 'Correo del inquilino', 'juan@correo.com'],
                ['Teléfono', 'Teléfono de contacto', '3331234567'],
                ['WhatsApp', 'Número WhatsApp', '+523331234567'],
                ['Incremento', 'Porcentaje incremento anual', '5'],
                ['Depósito', 'Monto de depósito', '30000'],
              ].map(([col, desc, example]) => (
                <tr key={col}>
                  <td className="table-cell font-medium">{col}</td>
                  <td className="table-cell text-gray-500">{desc}</td>
                  <td className="table-cell font-mono text-xs">{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Cargar Archivo</h2>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null)
                setPreview(null)
                setResult(null)
              }}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-4xl mb-2">📁</div>
              <p className="text-gray-600">
                {file ? file.name : 'Haz clic para seleccionar archivo Excel'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Formatos: .xlsx, .xls, .csv</p>
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={handlePreview} disabled={!file || loading} className="btn-secondary">
              {loading && !preview ? 'Procesando...' : 'Vista Previa'}
            </button>
            <button onClick={handleImport} disabled={!file || loading} className="btn-primary">
              {loading && preview ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Vista Previa ({preview.length} registros)</h2>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="table-header">#</th>
                  <th className="table-header">Número</th>
                  <th className="table-header">Nombre</th>
                  <th className="table-header">Zona</th>
                  <th className="table-header">Tipo</th>
                  <th className="table-header">M2</th>
                  <th className="table-header">Renta</th>
                  <th className="table-header">Inquilino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="table-cell">{i + 1}</td>
                    <td className="table-cell font-mono">{row.number}</td>
                    <td className="table-cell">{row.name}</td>
                    <td className="table-cell">{row.zone}</td>
                    <td className="table-cell">{row.type}</td>
                    <td className="table-cell">{row.m2}</td>
                    <td className="table-cell">${row.rent?.toLocaleString()}</td>
                    <td className="table-cell">{row.tenant || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="card bg-green-50 border-green-200">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Importación Exitosa</h2>
          <div className="space-y-1 text-sm text-green-700">
            <p>Propiedades importadas: <strong>{result.imported}</strong></p>
            <p>Contratos creados: <strong>{result.contracts}</strong></p>
            <p>Zonas creadas: <strong>{result.zones}</strong></p>
            {result.errors?.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-medium text-yellow-800">Advertencias:</p>
                {result.errors.map((err: string, i: number) => (
                  <p key={i} className="text-yellow-700 text-xs">{err}</p>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => router.push('/properties')} className="btn-primary mt-4">
            Ver Propiedades
          </button>
        </div>
      )}
    </div>
  )
}
