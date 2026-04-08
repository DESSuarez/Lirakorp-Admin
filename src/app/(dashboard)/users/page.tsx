import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatShortDate } from '@/lib/utils'
import UserActions from './UserActions'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'admin') redirect('/dashboard')

  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona los accesos al sistema</p>
        </div>
      </div>

      <UserActions users={users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt.toISOString() }))} />
    </div>
  )
}
