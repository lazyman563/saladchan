'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { RefreshCw, Download, Users, MessageSquare, Heart, AlertTriangle, Globe, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface Stats {
  totalUsers: number; totalThreads: number; totalReplies: number; pendingReports: number
  boards: any[]; topThreads: any[]; recentUsers: any[]
}

interface Report { id:string; reason:string; description:string; thread?:any; reply?:any; reporter?:any; created_at:string }

export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [reports,  setReports]  = useState<Report[]>([])
  const [tab,      setTab]      = useState<'overview'|'users'|'reports'|'boards'>('overview')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!prof || !['mod','admin'].includes((prof as any).role)) { router.push('/feed'); toast.error('Acesso negado.'); return }
      fetchAll()
    })
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [statsRes, reportsRes] = await Promise.all([
      fetch('/api/admin?action=stats'),
      fetch('/api/admin?action=reports'),
    ])
    if (statsRes.ok)   setStats(await statsRes.json())
    if (reportsRes.ok) setReports(await reportsRes.json())
    setLoading(false)
  }

  async function resolveReport(id: string, status: 'resolved'|'dismissed') {
    await fetch('/api/admin', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'resolve_report', reportId: id, status }) })
    setReports(prev => prev.filter(r => r.id !== id))
    toast.success(status === 'resolved' ? '✅ Resolvido!' : '❌ Descartado!')
  }

  async function banUser(userId: string) {
    const reason = prompt('Motivo do banimento:')
    if (!reason) return
    const res = await fetch('/api/admin', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'ban', userId, reason }) })
    if (res.ok) toast.success('🚫 Usuário banido e notificado por email!')
    else toast.error('Erro ao banir.')
  }

  async function unbanUser(userId: string) {
    await fetch('/api/admin', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'unban', userId }) })
    toast.success('✅ Banimento removido!')
  }

  async function setRole(userId: string, role: string) {
    const res = await fetch('/api/admin', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'set_role', userId, role }) })
    if (res.ok) { toast.success('Cargo atualizado!'); fetchAll() }
    else toast.error((await res.json()).error)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-tx-3 text-sm">📊 Carregando dashboard...</div>
  if (!stats)  return null

  const COLORS = { green:'#4ade80', teal:'#2dd4bf', violet:'#a78bfa', pink:'#f472b6', orange:'#fb923c', sky:'#38bdf8' } as Record<string,string>

  const TABS = [
    { id:'overview', label:'📊 Visão Geral' },
    { id:'users',    label:'👥 Usuários' },
    { id:'reports',  label:`🚨 Reportes ${reports.length > 0 ? `(${reports.length})` : ''}` },
    { id:'boards',   label:'📋 Boards' },
  ] as const

  return (
    <div className="max-w-[1160px] mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black">📊 Dashboard</h1>
          <p className="text-tx-3 text-sm mt-0.5">Painel de controle do SaladChan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-bold text-tx-2 hover:border-green-DEFAULT hover:text-green-DEFAULT transition-all">
            <RefreshCw size={13}/> Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg3 rounded-xl p-1 mb-5 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab===t.id ? 'bg-card text-green-DEFAULT shadow' : 'text-tx-3 hover:text-tx-2'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
            {[
              { icon:<Users size={18}/>,         label:'Membros',   val:stats.totalUsers,    color:'text-green-DEFAULT',  glow:'dc-green'  },
              { icon:<MessageSquare size={18}/>,  label:'Threads',   val:stats.totalThreads,  color:'text-teal-DEFAULT',   glow:'dc-teal'   },
              { icon:<MessageSquare size={18}/>,  label:'Respostas', val:stats.totalReplies,  color:'text-violet-DEFAULT', glow:'dc-violet' },
              { icon:<Heart size={18}/>,          label:'Curtidas',  val:'3.8k',              color:'text-pink-DEFAULT',   glow:'dc-pink'   },
              { icon:<Globe size={18}/>,          label:'Online',    val:'9',                 color:'text-orange-DEFAULT', glow:'dc-orange' },
              { icon:<AlertTriangle size={18}/>,  label:'Reportes',  val:reports.length,      color:'text-sky-DEFAULT',    glow:'dc-sky'    },
            ].map((c, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-card transition-all">
                <div className={`${c.color} mb-2`}>{c.icon}</div>
                <div className={`text-2xl font-black font-mono ${c.color}`}>{c.val}</div>
                <div className="text-xs text-tx-3 mt-0.5">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Posts per day */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs font-black uppercase tracking-widest text-tx-3 mb-4 flex items-center gap-2"><TrendingUp size={13}/>Posts últimos 7 dias</div>
              <MiniBarChart/>
            </div>

            {/* Board distribution */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs font-black uppercase tracking-widest text-tx-3 mb-4">🍕 Distribuição por Board</div>
              <div className="flex flex-col gap-2.5">
                {stats.boards.map(b => {
                  const max = Math.max(...stats.boards.map((x:any) => x.thread_count), 1)
                  const pct = Math.round((b.thread_count / max) * 100)
                  return (
                    <div key={b.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{b.icon} /{b.id}/</span>
                        <span className="font-mono font-bold" style={{ color: COLORS[b.color] }}>{b.thread_count}</span>
                      </div>
                      <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[b.color] }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Top threads */}
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="text-xs font-black uppercase tracking-widest text-tx-3 mb-3 flex items-center gap-2">🏆 Top Threads</div>
            <table className="w-full">
              <thead><tr className="border-b border-border">
                {['#','Thread','Board','Curtidas','Respostas'].map(h=><th key={h} className="text-left py-2 px-2 text-[10px] font-black uppercase tracking-wider text-tx-3">{h}</th>)}
              </tr></thead>
              <tbody>
                {stats.topThreads.map((t:any, i:number) => (
                  <tr key={t.id} className="border-b border-border2 hover:bg-bg3 transition-colors">
                    <td className="py-2.5 px-2 text-xs font-mono text-tx-3">{i+1}</td>
                    <td className="py-2.5 px-2 text-xs font-bold max-w-[280px] truncate">{t.title}</td>
                    <td className="py-2.5 px-2 text-xs font-mono text-tx-3">/{t.board_id}/</td>
                    <td className="py-2.5 px-2 text-xs font-mono text-teal-DEFAULT">❤️ {t.like_count}</td>
                    <td className="py-2.5 px-2 text-xs font-mono text-violet-DEFAULT">💬 {t.reply_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="text-xs font-black uppercase tracking-widest text-tx-3">👥 Usuários ({stats.totalUsers})</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-bg3">
                {['Usuário','Email','Role','Verificado','Posts','Entrou','Ações'].map(h=><th key={h} className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-tx-3 whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {stats.recentUsers.map((u:any) => (
                  <tr key={u.id} className="border-b border-border2 hover:bg-bg3 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-bg bg-gradient-to-br from-green-DEFAULT to-teal-DEFAULT">{u.display_name?.[0]}</div>
                        <div><div className="text-xs font-bold">@{u.username}</div><div className="text-[10px] text-tx-3">{u.display_name}</div></div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-tx-3 max-w-[160px] truncate">{u.email ?? '—'}</td>
                    <td className="py-3 px-4">
                      <select value={u.role} onChange={e=>setRole(u.id, e.target.value)}
                        className="bg-bg3 border border-border rounded-lg text-xs px-2 py-1 outline-none text-tx-2 cursor-pointer hover:border-green-DEFAULT transition-colors">
                        <option value="user">user</option>
                        <option value="mod">mod</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.verified ? 'text-green-DEFAULT bg-green-DEFAULT/10' : 'text-yellow bg-yellow/10'}`}>
                        {u.verified ? '✔ Sim' : '⚠ Não'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-tx-2">{u.post_count}</td>
                    <td className="py-3 px-4 text-xs text-tx-3 whitespace-nowrap">{timeAgo(u.created_at)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1.5">
                        <button onClick={()=>banUser(u.id)} title="Banir"
                          className="px-2 py-1 text-[10px] font-bold text-red border border-red/30 rounded-lg hover:bg-red/10 transition-colors">🚫 Ban</button>
                        <button onClick={()=>unbanUser(u.id)} title="Desbanir"
                          className="px-2 py-1 text-[10px] font-bold text-green-DEFAULT border border-green-DEFAULT/30 rounded-lg hover:bg-green-DEFAULT/10 transition-colors">✅ Unban</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="text-xs font-black uppercase tracking-widest text-tx-3">🚨 Fila de Moderação ({reports.length})</div>
          </div>
          {reports.length === 0 ? (
            <div className="py-12 text-center text-tx-3 text-sm">✅ Fila vazia! Tudo sob controle.</div>
          ) : reports.map(r => (
            <div key={r.id} className="border-b border-border2 p-4 hover:bg-bg3 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.reason==='spam'?'bt-orange':r.reason==='nsfw'?'bt-pink':r.reason==='hate'?'bt-red':'bt-sky'
                    }`}>{r.reason.toUpperCase()}</span>
                    <span className="text-[10px] text-tx-3">{timeAgo(r.created_at)}</span>
                    {r.reporter && <span className="text-[10px] text-tx-3">por @{r.reporter.username}</span>}
                  </div>
                  {r.thread && <div className="text-xs font-bold text-tx-2 mb-1">Thread: "{r.thread.title}"</div>}
                  {r.reply  && <div className="text-xs text-tx-2 mb-1">Resposta: "{r.reply.body?.slice(0,80)}..."</div>}
                  {r.description && <div className="text-xs text-tx-3 italic">"{r.description}"</div>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={()=>resolveReport(r.id,'resolved')}
                    className="px-3 py-1.5 text-xs font-bold text-green-DEFAULT border border-green-DEFAULT/30 rounded-lg hover:bg-green-DEFAULT/10 transition-colors">✅ Resolver</button>
                  <button onClick={()=>resolveReport(r.id,'dismissed')}
                    className="px-3 py-1.5 text-xs font-bold text-tx-3 border border-border rounded-lg hover:border-green-DEFAULT transition-colors">❌ Descartar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'boards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.boards.map((b:any) => (
            <div key={b.id} className="bg-card border border-border rounded-xl p-5 hover:border-green-dark/60 transition-all">
              <div className="text-3xl mb-3">{b.icon}</div>
              <div className="font-black mb-1">{b.name}</div>
              <div className="text-xs text-tx-3 mb-4">{b.description}</div>
              <div className="flex gap-4">
                <div><div className="font-black font-mono text-lg" style={{ color: COLORS[b.color] }}>{b.thread_count}</div><div className="text-[10px] text-tx-3 uppercase tracking-wide">Threads</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniBarChart() {
  const vals = [42, 67, 55, 89, 71, 110, 98]
  const max  = Math.max(...vals)
  const colors = ['#4ade80','#2dd4bf','#a78bfa','#f472b6','#fb923c','#38bdf8','#a3e635']
  const days   = ['Seg','Ter','Qua','Qui','Sex','Sab','Dom']
  return (
    <div>
      <div className="flex items-end gap-2 h-14">
        {vals.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-sm min-h-[4px] transition-all hover:opacity-80"
              style={{ height: `${(v/max)*100}%`, background: colors[i] }}
              title={`${v} posts`}/>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        {days.map(d => <div key={d} className="flex-1 text-center text-[9px] text-tx-3">{d}</div>)}
      </div>
    </div>
  )
}
