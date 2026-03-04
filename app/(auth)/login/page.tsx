'use client'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { Suspense } from 'react'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

const schema = z.object({
  identifier: z.string().min(1, 'Campo obrigatório'),
  password:   z.string().min(1, 'Campo obrigatório'),
})
type Form = z.infer<typeof schema>

function LoginPage() {
  const router      = useRouter()
  const params      = useSearchParams()
  const redirect    = params.get('redirect') ?? '/feed'
  const [loading, setLoading] = useState(false)
  const [forgot,  setForgot]  = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<any>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  async function onSubmit(data: Form) {
    setLoading(true)
    try {
      const res  = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'login', ...data, captchaToken }) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Bem-vindo de volta! 🥗')
      router.push(redirect)
      router.refresh()
    } finally { setLoading(false) }
  }

  async function sendForgot() {
    if (!forgotEmail) return
    await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'forgot', email: forgotEmail }) })
    toast.success('Se o email existir, você receberá o link!')
    setForgot(false)
  }

  async function oauth(provider: string) {
    const res  = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'oauth', provider }) })
    const json = await res.json()
    if (json.url) window.location.href = json.url
    else toast.error(json.error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT bg-clip-text text-transparent">SaladChan</h1>
          <p className="text-tx-3 text-sm mt-1">Bem-vindo de volta!</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-7 shadow-card">
          {/* Tabs */}
          <div className="flex gap-1 bg-bg3 rounded-xl p-1 mb-6">
            <Link href="/login" className="flex-1 py-2 rounded-lg text-sm font-bold text-center bg-card2 text-green-DEFAULT shadow">Entrar</Link>
            <Link href="/register" className="flex-1 py-2 rounded-lg text-sm font-bold text-center text-tx-3 hover:text-tx-2 transition-colors">Criar Conta</Link>
          </div>

          {!forgot ? (
            <>
              {/* OAuth */}
              <div className="flex flex-col gap-2.5 mb-5">
                {[
                  { p:'google',  icon:'🇬', label:'Continuar com Google'  },
                  { p:'github',  icon:'🐙', label:'Continuar com GitHub'  },
                  { p:'discord', icon:'🎮', label:'Continuar com Discord' },
                ].map(({ p, icon, label }) => (
                  <button key={p} onClick={() => oauth(p)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 bg-bg3 border border-border
                      rounded-lg text-sm font-bold text-tx-2 hover:border-green-DEFAULT hover:text-text transition-all">
                    <span className="text-lg">{icon}</span>{label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-5 text-tx-3 text-xs font-bold">
                <div className="flex-1 h-px bg-border"/><span>ou</span><div className="flex-1 h-px bg-border"/>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Usuário ou Email</label>
                  <input {...register('identifier')} placeholder="pepino_chan ou email@exemplo.com"
                    className="w-full px-3.5 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text
                      placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors"/>
                  {errors.identifier && <p className="text-red text-xs mt-1">{errors.identifier.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Senha</label>
                  <input {...register('password')} type="password" placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text
                      placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors"/>
                  {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
                </div>
                <HCaptcha sitekey="d7bc3e8e-a122-4f58-b716-fadaaaf61590" onVerify={setCaptchaToken} ref={captchaRef} theme="dark" />
                  <button type="submit" disabled={loading || !captchaToken}
                  className="w-full py-3 bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT text-bg
                    font-black rounded-lg text-sm hover:shadow-green transition-all disabled:opacity-60">
                  {loading ? '🌿 Entrando...' : '🌿 Entrar'}
                </button>
              </form>
              <button onClick={() => setForgot(true)} className="w-full text-center text-xs text-tx-3 hover:text-tx-2 mt-4 transition-colors">
                Esqueceu a senha?
              </button>
            </>
          ) : (
            <div>
              <h3 className="font-bold mb-1">Recuperar senha</h3>
              <p className="text-tx-3 text-sm mb-4">Informe seu email e enviaremos um link.</p>
              <input value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} type="email" placeholder="voce@email.com"
                className="w-full px-3.5 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text
                  placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors mb-3"/>
              <button onClick={sendForgot}
                className="w-full py-3 bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT text-bg font-black rounded-lg text-sm mb-3">
                Enviar link 📧
              </button>
              <button onClick={() => setForgot(false)} className="w-full text-center text-xs text-tx-3 hover:text-tx-2 transition-colors">
                ← Voltar
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-tx-3 text-xs mt-5">
          Não tem conta? <Link href="/register" className="text-green-DEFAULT hover:underline font-bold">Criar agora</Link>
        </p>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function LoginPageWrapper() {
  return <Suspense fallback={null}><LoginPage /></Suspense>
}
