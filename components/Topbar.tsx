'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAvatarGradient } from '@/lib/utils'
import type { Profile, Notification } from '@/types/database'
import { Bell, LogOut, Settings, User, LayoutDashboard, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const BOARDS = [
  { id:'geral',      label:'/geral/',  color:'text-green-DEFAULT border-green-DEFAULT/0 hover:border-green-DEFAULT hover:bg-green-DEFAULT/10' },
  { id:'tecnologia', label:'/tec/',    color:'text-teal-DEFAULT   border-teal-DEFAULT/0   hover:border-teal-DEFAULT   hover:bg-teal-DEFAULT/10'   },
  { id:'arte',       label:'/arte/',   color:'text-violet-DEFAULT border-violet-DEFAULT/0 hover:border-violet-DEFAULT hover:bg-violet-DEFAULT/10' },
  { id:'humor',      label:'/hum/',    color:'text-pink-DEFAULT   border-pink-DEFAULT/0   hover:border-pink-DEFAULT   hover:bg-pink-DEFAULT/10'   },
  { id:'jogos',      label:'/jog/',    color:'text-orange-DEFAULT border-orange-DEFAULT/0 hover:border-orange-DEFAULT hover:bg-orange-DEFAULT/10' },
  { id:'musica',     label:'/mus/',    color:'text-sky-DEFAULT    border-sky-DEFAULT/0    hover:border-sky-DEFAULT    hover:bg-sky-DEFAULT/10'    },
]

export default function Topbar() {
  const supabase   = createClient()
  const router     = useRouter()
  const pathname   = usePathname()
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [notifs,   setNotifs]   = useState<Notification[]>([])
  const [showDD,   setShowDD]   = useState(false)
  const [showBell, setShowBell] = useState(false)
  const ddRef   = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => setProfile(data))
      supabase.from('notifications').select('*').eq('user_id', user.id).eq('read', false)
        .order('created_at', { ascending: false }).limit(10)
        .then(({ data }) => setNotifs(data ?? []))
    })

    // Realtime notifications
    const ch = supabase.channel('notifs').on(
      'postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        setNotifs(prev => [payload.new as Notification, ...prev])
        toast('🔔 ' + (payload.new as Notification).title)
      }
    ).subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  // Close on outside click
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
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
    setNotifs([])
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'mod'

  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-4
      bg-bg/90 backdrop-blur-md border-b border-border shadow-[0_1px_20px_rgba(74,222,128,0.08)]">

      {/* Logo */}
      <Link href="/feed" className="flex items-center gap-2 no-underline">
        <span className="text-2xl animate-logo">🥗</span>
        <span className="text-xl font-black bg-gradient-to-r from-green-DEFAULT via-teal-DEFAULT to-lime-DEFAULT
          bg-clip-text text-transparent">SaladChan</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-green-DEFAULT
          bg-green-DEFAULT/10 border border-green-DEFAULT/30 px-2 py-0.5 rounded-full">1.0</span>
      </Link>

      {/* Board nav */}
      <nav className="hidden md:flex items-center gap-0.5">
        {BOARDS.map(b => (
          <Link key={b.id} href={`/feed?board=${b.id}`}
            className={`text-[11px] font-bold font-mono px-3 py-1 rounded-full border transition-all duration-150 ${b.color}`}>
            {b.label}
          </Link>
        ))}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-2">
        {profile ? (
          <>
            {/* Notifications bell */}
            <div className="relative" ref={bellRef}>
              <button onClick={() => setShowBell(!showBell)}
                className="relative w-9 h-9 rounded-full bg-card border border-border flex items-center
                  justify-center text-tx-2 hover:border-green-DEFAULT hover:text-green-DEFAULT transition-all">
                <Bell size={16} />
                {notifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red rounded-full text-[10px]
                    font-bold text-white flex items-center justify-content-center leading-none pt-[1px]">
                    {notifs.length > 9 ? '9+' : notifs.length}
                  </span>
                )}
              </button>
              {showBell && (
                <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl
                  shadow-card overflow-hidden z-50 animate-fade-up">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-bold">Notificações</span>
                    {notifs.length > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-green-DEFAULT hover:underline">
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="py-8 text-center text-tx-3 text-sm">Nenhuma notificação</div>
                    ) : notifs.map(n => (
                      <Link key={n.id} href={n.link || '/feed'}
                        className="flex gap-3 px-4 py-3 hover:bg-bg3 border-b border-border2 transition-colors">
                        <span className="text-lg mt-0.5">{n.type==='reply'?'💬':n.type==='like'?'❤️':'🔔'}</span>
                        <div>
                          <div className="text-sm font-bold">{n.title}</div>
                          <div className="text-xs text-tx-3 mt-0.5 line-clamp-1">{n.body}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User chip */}
            <div className="relative" ref={ddRef}>
              <button onClick={() => setShowDD(!showDD)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 bg-card border border-border
                  rounded-full hover:border-green-DEFAULT transition-all">
                <AvatarMini profile={profile} />
                <span className="text-xs font-bold text-green-DEFAULT font-mono hidden sm:block">
                  @{profile.username}
                </span>
                <span className="text-[10px] text-tx-3">▾</span>
              </button>

              {showDD && (
                <div className="absolute right-0 top-11 w-56 bg-card border border-border rounded-xl
                  shadow-card overflow-hidden z-50 animate-fade-up">
                  {/* Header */}
                  <div className="p-4 border-b border-border bg-gradient-to-br from-green-DEFAULT/5 to-teal-DEFAULT/5">
                    <AvatarBig profile={profile} />
                    <div className="font-bold mt-2 text-sm">{profile.display_name}</div>
                    <div className="text-xs text-teal-DEFAULT font-mono">@{profile.username}</div>
                    <div className="mt-1.5">
                      {profile.verified
                        ? <span className="text-[10px] font-bold text-green-DEFAULT bg-green-DEFAULT/10 border border-green-DEFAULT/25 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><CheckCircle size={9}/>Verificado</span>
                        : <Link href="/settings?tab=account" className="text-[10px] font-bold text-yellow bg-yellow/10 border border-yellow/25 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><AlertCircle size={9}/>Verificar email</Link>
                      }
                    </div>
                  </div>
                  <div className="p-1">
                    <DropItem href={`/profile/${profile.username}`} icon={<User size={14}/>} label="Meu Perfil" onClick={()=>setShowDD(false)}/>
                    <DropItem href="/settings" icon={<Settings size={14}/>} label="Configurações" onClick={()=>setShowDD(false)}/>
                    {isAdmin && <DropItem href="/dashboard" icon={<LayoutDashboard size={14}/>} label="Dashboard" onClick={()=>setShowDD(false)}/>}
                    <div className="h-px bg-border my-1"/>
                    <button onClick={signOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold
                        text-red hover:bg-red/8 transition-colors text-left">
                      <LogOut size={14}/> Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link href="/login"    className="text-xs font-bold px-3 py-1.5 rounded-full border border-border text-tx-2 hover:border-green-DEFAULT hover:text-green-DEFAULT transition-all">Entrar</Link>
            <Link href="/register" className="text-xs font-bold px-4 py-1.5 rounded-full bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT text-bg hover:shadow-green transition-all">Criar Conta</Link>
          </>
        )}
      </div>
    </header>
  )
}

function AvatarMini({ profile }: { profile: Profile }) {
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-bg flex-shrink-0"
      style={{ background: profile.avatar_url ? 'transparent' : getAvatarGradient(profile.id) }}>
      {profile.avatar_url
        ? <Image src={profile.avatar_url} alt="" width={28} height={28} className="object-cover w-full h-full"/>
        : profile.display_name[0]}
    </div>
  )
}

function AvatarBig({ profile }: { profile: Profile }) {
  return (
    <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-base font-bold text-bg"
      style={{ background: profile.avatar_url ? 'transparent' : getAvatarGradient(profile.id) }}>
      {profile.avatar_url
        ? <Image src={profile.avatar_url} alt="" width={44} height={44} className="object-cover w-full h-full"/>
        : profile.display_name[0]}
    </div>
  )
}

function DropItem({ href, icon, label, onClick }: { href:string; icon:React.ReactNode; label:string; onClick?:()=>void }) {
  return (
    <Link href={href} onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold
        text-tx-2 hover:bg-bg3 hover:text-text transition-colors">
      {icon} {label}
    </Link>
  )
}
