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
    active: 'Activo',
    expired: 'Vencido',
    pending_renewal: 'Pendiente renovación',
    cancelled: 'Cancelado',
    available: 'Disponible',
    rented: 'Rentado',
    maintenance: 'Mantenimiento',
    owner_agreement: 'Convenio con propietario',
  }
  return labels[status] || status
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    pending_renewal: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-gray-100 text-gray-800',
    available: 'bg-blue-100 text-blue-800',
    rented: 'bg-green-100 text-green-800',
    maintenance: 'bg-orange-100 text-orange-800',
    owner_agreement: 'bg-purple-100 text-purple-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
