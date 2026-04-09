'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Correo o contrasena incorrectos')
      setLoading(false)
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-center mb-6">Iniciar Sesion</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Correo electronico</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="correo@ejemplo.com" required />
        </div>
        <div>
          <label className="label">Contrasena</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" required />
        </div>
        {error && <div className="bg-danger-50 text-danger-600 px-4 py-2 rounded-lg text-sm">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #2B2B2B 0%, #141414 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">LIRAKORP</h1>
          <p className="text-gray-400 mt-2">Sistema de Gestion de Propiedades para LIRAKORP</p>
        </div>
        <Suspense fallback={<div className="card text-center p-8">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
