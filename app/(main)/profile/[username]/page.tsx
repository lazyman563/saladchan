'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getAvatarGradient, timeAgo, BOARDS } from '@/lib/utils'
import type { Profile, Thread, Reply } from '@/types/database'
import { MapPin, Globe, Calendar, CheckCircle, ShieldAlert } from 'lucide-react'

const TAGS: Record<string,string> = {
  green:'bt-green', teal:'bt-teal', violet:'bt-violet', pink:'bt-pink', orange:'bt-orange', sky:'bt-sky'
}

export default function ProfilePage() {
  const supabase = createClient()
  const { username } = useParams<{ username: string }>()
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [me,       setMe]       = useState<Profile | null>(null)
  const [tab,      setTab]      = useState<'threads'|'replies'|'liked'>('threads')
  const [threads,  setThreads]  = useState<Thread[]>([])
  const [replies,  setReplies]  = useState<(Reply & {thread_title?:string})[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/users?username=' + username).then(r => r.json()),
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return null
        return supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => data)
      }),
    ]).then(([prof, myProf]) => {
      setProfile(prof.error ? null : prof)
      setMe(myProf)
      setLoading(false)
    })
  }, [username])

  useEffect(() => {
    if (!profile) return
    if (tab === 'threads') {
      supabase.from('threads').select('*, author:profiles!author_id(*), board:boards!board_id(*)')
        .eq('author_id', profile.id).order('created_at', { ascending: false })
        .then(({ data }) => setThreads(data ?? []))
    } else if (tab === 'replies') {
      supabase.from('replies').select('*, author:profiles!author_id(*), thread:threads!thread_id(title)')
        .eq('author_id', profile.id).order('created_at', { ascending: false })
        .then(({ data }) => setReplies((data ?? []).map((r:any) => ({ ...r, thread_title: r.thread?.title }))))
    }
  }, [profile, tab])

  if (loading) return <div className="flex items-center justify-center h-64 text-tx-3">Carregando...</div>
  if (!profile) return <div className="flex items-center justify-center h-64 text-tx-3">Usuário não encontrado.</div>

  const isMe = me?.id === profile.id

  return (
    <div className="max-w-[760px] mx-auto px-4 py-5">
      {/* Banner */}
      <div className="h-36 rounded-t-2xl overflow-hidden relative bg-gradient-to-br from-bg3 to-card2 border border-border border-b-0">
        {profile.banner_url && <Image src={profile.banner_url} alt="" fill className="object-cover"/>}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(74,222,128,0.04)_0,rgba(74,222,128,0.04)_1px,transparent_0,transparent_50%)] bg-[size:20px_20px]"/>
        {isMe && (
          <Link href="/settings" className="absolute top-3 right-3 text-xs font-bold px-3 py-1.5 bg-black/40 border border-border rounded-lg text-tx-2 hover:border-green-DEFAULT hover:text-green-DEFAULT transition-all backdrop-blur-sm">
            ✏️ Editar Perfil
          </Link>
        )}
      </div>

      {/* Profile card */}
      <div className="bg-card border border-border border-t-0 rounded-b-2xl px-6 pb-6 mb-4">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div className="-mt-10 relative">
            <div className="w-20 h-20 rounded-full border-4 border-bg overflow-hidden flex items-center justify-center text-2xl font-black text-bg"
              style={{ background: profile.avatar_url ? 'transparent' : getAvatarGradient(profile.id) }}>
              {profile.avatar_url ? <Image src={profile.avatar_url} alt="" width={80} height={80} className="object-cover w-full h-full"/> : profile.display_name[0]}
            </div>
          </div>
          <div className="flex gap-5 pb-2">
            <div className="text-center"><div className="font-black font-mono text-green-DEFAULT">{profile.post_count}</div><div className="text-[10px] text-tx-3 uppercase tracking-wide">Threads</div></div>
            <div className="text-center"><div className="font-black font-mono text-teal-DEFAULT">{profile.reply_count}</div><div className="text-[10px] text-tx-3 uppercase tracking-wide">Respostas</div></div>
            <div className="text-center"><div className="font-black font-mono text-pink-DEFAULT">{profile.like_count}</div><div className="text-[10px] text-tx-3 uppercase tracking-wide">Curtidas</div></div>
          </div>
        </div>

        <div className="font-black text-lg leading-tight">{profile.display_name}</div>
        <div className="text-teal-DEFAULT font-mono text-sm mt-0.5">@{profile.username}</div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {profile.verified && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bt-green"><CheckCircle size={9}/>Verificado</span>}
          {profile.role==='admin' && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bt-yellow"><ShieldAlert size={9}/>Admin</span>}
          {profile.role==='mod'   && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bt-sky">⚖️ Mod</span>}
          {(profile.post_count ?? 0) >= 5 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bt-violet">🧵 Postador</span>}
        </div>

        {profile.bio && <p className="text-sm text-tx-2 leading-relaxed mt-3 max-w-xl">{profile.bio}</p>}

        <div className="flex flex-wrap gap-4 mt-3">
          {profile.location && <div className="flex items-center gap-1.5 text-xs text-tx-3"><MapPin size={12}/>{profile.location}</div>}
          {profile.website  && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-teal-DEFAULT hover:underline"><Globe size={12}/>{profile.website.replace('https://','')}</a>}
          <div className="flex items-center gap-1.5 text-xs text-tx-3"><Calendar size={12}/>Entrou em {profile.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}) : '—'}</div>
        </div>
      </div>

      {/* Content tabs */}
      <div className="flex border-b border-border mb-4">
        {[{id:'threads',label:'🧵 Threads'},{id:'replies',label:'💬 Respostas'},{id:'liked',label:'❤️ Curtidos'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            className={`px-5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all ${tab===t.id?'text-green-DEFAULT border-green-DEFAULT':'text-tx-3 border-transparent hover:text-tx-2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'threads' && (
        <div className="flex flex-col gap-3">
          {threads.length === 0 ? <Empty/> : threads.map(t => {
            const b = (t.board as any)
            return (
              <div key={t.id} className="bg-card border border-border rounded-xl p-4 hover:border-green-dark/60 transition-all">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bt-${b?.color ?? 'green'}`}>{t.board_id}</span>
                  <span className="text-[10px] text-tx-3">{timeAgo(t.created_at)}</span>
                </div>
                <div className="font-black text-sm mb-1">{t.title}</div>
                <div className="text-xs text-tx-2 line-clamp-2">{t.body}</div>
                <div className="flex gap-3 mt-3 text-xs text-tx-3">
                  <span>❤️ {t.like_count}</span>
                  <span>💬 {t.reply_count}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {tab === 'replies' && (
        <div className="flex flex-col gap-3">
          {replies.length === 0 ? <Empty/> : replies.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4">
              {r.thread_title && <div className="text-[10px] text-tx-3 mb-2">Em: <span className="text-teal-DEFAULT">{r.thread_title}</span></div>}
              <div className="text-sm text-text">{r.body}</div>
              <div className="text-[10px] text-tx-3 mt-2">{timeAgo(r.created_at)}</div>
            </div>
          ))}
        </div>
      )}
      {tab === 'liked' && <Empty msg="Posts curtidos em breve!"/>}
    </div>
  )
}

function Empty({ msg='Nada por aqui ainda.' }: { msg?: string }) {
  return <div className="text-center py-12 text-tx-3 text-sm">{msg}</div>
}
