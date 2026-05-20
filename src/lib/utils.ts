import { differenceInDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es })
}

export function formatShortDate(date: Date | string) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy')
}

export function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0)
}

export function daysUntil(date: Date | string) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return differenceInDays(d, new Date())
}

export function getAlertLevel(daysRemaining: number): 'danger' | 'warning' | 'info' {
  if (daysRemaining <= 15) return 'danger'
  if (daysRemaining <= 30) return 'warning'
  return 'info'
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    // Contract statuses
    active: 'Activo',
    expired: 'Vencido',
    pending_renewal: 'Pendiente',
    cancelled: 'Cancelado',
    // Property statuses
    available: 'Disponible',
    rented: 'Rentado',
    maintenance: 'Mantenimiento',
    inactive: 'Inactivo',
    // Legacy (imported data may have these)
    DISPONIBLE: 'Disponible',
    OCUPADO: 'Rentado',
    MANTENIMIENTO: 'Mantenimiento',
    INACTIVO: 'Inactivo',
  }
  return labels[status] || status
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    // Contract statuses
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    pending_renewal: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-gray-100 text-gray-800',
    // Property statuses
    available: 'bg-blue-100 text-blue-800',
    rented: 'bg-green-100 text-green-800',
    maintenance: 'bg-orange-100 text-orange-800',
    inactive: 'bg-gray-100 text-gray-600',
    // Legacy
    DISPONIBLE: 'bg-blue-100 text-blue-800',
    OCUPADO: 'bg-green-100 text-green-800',
    MANTENIMIENTO: 'bg-orange-100 text-orange-800',
    INACTIVO: 'bg-gray-100 text-gray-600',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
