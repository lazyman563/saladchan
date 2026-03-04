'use client'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

const schema = z.object({
  username:    z.string().min(3,'Mínimo 3 caracteres').max(20).regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
  displayName: z.string().min(1,'Obrigatório').max(50),
  email:       z.string().email('Email inválido'),
  password:    z.string().min(8,'Mínimo 8 caracteres'),
  confirm:     z.string(),
  terms:       z.boolean().refine(v=>v, 'Aceite os termos'),
}).refine(d=>d.password===d.confirm, { message:'Senhas não coincidem', path:['confirm'] })

type Form = z.infer<typeof schema>

export default function RegisterPage() {
  const router  = useRouter()
  const [step,    setStep]    = useState<'form'|'verify'>('form')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<any>(null)
  const [userEmail, setUserEmail] = useState('')
  const [otp,      setOtp]    = useState('')
  const [otpErr,   setOtpErr] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  async function onSubmit(data: Form) {
    setLoading(true)
    try {
      const res  = await fetch('/api/auth', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action:'register', captchaToken, username:data.username, displayName:data.displayName, email:data.email, password:data.password }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      setUserEmail(data.email)
      window.location.href = '/feed'
      toast.success('Código enviado para ' + data.email + '! 📧')
    } finally { setLoading(false) }
  }

  async function verifyOtp() {
    if (otp.length !== 6) { setOtpErr('O código deve ter 6 dígitos.'); return }
    setLoading(true)
    setOtpErr('')
    try {
      const res  = await fetch('/api/auth', {
        method: 'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'verify', email: userEmail, token: otp }),
      })
      const json = await res.json()
      if (!res.ok) { setOtpErr(json.error); return }
      toast.success('Email verificado! Bem-vindo ao SaladChan 🥗')
      router.push('/feed')
      router.refresh()
    } finally { setLoading(false) }
  }

  async function oauth(provider: string) {
    const res  = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'oauth', provider }) })
    const json = await res.json()
    if (json.url) window.location.href = json.url
    else toast.error(json.error)
  }

  if (step === 'verify') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] text-center">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-black mb-2">Verifique seu Email</h2>
        <p className="text-tx-2 text-sm mb-6 leading-relaxed">
          Enviamos um código de 6 dígitos para<br/>
          <strong className="text-green-DEFAULT">{userEmail}</strong>
        </p>
        <div className="bg-card border border-border rounded-2xl p-7">
          <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-3">Código de Verificação</label>
          <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
            placeholder="000000" maxLength={6}
            className="w-full text-center text-3xl font-black font-mono tracking-[.5rem] py-4 px-3
              bg-bg3 border border-border rounded-xl outline-none focus:border-green-DEFAULT
              transition-colors text-text mb-1"/>
          {otpErr && <p className="text-red text-xs mb-3">{otpErr}</p>}
          <button onClick={verifyOtp} disabled={loading || otp.length !== 6}
            className="w-full py-3 mt-3 bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT
              text-bg font-black rounded-xl text-sm hover:shadow-green transition-all disabled:opacity-60">
            {loading ? 'Verificando...' : '✅ Verificar Conta'}
          </button>
          <button onClick={async()=>{
            await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'forgot',email:userEmail})})
            toast('Novo código enviado! 📧')
          }} className="text-xs text-tx-3 hover:text-tx-2 mt-4 block text-center transition-colors">
            Não recebeu? Reenviar código
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[460px]">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT bg-clip-text text-transparent">SaladChan</h1>
          <p className="text-tx-3 text-sm mt-1">Crie sua conta gratuita</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-7 shadow-card">
          <div className="flex gap-1 bg-bg3 rounded-xl p-1 mb-6">
            <Link href="/login" className="flex-1 py-2 rounded-lg text-sm font-bold text-center text-tx-3 hover:text-tx-2 transition-colors">Entrar</Link>
            <Link href="/register" className="flex-1 py-2 rounded-lg text-sm font-bold text-center bg-card2 text-green-DEFAULT shadow">Criar Conta</Link>
          </div>

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

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Usuário *</label>
                <input {...register('username')} placeholder="pepino_chan"
                  className="w-full px-3 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors"/>
                {errors.username && <p className="text-red text-xs mt-1">{errors.username.message}</p>}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Nome de Exibição *</label>
                <input {...register('displayName')} placeholder="Pepino 🥒"
                  className="w-full px-3 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors"/>
                {errors.displayName && <p className="text-red text-xs mt-1">{errors.displayName.message}</p>}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Email *</label>
              <input {...register('email')} type="email" placeholder="voce@email.com"
                className="w-full px-3 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors"/>
              {errors.email && <p className="text-red text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Senha *</label>
                <input {...register('password')} type="password" placeholder="mín. 8 caracteres"
                  className="w-full px-3 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors"/>
                {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Confirmar *</label>
                <input {...register('confirm')} type="password" placeholder="repita"
                  className="w-full px-3 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors"/>
                {errors.confirm && <p className="text-red text-xs mt-1">{errors.confirm.message}</p>}
              </div>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer mt-1">
              <input {...register('terms')} type="checkbox" className="mt-0.5 accent-green-DEFAULT"/>
              <span className="text-xs text-tx-3 leading-relaxed">
                Concordo com as <Link href="/rules" className="text-green-DEFAULT hover:underline">Regras</Link> e{' '}
                <Link href="/terms" className="text-green-DEFAULT hover:underline">Termos de Uso</Link> do SaladChan
              </span>
            </label>
            {errors.terms && <p className="text-red text-xs">{errors.terms.message}</p>}
            <HCaptcha sitekey="d7bc3e8e-a122-4f58-b716-fadaaaf61590" onVerify={setCaptchaToken} ref={captchaRef} theme="dark" />
                  <button type="submit" disabled={loading || !captchaToken}
              className="w-full py-3 bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT text-bg
                font-black rounded-lg text-sm hover:shadow-green transition-all disabled:opacity-60 mt-1">
              {loading ? '🌿 Criando conta...' : '🥗 Criar Conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-tx-3 text-xs mt-5">
          Já tem conta? <Link href="/login" className="text-green-DEFAULT hover:underline font-bold">Entrar</Link>
        </p>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
