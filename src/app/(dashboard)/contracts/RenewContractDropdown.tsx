'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Contract {
  id: string
  tenantName: string
  status: string
  property: {
    name: string
    zone?: { name: string } | null
  }
}

export default function RenewContractDropdown({ contracts }: { contracts: Contract[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (contracts.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
      >
        Renovar Contrato
        <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg bg-white shadow-lg ring-1 ring-gray-200">
          <div className="p-2 border-b border-gray-100">
            <p className="text-xs text-gray-500 px-2 py-1">Selecciona el contrato a renovar:</p>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {contracts.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setOpen(false)
                  router.push(`/contracts/new?renewFrom=${c.id}`)
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{c.property.name}</p>
                <p className="text-xs text-gray-500">{c.tenantName} &middot; {c.property.zone?.name || ''}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
