'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  name: string
  content: string
  year: number
  zoneId: string | null
  zoneName: string | null
  contractType: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Zone {
  id: string
  name: string
}

const CONTRACT_TYPES = [
  { value: 'arrendamiento', label: 'Arrendamiento' },
  { value: 'comodato', label: 'Comodato' },
  { value: 'temporal', label: 'Temporal / Vacacional' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'bodega', label: 'Bodega / Almacen' },
]

export default function TemplateEditor({ templates, zones }: { templates: Template[]; zones: Zone[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', content: '', year: new Date().getFullYear(), zoneId: '', contractType: 'arrendamiento' })
  const [editForm, setEditForm] = useState({ name: '', content: '', year: 0, zoneId: '', contractType: '' })
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, zoneId: form.zoneId || null }),
      })
      if (!res.ok) throw new Error('Error al crear plantilla')
      toast.success('Plantilla creada')
      setCreating(false)
      setForm({ name: '', content: '', year: new Date().getFullYear(), zoneId: '', contractType: 'arrendamiento' })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, zoneId: editForm.zoneId || null }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      toast.success('Plantilla actualizada')
      setEditing(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(template: Template) {
    setEditing(template.id)
    setEditForm({ name: template.name, content: template.content, year: template.year, zoneId: template.zoneId || '', contractType: template.contractType })
  }

  function getTypeLabel(value: string) {
    return CONTRACT_TYPES.find(t => t.value === value)?.label || value
  }

  // Group templates by type
  const grouped = CONTRACT_TYPES.map(type => ({
    ...type,
    templates: templates.filter(t => t.contractType === type.value),
  })).filter(g => g.templates.length > 0)

  const ungrouped = templates.filter(t => !CONTRACT_TYPES.some(ct => ct.value === t.contractType))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setCreating(!creating)} className="btn-primary">
          {creating ? 'Cancelar' : 'Nueva Plantilla'}
        </button>
      </div>

      {creating && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Nueva Plantilla</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="label">Nombre</label>
                <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Tipo de contrato</label>
                <select className="input" value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
                  {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Zona / Inmueble</label>
                <select className="input" value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}>
                  <option value="">General (todas las zonas)</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Ano</label>
                <input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} required />
              </div>
            </div>
            <div>
              <label className="label">Contenido de la plantilla</label>
              <textarea className="input h-64 font-mono text-sm" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creando...' : 'Crear Plantilla'}
            </button>
          </form>
        </div>
      )}

      {/* Grouped by type */}
      {grouped.map(group => (
        <div key={group.value} className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">{group.label}</h2>
          {group.templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              editing={editing}
              editForm={editForm}
              setEditForm={setEditForm}
              loading={loading}
              zones={zones}
              onStartEdit={startEdit}
              onUpdate={handleUpdate}
              onCancel={() => setEditing(null)}
              getTypeLabel={getTypeLabel}
            />
          ))}
        </div>
      ))}

      {ungrouped.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          editing={editing}
          editForm={editForm}
          setEditForm={setEditForm}
          loading={loading}
          zones={zones}
          onStartEdit={startEdit}
          onUpdate={handleUpdate}
          onCancel={() => setEditing(null)}
          getTypeLabel={getTypeLabel}
        />
      ))}
    </div>
  )
}

function TemplateCard({ template, editing, editForm, setEditForm, loading, zones, onStartEdit, onUpdate, onCancel, getTypeLabel }: any) {
  if (editing === template.id) {
    return (
      <div className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Nombre</label>
            <input type="text" className="input" value={editForm.name} onChange={(e: any) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={editForm.contractType} onChange={(e: any) => setEditForm({ ...editForm, contractType: e.target.value })}>
              {[
                { value: 'arrendamiento', label: 'Arrendamiento' },
                { value: 'comodato', label: 'Comodato' },
                { value: 'temporal', label: 'Temporal / Vacacional' },
                { value: 'comercial', label: 'Comercial' },
                { value: 'bodega', label: 'Bodega / Almacen' },
              ].map((t: any) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Zona</label>
            <select className="input" value={editForm.zoneId} onChange={(e: any) => setEditForm({ ...editForm, zoneId: e.target.value })}>
              <option value="">General (todas)</option>
              {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ano</label>
            <input type="number" className="input" value={editForm.year} onChange={(e: any) => setEditForm({ ...editForm, year: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className="label">Contenido</label>
          <textarea className="input h-64 font-mono text-sm" value={editForm.content} onChange={(e: any) => setEditForm({ ...editForm, content: e.target.value })} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => onUpdate(template.id)} disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={onCancel} className="btn-secondary">Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{template.name}</h3>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="badge bg-blue-100 text-blue-700">{getTypeLabel(template.contractType)}</span>
            <span className="badge bg-gray-100 text-gray-600">
              {template.zoneName || 'General (todas las zonas)'}
            </span>
            <span className="badge bg-gray-100 text-gray-500">{template.year}</span>
            {template.isActive && <span className="badge bg-green-100 text-green-700">Activa</span>}
          </div>
        </div>
        <button onClick={() => onStartEdit(template)} className="btn-secondary text-sm">
          Editar
        </button>
      </div>
      <pre className="mt-3 p-4 bg-gray-50 rounded-lg text-xs overflow-x-auto max-h-48">
        {template.content}
      </pre>
    </div>
  )
}
