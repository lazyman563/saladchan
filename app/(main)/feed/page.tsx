'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { timeAgo, getAvatarGradient, uploadImage, BOARDS, type BoardId } from '@/lib/utils'
import type { Thread, Reply, Profile, Board } from '@/types/database'
import { Heart, MessageCircle, Eye, Pin, Lock, MoreHorizontal, Flag, Trash2, Send, ImagePlus, X } from 'lucide-react'
import toast from 'react-hot-toast'

const BOARD_LIST = [
  { id:'geral',      label:'/geral/',  colorClass:'text-green-DEFAULT  hover:bg-green-DEFAULT/8  border-green-DEFAULT/0  hover:border-green-DEFAULT'  },
  { id:'tecnologia', label:'/tec/',    colorClass:'text-teal-DEFAULT   hover:bg-teal-DEFAULT/8   border-teal-DEFAULT/0   hover:border-teal-DEFAULT'   },
  { id:'arte',       label:'/arte/',   colorClass:'text-violet-DEFAULT hover:bg-violet-DEFAULT/8 border-violet-DEFAULT/0 hover:border-violet-DEFAULT' },
  { id:'humor',      label:'/hum/',    colorClass:'text-pink-DEFAULT   hover:bg-pink-DEFAULT/8   border-pink-DEFAULT/0   hover:border-pink-DEFAULT'   },
  { id:'jogos',      label:'/jog/',    colorClass:'text-orange-DEFAULT hover:bg-orange-DEFAULT/8 border-orange-DEFAULT/0 hover:border-orange-DEFAULT' },
  { id:'musica',     label:'/mus/',    colorClass:'text-sky-DEFAULT    hover:bg-sky-DEFAULT/8    border-sky-DEFAULT/0    hover:border-sky-DEFAULT'    },
]

const TAG_CLASS: Record<string, string> = {
  green:'bt-green', teal:'bt-teal', violet:'bt-violet', pink:'bt-pink', orange:'bt-orange', sky:'bt-sky'
}

export default function FeedPage() {
  const supabase   = createClient()
  const params     = useSearchParams()
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [threads,  setThreads]  = useState<Thread[]>([])
  const [boards,   setBoards]   = useState<Board[]>([])
  const [sort,     setSort]     = useState<'new'|'hot'|'replies'>('new')
  const [search,   setSearch]   = useState('')
  const [board,    setBoard]    = useState<string | null>(params.get('board'))
  const [showForm, setShowForm] = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data))
    })
    supabase.from('boards').select('*').then(({ data }) => setBoards(data ?? []))
    fetchThreads()

    // Realtime: new threads
    const ch = supabase.channel('threads-feed')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'threads' }, payload => {
        fetchThreads()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [board, sort, search])

  async function fetchThreads() {
    setLoading(true)
    const qp = new URLSearchParams({ sort, ...(board?{board}:{}), ...(search?{search}:{}) })
    const res = await fetch('/api/threads?' + qp)
    if (res.ok) setThreads(await res.json())
    setLoading(false)
  }

  function toggleLike(threadId: string, liked: boolean) {
    if (!profile) { toast.error('Faça login para curtir!'); return }
    setThreads(prev => prev.map(t => t.id === threadId
      ? { ...t, liked_by_me: !liked, like_count: liked ? t.like_count - 1 : t.like_count + 1 }
      : t))
    fetch('/api/likes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ thread_id: threadId }) })
  }

  const currentBoard = boards.find(b => b.id === board)

  return (
    <div className="max-w-[1160px] mx-auto px-4 py-5">
      {/* Verify banner */}
      {profile && !profile.verified && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border
          bg-yellow/5 border-yellow/25 text-yellow text-sm">
          <span className="text-lg">⚠️</span>
          <span className="flex-1 font-medium">Verifique seu email para ter acesso completo.</span>
          <Link href="/settings?tab=account" className="text-xs font-bold border border-yellow/40 rounded-full px-3 py-1 hover:bg-yellow/10 transition-colors">Verificar agora</Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_252px] gap-5">
        {/* MAIN */}
        <div>
          {/* Board header */}
          <div className="bg-card border border-border rounded-xl px-5 py-4 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-bg3 border border-border flex items-center justify-center text-2xl">
                {currentBoard?.icon ?? '🥗'}
              </div>
              <div>
                <div className="font-black text-green-DEFAULT">{currentBoard?.name ?? '/geral/ — Todas as boards'}</div>
                <div className="text-tx-3 text-xs mt-0.5">{currentBoard?.description ?? 'Todas as discussões do SaladChan'}</div>
              </div>
            </div>
            <div className="hidden sm:flex gap-5">
              <div className="text-center"><div className="font-black font-mono text-green-DEFAULT">{threads.length}</div><div className="text-[10px] uppercase tracking-wider text-tx-3">Threads</div></div>
              <div className="text-center"><div className="font-black font-mono text-teal-DEFAULT">{threads.reduce((a,t)=>a+t.reply_count,0)}</div><div className="text-[10px] uppercase tracking-wider text-tx-3">Respostas</div></div>
            </div>
          </div>

          {/* New post form */}
          {showForm && <NewThreadForm profile={profile} onClose={()=>setShowForm(false)} onPosted={fetchThreads} defaultBoard={board ?? 'geral'}/>}

          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex gap-1.5">
              {(['new','hot','replies'] as const).map(s => (
                <button key={s} onClick={()=>setSort(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all
                    ${sort===s ? 'border-green-DEFAULT text-green-DEFAULT' : 'border-border text-tx-3 hover:border-green-DEFAULT/50 hover:text-tx-2'}`}>
                  {s==='new'?'Recentes':s==='hot'?'Populares':'+ Respostas'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar..."
                className="w-44 px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-text
                  placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors"/>
              <button onClick={() => profile ? setShowForm(true) : toast.error('Faça login para postar!')}
                className="px-4 py-1.5 bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT text-bg
                  font-black text-xs rounded-lg hover:shadow-green transition-all">
                + Nova Thread
              </button>
            </div>
          </div>

          {/* Threads */}
          <div className="flex flex-col gap-3">
            {loading ? (
              Array.from({length:4}).map((_,i) => <ThreadSkeleton key={i}/>)
            ) : threads.length === 0 ? (
              <div className="text-center py-16 text-tx-3">
                <div className="text-4xl mb-3">🥗</div>
                <div>Nenhuma thread ainda.</div>
                <button onClick={()=>setShowForm(true)} className="mt-4 px-5 py-2 bg-green-DEFAULT/10 border border-green-DEFAULT/25 text-green-DEFAULT text-sm font-bold rounded-full hover:bg-green-DEFAULT/20 transition-colors">Seja o primeiro!</button>
              </div>
            ) : threads.map((t, i) => (
              <ThreadCard key={t.id} thread={t} profile={profile} index={i}
                onLike={()=>toggleLike(t.id, t.liked_by_me??false)}
                onRefresh={fetchThreads}/>
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-20 h-fit">
          {/* Boards */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] font-black uppercase tracking-widest text-tx-3 mb-3">📋 Boards</div>
            <button onClick={()=>setBoard(null)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-bold mb-1 transition-all border
                ${!board ? 'bg-green-DEFAULT/10 border-green-DEFAULT/25 text-green-DEFAULT' : 'border-transparent text-tx-2 hover:bg-bg3'}`}>
              🥗 <span>Tudo</span>
            </button>
            {BOARD_LIST.map(b => (
              <button key={b.id} onClick={()=>setBoard(b.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-bold mb-0.5 transition-all border
                  ${board===b.id ? 'bg-green-DEFAULT/10 border-green-DEFAULT/25 text-green-DEFAULT' : 'border-transparent text-tx-2 hover:bg-bg3'}`}>
                {boards.find(x=>x.id===b.id)?.icon} <span>{b.label}</span>
                <span className="ml-auto text-[10px] font-mono text-tx-3">{boards.find(x=>x.id===b.id)?.thread_count ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Online & Stats */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] font-black uppercase tracking-widest text-tx-3 mb-3">🟢 Online</div>
            <div className="flex items-center gap-2 text-sm mb-1"><div className="w-2 h-2 rounded-full bg-green-DEFAULT animate-pulse-slow"/><span className="font-mono text-teal-DEFAULT text-xs">pepino_chan</span></div>
            <div className="flex items-center gap-2 text-sm mb-1"><div className="w-2 h-2 rounded-full bg-green-DEFAULT animate-pulse-slow"/><span className="font-mono text-teal-DEFAULT text-xs">tomate_bravo</span></div>
            <div className="flex items-center gap-2 text-sm mb-3"><div className="w-2 h-2 rounded-full bg-green-DEFAULT animate-pulse-slow"/><span className="text-tx-3 text-xs">+ outros</span></div>
            <div className="h-px bg-border mb-3"/>
            <div className="grid grid-cols-2 gap-2">
              {[['Members','5.9k','text-green-DEFAULT'],['Posts','12k','text-teal-DEFAULT'],['Boards','6','text-violet-DEFAULT'],['Regras','8','text-pink-DEFAULT']].map(([l,v,c])=>(
                <div key={l} className="bg-bg3 rounded-lg p-2 text-center">
                  <div className={`font-black font-mono text-sm ${c}`}>{v}</div>
                  <div className="text-[10px] text-tx-3 uppercase tracking-wide">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ─── Thread Card ──────────────────────────────────────────────────────────────
function ThreadCard({ thread: t, profile, index, onLike, onRefresh }: {
  thread: Thread; profile: Profile|null; index: number; onLike: ()=>void; onRefresh: ()=>void
}) {
  const [open,       setOpen]    = useState(false)
  const [replies,    setReplies] = useState<Reply[]>([])
  const [loadingR,   setLoadingR] = useState(false)
  const [lightbox,   setLightbox] = useState<string|null>(null)
  const boards = { geral:'green', tecnologia:'teal', arte:'violet', humor:'pink', jogos:'orange', musica:'sky' } as Record<string,string>
  const tagClass = TAG_CLASS[boards[t.board_id]] ?? 'bt-green'

  async function toggleReplies() {
    setOpen(o => !o)
    if (!open && replies.length === 0) {
      setLoadingR(true)
      const res = await fetch('/api/replies?thread_id=' + t.id)
      if (res.ok) setReplies(await res.json())
      setLoadingR(false)
    }
  }

  return (
    <>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out" onClick={()=>setLightbox(null)}>
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center" onClick={()=>setLightbox(null)}><X size={18}/></button>
          <Image src={lightbox} alt="" width={1200} height={800} className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"/>
        </div>
      )}
      <div className={`bg-card border border-border rounded-xl overflow-hidden hover:border-green-dark/60
        hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(74,222,128,0.08)] transition-all animate-fade-up thread-card`}
        style={{ animationDelay: `${index * 0.04}s` }}>
        {/* Top */}
        <div className="flex gap-3 p-4">
          <div className="w-[84px] h-[84px] rounded-xl bg-bg3 border border-border overflow-hidden flex-shrink-0
            flex items-center justify-center text-3xl cursor-pointer hover:opacity-80 transition-opacity"
            onClick={()=>t.image_url ? setLightbox(t.image_url) : null}>
            {t.image_url ? <Image src={t.image_url} alt="" width={84} height={84} className="object-cover w-full h-full"/> : (t.board as any)?.icon ?? '🥗'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${tagClass}`}>{t.board_id}</span>
              {t.pinned && <span className="text-[10px] font-bold px-2 py-0.5 rounded bt-yellow flex items-center gap-1"><Pin size={9}/>Fixado</span>}
              {t.locked && <span className="text-[10px] font-bold px-2 py-0.5 rounded bt-sky flex items-center gap-1"><Lock size={9}/>Bloqueado</span>}
              <Link href={`/profile/${(t.author as any)?.username}`}
                className="text-xs font-bold text-teal-DEFAULT font-mono hover:text-green-DEFAULT hover:underline transition-colors">
                @{(t.author as any)?.display_name ?? 'anon'}
              </Link>
              {(t.author as any)?.verified && <span className="text-green-DEFAULT text-xs" title="Verificado">✔</span>}
              {(t.author as any)?.role === 'admin' && <span className="text-[10px] bt-yellow px-1.5 py-0.5 rounded font-bold">admin</span>}
              {(t.author as any)?.role === 'mod' && <span className="text-[10px] bt-sky px-1.5 py-0.5 rounded font-bold">mod</span>}
              <span className="text-[11px] text-tx-3">{timeAgo(t.created_at)}</span>
            </div>
            <div className="font-black text-sm leading-snug mb-1.5">{t.title}</div>
            <div className="text-xs text-tx-2 leading-relaxed line-clamp-2">{t.body}</div>
          </div>
        </div>
        {/* Footer */}
        <div className="border-t border-border2 bg-bg2 px-4 py-2 flex items-center justify-between">
          <div className="flex gap-1">
            <button onClick={onLike}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all font-semibold
                ${t.liked_by_me ? 'text-pink-DEFAULT bg-pink-DEFAULT/8' : 'text-tx-3 hover:bg-green-DEFAULT/7 hover:text-green-DEFAULT'}`}>
              <Heart size={13} fill={t.liked_by_me?'currentColor':'none'}/>{t.like_count}
            </button>
            <button onClick={toggleReplies}
              className="flex items-center gap-1.5 text-xs text-tx-3 hover:text-green-DEFAULT hover:bg-green-DEFAULT/7 px-2.5 py-1.5 rounded-lg transition-all font-semibold">
              <MessageCircle size={13}/>{t.reply_count}
            </button>
            <span className="flex items-center gap-1.5 text-xs text-tx-3 px-2 py-1.5">
              <Eye size={13}/>{t.view_count}
            </span>
          </div>
          <button onClick={toggleReplies}
            className="text-xs text-tx-3 hover:text-green-DEFAULT hover:border-green-DEFAULT transition-all
              border border-border rounded-lg px-3 py-1.5 font-bold">
            {open ? 'Fechar ↑' : 'Ver thread →'}
          </button>
        </div>
        {/* Replies */}
        {open && (
          <div className="border-t border-border bg-bg2 p-4 flex flex-col gap-3">
            {loadingR ? <div className="text-center text-tx-3 text-sm py-4">Carregando...</div>
              : replies.map(r => <ReplyCard key={r.id} reply={r} onImgClick={setLightbox}/>)
            }
            {!t.locked && <ReplyForm threadId={t.id} profile={profile} onSent={(r)=>setReplies(prev=>[...prev,r])}/>}
            {t.locked && <div className="text-center text-tx-3 text-xs py-2 flex items-center gap-1 justify-center"><Lock size={11}/>Thread bloqueada</div>}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Reply Card ───────────────────────────────────────────────────────────────
function ReplyCard({ reply: r, onImgClick }: { reply: Reply; onImgClick: (src:string)=>void }) {
  return (
    <div className="flex gap-2.5 bg-card border border-border rounded-xl p-3">
      <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-bg"
        style={{ background: (r.author as any)?.avatar_url ? 'transparent' : getAvatarGradient((r.author as any)?.id ?? '') }}>
        {(r.author as any)?.avatar_url
          ? <Image src={(r.author as any).avatar_url} alt="" width={32} height={32} className="object-cover w-full h-full"/>
          : ((r.author as any)?.display_name?.[0] ?? '?')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/profile/${(r.author as any)?.username}`}
            className="text-xs font-bold text-teal-DEFAULT font-mono hover:underline">
            @{(r.author as any)?.display_name}
          </Link>
          <span className="text-[10px] text-tx-3">{timeAgo(r.created_at)}</span>
        </div>
        <div className="text-xs text-text leading-relaxed">{r.body}</div>
        {r.image_url && (
          <Image src={r.image_url} alt="" width={240} height={160}
            className="rounded-lg mt-2 max-w-[240px] cursor-pointer hover:opacity-80 transition-opacity object-cover"
            onClick={()=>onImgClick(r.image_url)}/>
        )}
      </div>
    </div>
  )
}

// ─── Reply Form ───────────────────────────────────────────────────────────────
function ReplyForm({ threadId, profile, onSent }: { threadId:string; profile:Profile|null; onSent:(r:Reply)=>void }) {
  const supabase = createClient()
  const [body,    setBody]    = useState('')
  const [imgFile, setImgFile] = useState<File|null>(null)
  const [imgPrev, setImgPrev] = useState<string|null>(null)
  const [sending, setSending] = useState(false)

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setImgFile(f)
    setImgPrev(URL.createObjectURL(f))
  }

  async function send() {
    if (!profile) { toast.error('Faça login para responder!'); return }
    if (!body.trim() && !imgFile) { toast.error('Escreva algo ou adicione uma imagem!'); return }
    setSending(true)
    try {
      let image_url = ''
      if (imgFile) {
        const fd = new FormData(); fd.append('file', imgFile); fd.append('type', 'reply')
        const r = await fetch('/api/upload', { method:'POST', body: fd })
        image_url = (await r.json()).url
      }
      const res  = await fetch('/api/replies', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ thread_id: threadId, body: body.trim(), image_url }) })
      if (!res.ok) { toast.error((await res.json()).error); return }
      const reply = await res.json()
      onSent(reply)
      setBody(''); setImgFile(null); setImgPrev(null)
      toast.success('Resposta enviada! 💬')
    } finally { setSending(false) }
  }

  return (
    <div className="flex gap-2.5 pt-2 border-t border-dashed border-border">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-bg"
        style={{ background: profile ? getAvatarGradient(profile.id) : '#253d25' }}>
        {profile ? profile.display_name[0] : '?'}
      </div>
      <div className="flex-1">
        {imgPrev && (
          <div className="relative w-24 h-16 mb-2">
            <Image src={imgPrev} alt="" fill className="object-cover rounded-lg"/>
            <button onClick={()=>{setImgFile(null);setImgPrev(null)}} className="absolute -top-1 -right-1 w-4 h-4 bg-red rounded-full flex items-center justify-center"><X size={9} className="text-white"/></button>
          </div>
        )}
        <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile ? 'Responda com respeito... 🥗' : 'Faça login para responder'}
          disabled={!profile}
          className="w-full px-3 py-2 bg-bg3 border border-border rounded-xl text-xs text-text
            placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors resize-none h-16 disabled:opacity-50"/>
        <div className="flex items-center gap-2 mt-2">
          <label className="flex items-center gap-1.5 text-xs text-tx-3 hover:text-green-DEFAULT transition-colors cursor-pointer">
            <input type="file" accept="image/*" onChange={pickImage} className="hidden"/>
            <ImagePlus size={14}/> Imagem
          </label>
          <button onClick={send} disabled={sending || !profile}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT
              text-bg text-xs font-bold rounded-lg hover:shadow-green transition-all disabled:opacity-60">
            <Send size={12}/>{sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New Thread Form ──────────────────────────────────────────────────────────
function NewThreadForm({ profile, onClose, onPosted, defaultBoard }: {
  profile: Profile|null; onClose:()=>void; onPosted:()=>void; defaultBoard: string
}) {
  const [board,   setBoard]   = useState(defaultBoard)
  const [title,   setTitle]   = useState('')
  const [body,    setBody]    = useState('')
  const [imgFile, setImgFile] = useState<File|null>(null)
  const [imgPrev, setImgPrev] = useState<string|null>(null)
  const [posting, setPosting] = useState(false)

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setImgFile(f); setImgPrev(URL.createObjectURL(f))
  }

  async function submit() {
    if (!title.trim()) { toast.error('Dê um título!'); return }
    if (!body.trim())  { toast.error('Escreva o conteúdo!'); return }
    setPosting(true)
    try {
      let image_url = ''
      if (imgFile) {
        const fd = new FormData(); fd.append('file', imgFile); fd.append('type', 'thread')
        const r = await fetch('/api/upload', { method:'POST', body: fd })
        image_url = (await r.json()).url
      }
      const res = await fetch('/api/threads', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ board_id: board, title: title.trim(), body: body.trim(), image_url }) })
      if (!res.ok) { toast.error((await res.json()).error); return }
      toast.success('Thread publicada! 🥗')
      onClose(); onPosted()
    } finally { setPosting(false) }
  }

  return (
    <div className="bg-card border border-green-DEFAULT/60 rounded-xl p-5 mb-4 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="font-black text-green-DEFAULT flex items-center gap-2">✏️ Nova Thread</div>
        <button onClick={onClose} className="text-tx-3 hover:text-text transition-colors"><X size={16}/></button>
      </div>
      {/* Board chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {BOARD_LIST.map(b => (
          <button key={b.id} onClick={()=>setBoard(b.id)}
            className={`text-xs font-bold font-mono px-3 py-1 rounded-full border transition-all
              ${board===b.id ? 'bg-green-DEFAULT text-bg border-green-DEFAULT' : 'border-border text-tx-3 hover:border-green-DEFAULT/50'}`}>
            {b.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="sm:col-span-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Título *</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título da thread..."
            className="w-full px-3 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors"/>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Conteúdo *</label>
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Escreva aqui... Seja respeitoso! 🥗"
            className="w-full px-3 py-2.5 bg-bg3 border border-border rounded-lg text-sm text-text placeholder:text-tx-3 outline-none focus:border-green-DEFAULT transition-colors resize-none h-28"/>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-tx-3 block mb-1.5">Imagem (opcional)</label>
          {imgPrev ? (
            <div className="relative w-32 h-24">
              <Image src={imgPrev} alt="" fill className="object-cover rounded-xl"/>
              <button onClick={()=>{setImgFile(null);setImgPrev(null)}} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red rounded-full flex items-center justify-center"><X size={11} className="text-white"/></button>
            </div>
          ) : (
            <label className="flex items-center gap-2.5 w-full cursor-pointer border-2 border-dashed border-border hover:border-green-DEFAULT rounded-xl px-4 py-3 text-tx-3 hover:text-green-DEFAULT transition-all text-sm font-bold">
              <ImagePlus size={18}/> Adicionar imagem
              <input type="file" accept="image/*" onChange={pickImage} className="hidden"/>
            </label>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2.5">
        <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg text-xs font-bold text-tx-2 hover:border-green-DEFAULT transition-all">Cancelar</button>
        <button onClick={submit} disabled={posting}
          className="px-5 py-2 bg-gradient-to-r from-green-DEFAULT to-teal-DEFAULT text-bg font-black text-xs rounded-lg hover:shadow-green transition-all disabled:opacity-60">
          {posting ? '🌿 Publicando...' : '🌿 Publicar Thread'}
        </button>
      </div>
    </div>
  )
}

function ThreadSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-20 h-20 rounded-xl bg-bg3 flex-shrink-0"/>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-bg3 rounded w-1/3"/>
          <div className="h-4 bg-bg3 rounded w-3/4"/>
          <div className="h-3 bg-bg3 rounded w-full"/>
          <div className="h-3 bg-bg3 rounded w-2/3"/>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
