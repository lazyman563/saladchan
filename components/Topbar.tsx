'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAvatarGradient } from '@/lib/utils'
import type { Profile, Notification } from '@/types/database'
import { Bell, LogOut, Settings, User, LayoutDashboard, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const BOARDS = [
  { id:'geral',      label:'/geral/',  color:'text-green-400  hover:bg-green-400/10  border-transparent hover:border-green-400'  },
  { id:'tecnologia', label:'/tec/',    color:'text-teal-400   hover:bg-teal-400/10   border-transparent hover:border-teal-400'   },
  { id:'arte',       label:'/arte/',   color:'text-violet-400 hover:bg-violet-400/10 border-transparent hover:border-violet-400' },
  { id:'humor',      label:'/hum/',    color:'text-pink-400   hover:bg-pink-400/10   border-transparent hover:border-pink-400'   },
  { id:'jogos',      label:'/jog/',    color:'text-orange-400 hover:bg-orange-400/10 border-transparent hover:border-orange-400' },
  { id:'musica',     label:'/mus/',    color:'text-sky-400    hover:bg-sky-400/10    border-transparent hover:border-sky-400'    },
]

export default function Topbar() {
  const supabase   = createClient()
  const db         = supabase as any
  const router     = useRouter()
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [notifs,   setNotifs]   = useState<Notification[]>([])
  const [showDD,   setShowDD]   = useState(false)
  const [showBell, setShowBell] = useState(false)
  const ddRef   = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      db.from('profiles').select('*').eq('id', user.id).single().then(({ data }: any) => setProfile(data))
      db.from('notifications').select('*').eq('user_id', user.id).eq('read', false)
        .order('created_at', { ascending: false }).limit(10)
        .then(({ data }: any) => setNotifs(data ?? []))
    })

    const ch = supabase.channel('notifs').on(
      'postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload: any) => {
        setNotifs(prev => [payload.new as Notification, ...prev])
        toast('🔔 ' + (payload.new as Notification).title)
      }
    ).subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setShowDD(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    router.push('/')
    router.refresh()
  }

  async function markAllRead() {
    if (!profile) return
    await db.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
    setNotifs([])
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'mod'

  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-4 bg-[#0b150b]/90 backdrop-blur-md border-b border-[#253d25] shadow-[0_1px_20px_rgba(74,222,128,0.08)]">
      <Link href="/feed" className="flex items-center gap-2 no-underline">
        <span className="text-2xl">🥗</span>
        <span className="text-xl font-black bg-gradient-to-r from-green-400 via-teal-400 to-lime-400 bg-clip-text text-transparent">SaladChan</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-400/10 border border-green-400/30 px-2 py-0.5 rounded-full">1.0</span>
      </Link>

      <nav className="hidden md:flex items-center gap-0.5">
        {BOARDS.map(b => (
          <Link key={b.id} href={`/feed?board=${b.id}`}
            className={`text-[11px] font-bold font-mono px-3 py-1 rounded-full border transition-all duration-150 ${b.color}`}>
            {b.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {profile ? (
          <>
            <div className="relative" ref={bellRef}>
              <button onClick={() => setShowBell(!showBell)}
                className="relative w-9 h-9 rounded-full bg-[#172617] border border-[#253d25] flex items-center justify-center text-[#9dbb9d] hover:border-green-400 hover:text-green-400 transition-all">
                <Bell size={16} />
                {notifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {notifs.length > 9 ? '9+' : notifs.length}
                  </span>
                )}
              </button>
              {showBell && (
                <div className="absolute right-0 top-11 w-80 bg-[#172617] border border-[#253d25] rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#253d25]">
                    <span className="text-sm font-bold">Notificações</span>
                    {notifs.length > 0 && <button onClick={markAllRead} className="text-[11px] text-green-400 hover:underline">Marcar todas como lidas</button>}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifs.length === 0
                      ? <div className="py-8 text-center text-[#567856] text-sm">Nenhuma notificação</div>
                      : notifs.map((n: any) => (
                        <Link key={n.id} href={n.link || '/feed'} className="flex gap-3 px-4 py-3 hover:bg-[#0f1c0f] border-b border-[#1e321e] transition-colors">
                          <span className="text-lg mt-0.5">{n.type==='reply'?'💬':n.type==='like'?'❤️':'🔔'}</span>
                          <div><div className="text-sm font-bold">{n.title}</div><div className="text-xs text-[#567856] mt-0.5 line-clamp-1">{n.body}</div></div>
                        </Link>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={ddRef}>
              <button onClick={() => setShowDD(!showDD)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 bg-[#172617] border border-[#253d25] rounded-full hover:border-green-400 transition-all">
                <AvatarMini profile={profile} />
                <span className="text-xs font-bold text-green-400 font-mono hidden sm:block">@{profile.username}</span>
                <span className="text-[10px] text-[#567856]">▾</span>
              </button>
              {showDD && (
                <div className="absolute right-0 top-11 w-56 bg-[#172617] border border-[#253d25] rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-4 border-b border-[#253d25]">
                    <AvatarBig profile={profile} />
                    <div className="font-bold mt-2 text-sm">{profile.display_name}</div>
                    <div className="text-xs text-teal-400 font-mono">@{profile.username}</div>
                    <div className="mt-1.5">
                      {profile.verified
                        ? <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/25 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><CheckCircle size={9}/>Verificado</span>
                        : <Link href="/settings?tab=account" className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/25 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><AlertCircle size={9}/>Verificar email</Link>
                      }
                    </div>
                  </div>
                  <div className="p-1">
                    <DropItem href={`/profile/${profile.username}`} icon={<User size={14}/>} label="Meu Perfil" onClick={()=>setShowDD(false)}/>
                    <DropItem href="/settings" icon={<Settings size={14}/>} label="Configurações" onClick={()=>setShowDD(false)}/>
                    {isAdmin && <DropItem href="/dashboard" icon={<LayoutDashboard size={14}/>} label="Dashboard" onClick={()=>setShowDD(false)}/>}
                    <div className="h-px bg-[#253d25] my-1"/>
                    <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-400/8 transition-colors text-left">
                      <LogOut size={14}/> Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link href="/login"    className="text-xs font-bold px-3 py-1.5 rounded-full border border-[#253d25] text-[#9dbb9d] hover:border-green-400 hover:text-green-400 transition-all">Entrar</Link>
            <Link href="/register" className="text-xs font-bold px-4 py-1.5 rounded-full bg-gradient-to-r from-green-400 to-teal-400 text-black hover:opacity-90 transition-all">Criar Conta</Link>
          </>
        )}
      </div>
    </header>
  )
}

function AvatarMini({ profile }: { profile: Profile }) {
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
      style={{ background: profile.avatar_url ? 'transparent' : getAvatarGradient(profile.id) }}>
      {profile.avatar_url
        ? <Image src={profile.avatar_url} alt="" width={28} height={28} className="object-cover w-full h-full"/>
        : profile.display_name[0]}
    </div>
  )
}

function AvatarBig({ profile }: { profile: Profile }) {
  return (
    <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-base font-bold text-black"
      style={{ background: profile.avatar_url ? 'transparent' : getAvatarGradient(profile.id) }}>
      {profile.avatar_url
        ? <Image src={profile.avatar_url} alt="" width={44} height={44} className="object-cover w-full h-full"/>
        : profile.display_name[0]}
    </div>
  )
}

function DropItem({ href, icon, label, onClick }: { href:string; icon:React.ReactNode; label:string; onClick?:()=>void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-[#9dbb9d] hover:bg-[#0f1c0f] hover:text-white transition-colors">
      {icon} {label}
    </Link>
  )
}
