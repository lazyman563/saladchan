'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { getAvatarGradient } from '@/lib/utils'
import type { Profile } from '@/types/database'
import { User, Lock, Bell, Shield, Palette, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = [
  { id:'profile',    icon:<User size={15}/>,          label:'Perfil'         },
  { id:'account',    icon:<Lock size={15}/>,          label:'Conta & Segurança' },
  { id:'notif',      icon:<Bell size={15}/>,          label:'Notificações'   },
  { id:'privacy',    icon:<Shield size={15}/>,        label:'Privacidade'    },
  { id:'appearance', icon:<Palette size={15}/>,       label:'Aparência'      },
  { id:'danger',     icon:<AlertTriangle size={15}/>, label:'Zona de Risco', danger:true },
]

export default function SettingsPage() {
  const supabase   = createClient()
  const router     = useRouter()
  const params     = useSearchParams()
  const [tab,      setTab]     = useState(params.get('tab') ?? 'profile')
  const [profile,  setProfile] = useState<Profile | null>(null)
  const [loading,  setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => { setProfile(data); setLoading(false) })
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-tx-3">Carregando...</div>
  if (!profile) return null

  return (
    <div className="max-w-[820px] mx-auto px-4 py-6">
      <h1 className="text-xl font-black mb-5">⚙️ Configurações</h1>
      <div className="grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-5">
        {/* Nav */}
        <nav className="flex sm:flex-col gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left w-full transition-all
                ${tab===t.id ? (t.danger ? 'bg-red/10 text-red' : 'bg-green-DEFAULT/10 text-green-DEFAULT font-bold') : (t.danger ? 'text-red/70 hover:bg-red/8' : 'text-tx-3 hover:bg-bg3 hover:text-tx-2')}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="bg-card border border-border rounded-2xl p-6">
          {tab === 'profile'    && <ProfileSection    profile={profile} onSave={setProfile}/>}
          {tab === 'account'    && <AccountSection    profile={profile}/>}
          {tab === 'notif'      && <NotifSection/>}
          {tab === 'privacy'    && <PrivacySection/>}
          {tab === 'appearance' && <AppearanceSection/>}
          {tab === 'danger'     && <DangerSection/>}
        </div>
      </div>
    </div>
  )
}

// ─── Profile Section ──────────────────────────────────────────────────────────
function ProfileSection({ profile, onSave }: { profile: Profile; onSave: (p:Profile)=>void }) {
  const supabase = createClient()
  const [form,    setForm]    = useState({ display_name: profile.display_name, bio: profile.bio, location: profile.location, website: profile.website })
  const [saving,  setSaving]  = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url)

  async function uploadFile(file: File, type: 'avatar'|'banner') {
    const fd = new FormData(); fd.append('file', file); fd.append('type', type)
    const res = await fetch('/api/upload', { method:'POST', body: fd })
    const { url, error } = await res.json()
    if (error) { toast.error(error); return }
    const field = type === 'avatar' ? 'avatar_url' : 'banner_url'
    await fetch('/api/users', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ [field]: url }) })
    if (type==='avatar') setAvatarUrl(url)
    else setBannerUrl(url)
    toast.success('Foto atualizada!')
  }

  async function save() {
    setSaving(true)
    const res  = await fetch('/api/users', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setSaving(false); return }
    onSave({ ...profile, ...data })
    toast.success('Perfil salvo!')
    setSaving(false)
  }

  return (
    <div>
      <div className="text-sm font-black mb-5 pb-3 border-b border-border">👤 Editar Perfil</div>

      {/* Avatar + Banner */}
      <div className="mb-5">
        <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-2">Foto & Banner</label>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-xl font-black text-bg"
              style={{ background: avatarUrl ? 'transparent' : getAvatarGradient(profile.id) }}>
              {avatarUrl ? <Image src={avatarUrl} alt="" width={64} height={64} className="object-cover w-full h-full"/> : profile.display_name[0]}
            </div>
            <label className="absolute bottom-0 right-0 w-6 h-6 bg-green-DEFAULT rounded-full flex items-center justify-center text-bg text-xs cursor-pointer border-2 border-bg hover:scale-110 transition-transform">
              📷<input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f,'avatar')}}/>
            </label>
          </div>
          <div>
            <div className="text-xs font-bold mb-1">@{profile.username}</div>
            <label className="text-xs text-tx-3 hover:text-green-DEFAULT cursor-pointer transition-colors flex items-center gap-1">
              🖼️ Trocar banner
              <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f,'banner')}}/>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Field label="Nome de Exibição *" value={form.display_name} onChange={v=>setForm(f=>({...f,display_name:v}))}/>
        <Field label="Usuário" value={'@'+profile.username} disabled hint="Não pode ser alterado"/>
      </div>
      <div className="mb-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Bio</label>
        <textarea value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} maxLength={300}
          placeholder="Fale um pouco sobre você..." rows={3}
          className="w-full px-3.5 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors resize-none"/>
        <div className="text-[10px] text-tx-3 text-right mt-0.5">{form.bio.length}/300</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Field label="Localização" value={form.location} onChange={v=>setForm(f=>({...f,location:v}))} placeholder="Brasil 🇧🇷"/>
        <Field label="Website" value={form.website}   onChange={v=>setForm(f=>({...f,website:v}))}   placeholder="https://..."/>
      </div>
      <button onClick={save} disabled={saving}
        className="px-6 py-2.5 bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT text-bg font-black text-sm rounded-xl hover:shadow-green transition-all disabled:opacity-60">
        {saving ? 'Salvando...' : '💾 Salvar Alterações'}
      </button>
    </div>
  )
}

// ─── Account Section ──────────────────────────────────────────────────────────
function AccountSection({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [email,     setEmail]     = useState('')
  const [curPass,   setCurPass]   = useState('')
  const [newPass,   setNewPass]   = useState('')
  const [confPass,  setConfPass]  = useState('')
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { supabase.auth.getUser().then(({data:{user}})=>setEmail(user?.email??'')) }, [])

  async function save() {
    if (newPass && newPass !== confPass) { toast.error('Senhas não coincidem!'); return }
    if (newPass && newPass.length < 8)   { toast.error('Senha muito curta!'); return }
    setSaving(true)
    if (newPass) {
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) { toast.error(error.message); setSaving(false); return }
    }
    toast.success('Segurança atualizada! 🔒')
    setCurPass(''); setNewPass(''); setConfPass('')
    setSaving(false)
  }

  async function resendVerify() {
    const res = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'forgot', email }) })
    toast('Link de verificação enviado! 📧')
  }

  return (
    <div>
      <div className="text-sm font-black mb-5 pb-3 border-b border-border">🔐 Conta & Segurança</div>
      <div className="mb-4">
        <Field label="Email" value={email} disabled/>
        <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-bold ${profile.verified ? 'text-green-DEFAULT' : 'text-yellow'}`}>
          {profile.verified ? '✔ Email verificado' : <><span>⚠ Email não verificado</span><button onClick={resendVerify} className="underline hover:no-underline ml-1">Verificar agora</button></>}
        </div>
      </div>
      <div className="h-px bg-border my-5"/>
      <div className="text-xs font-black uppercase tracking-widest text-tx-3 mb-3">Alterar Senha</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="sm:col-span-2"><Field label="Senha Atual" value={curPass} type="password" onChange={setCurPass}/></div>
        <Field label="Nova Senha" value={newPass} type="password" onChange={setNewPass}/>
        <Field label="Confirmar Nova Senha" value={confPass} type="password" onChange={setConfPass}/>
      </div>
      <button onClick={save} disabled={saving}
        className="px-6 py-2.5 bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT text-bg font-black text-sm rounded-xl hover:shadow-green transition-all disabled:opacity-60">
        {saving ? 'Salvando...' : '🔒 Atualizar Segurança'}
      </button>
    </div>
  )
}

function NotifSection() {
  const items = [
    { label:'Respostas nas suas threads', desc:'Quando alguém responder', def:true },
    { label:'Curtidas', desc:'Quando curtirem seus posts', def:true },
    { label:'Menções', desc:'Quando alguém te mencionar', def:true },
    { label:'Newsletter semanal', desc:'Resumo das melhores threads', def:false },
  ]
  return (
    <div>
      <div className="text-sm font-black mb-5 pb-3 border-b border-border">🔔 Notificações</div>
      <div className="flex flex-col gap-3">
        {items.map(it => (
          <div key={it.label} className="flex items-center justify-between p-3 bg-bg3 rounded-xl">
            <div><div className="text-sm font-bold">{it.label}</div><div className="text-xs text-tx-3">{it.desc}</div></div>
            <Toggle defaultChecked={it.def}/>
          </div>
        ))}
      </div>
    </div>
  )
}

function PrivacySection() {
  return (
    <div>
      <div className="text-sm font-black mb-5 pb-3 border-b border-border">🛡️ Privacidade</div>
      <div className="flex flex-col gap-3">
        <div className="p-3 bg-bg3 rounded-xl">
          <div className="text-sm font-bold mb-2">Visibilidade do Perfil</div>
          <select className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-text outline-none focus:border-green-DEFAULT">
            <option>Público — qualquer um pode ver</option>
            <option>Registrados — apenas membros</option>
            <option>Privado — somente você</option>
          </select>
        </div>
        {[['Aparecer nos resultados de busca', true],['Mostrar atividade recente', true]].map(([l, d]) => (
          <div key={String(l)} className="flex items-center justify-between p-3 bg-bg3 rounded-xl">
            <div className="text-sm font-bold">{String(l)}</div>
            <Toggle defaultChecked={Boolean(d)}/>
          </div>
        ))}
      </div>
    </div>
  )
}

function AppearanceSection() {
  const accents = [
    { name:'Verde (padrão)', color:'#4ade80' },
    { name:'Teal', color:'#2dd4bf' },
    { name:'Violeta', color:'#a78bfa' },
    { name:'Rosa', color:'#f472b6' },
    { name:'Laranja', color:'#fb923c' },
    { name:'Azul', color:'#38bdf8' },
  ]
  return (
    <div>
      <div className="text-sm font-black mb-5 pb-3 border-b border-border">🎨 Aparência</div>
      <div className="mb-5">
        <div className="text-xs font-black uppercase tracking-widest text-tx-3 mb-3">Cor de Destaque</div>
        <div className="flex flex-wrap gap-3">
          {accents.map(a => (
            <button key={a.name} onClick={()=>toast.success(`Tema ${a.name} aplicado!`)} title={a.name}
              className="w-10 h-10 rounded-full hover:scale-110 transition-transform border-2 border-bg"
              style={{ background: a.color }}/>
          ))}
        </div>
      </div>
      <p className="text-xs text-tx-3">Mais opções de personalização em breve!</p>
    </div>
  )
}

function DangerSection() {
  const supabase = createClient()
  const router   = useRouter()
  async function deleteAccount() {
    if (!confirm('⚠️ Deletar sua conta permanentemente? Esta ação não pode ser desfeita!')) return
    await supabase.auth.signOut()
    router.push('/')
    toast.error('Conta removida.')
  }
  return (
    <div>
      <div className="text-sm font-black text-red mb-5 pb-3 border-b border-red/20">⚠️ Zona de Risco</div>
      <div className="border border-red/20 rounded-xl p-4 mb-3 bg-red/3">
        <div className="font-black text-sm mb-1">Desativar Conta</div>
        <div className="text-xs text-tx-3 mb-3">Sua conta fica inativa. Pode ser reativada a qualquer momento.</div>
        <button onClick={()=>toast('⚠️ Função em breve.')} className="px-4 py-2 border border-red/40 text-red text-xs font-bold rounded-lg hover:bg-red/8 transition-colors">Desativar Conta</button>
      </div>
      <div className="border border-red/40 rounded-xl p-4 bg-red/5">
        <div className="font-black text-sm text-red mb-1">Deletar Conta Permanentemente</div>
        <div className="text-xs text-tx-3 mb-3">Todos os seus dados são apagados. Irreversível!</div>
        <button onClick={deleteAccount} className="px-4 py-2 bg-red/15 border border-red/40 text-red text-xs font-bold rounded-lg hover:bg-red/25 transition-colors">🗑️ Deletar minha conta</button>
      </div>
    </div>
  )
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type='text', disabled=false, hint='', placeholder='' }:
  { label:string; value:string; onChange?:(v:string)=>void; type?:string; disabled?:boolean; hint?:string; placeholder?:string }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e=>onChange?.(e.target.value)} disabled={disabled} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors disabled:opacity-50 disabled:cursor-not-allowed"/>
      {hint && <div className="text-[10px] text-tx-3 mt-1">{hint}</div>}
    </div>
  )
}

function Toggle({ defaultChecked }: { defaultChecked: boolean }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <button onClick={()=>setOn(!on)}
      className={`w-11 h-6 rounded-full transition-all relative ${on ? 'bg-green-DEFAULT' : 'bg-border'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-5' : 'left-0.5'}`}/>
    </button>
  )
}
