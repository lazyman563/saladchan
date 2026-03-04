import { Suspense } from 'react'
import SettingsClient from './SettingsClient'

export default function SettingsPage() {
  return <Suspense fallback={<div className="flex items-center justify-center h-64 text-[#567856]">Carregando...</div>}><SettingsClient /></Suspense>
}

export const dynamic = 'force-dynamic'
