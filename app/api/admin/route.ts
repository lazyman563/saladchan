// app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendBanEmail } from '@/lib/email'

async function requireMod(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!prof || !['mod','admin'].includes(prof.role)) return null
  return user
}

// GET /api/admin?action=stats|reports|users|threads
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()
  const user     = await requireMod(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const action = new URL(req.url).searchParams.get('action')

  if (action === 'stats') {
    const [
      { count: totalUsers },
      { count: totalThreads },
      { count: totalReplies },
      { count: pendingReports },
    ] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('threads').select('*',  { count: 'exact', head: true }),
      admin.from('replies').select('*',  { count: 'exact', head: true }),
      admin.from('reports').select('*',  { count: 'exact', head: true }).eq('status','pending'),
    ])

    // Posts per board
    const { data: boards } = await admin.from('boards').select('id,name,icon,color,thread_count')

    // Top threads by likes
    const { data: topThreads } = await admin.from('threads')
      .select('id,title,board_id,like_count,reply_count')
      .order('like_count', { ascending: false }).limit(5)

    // Recent users
    const { data: recentUsers } = await admin.from('profiles')
      .select('id,username,display_name,email:id,role,verified,post_count,created_at')
      .order('created_at', { ascending: false }).limit(10)

    return NextResponse.json({ totalUsers, totalThreads, totalReplies, pendingReports, boards, topThreads, recentUsers })
  }

  if (action === 'reports') {
    const { data, error } = await admin.from('reports')
      .select(`*, reporter:profiles!reporter_id(username,display_name),
               thread:threads!thread_id(id,title), reply:replies!reply_id(id,body)`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (action === 'users') {
    const page  = parseInt(new URL(req.url).searchParams.get('page') ?? '0')
    const limit = 20
    const { data, error } = await admin.from('profiles')
      .select('*').order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}

// POST /api/admin — ban, unban, resolve_report, set_role, delete_thread
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()
  const user     = await requireMod(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { action, ...body } = await req.json()

  if (action === 'ban') {
    const { userId, reason, expiresAt } = body
    // Get user email for notification
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    const { data: prof } = await admin.from('profiles').select('username').eq('id', userId).single()
    await admin.from('bans').upsert({ user_id: userId, banned_by: user.id, reason, expires_at: expiresAt ?? null })
    if (authUser.user?.email && prof) {
      await sendBanEmail(authUser.user.email, prof.username, reason, !expiresAt)
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'unban') {
    await admin.from('bans').delete().eq('user_id', body.userId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'resolve_report') {
    await admin.from('reports').update({ status: body.status, resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', body.reportId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'set_role') {
    const { data: myProf } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if ((myProf as any)?.role !== 'admin') return NextResponse.json({ error: 'Apenas admin pode mudar roles.' }, { status: 403 })
    await admin.from('profiles').update({ role: body.role }).eq('id', body.userId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_content') {
    if (body.threadId) await admin.from('threads').delete().eq('id', body.threadId)
    if (body.replyId)  await admin.from('replies').delete().eq('id', body.replyId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}
