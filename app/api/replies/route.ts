// app/api/replies/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/replies?thread_id=x
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const threadId = new URL(req.url).searchParams.get('thread_id')
  if (!threadId) return NextResponse.json({ error: 'thread_id required' }, { status: 400 })

  const { data: { user } } = await supabase.auth.getUser()

  const { data: replies, error } = await supabase
    .from('replies')
    .select('*, author:profiles!author_id(id,username,display_name,avatar_url,role,verified)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let likedIds: string[] = []
  if (user && replies?.length) {
    const ids = replies.map(r => r.id)
    const { data: likes } = await supabase.from('likes').select('reply_id').eq('user_id', user.id).in('reply_id', ids)
    likedIds = (likes ?? []).map(l => l.reply_id!)
  }

  return NextResponse.json((replies ?? []).map(r => ({ ...r, liked_by_me: likedIds.includes(r.id) })))
}

// POST /api/replies
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { thread_id, body, image_url } = await req.json()
  if (!thread_id || !body?.trim()) return NextResponse.json({ error: 'Dados obrigatórios.' }, { status: 400 })

  // Check thread exists and is not locked
  const { data: thread } = await supabase.from('threads').select('locked,author_id').eq('id', thread_id).single()
  if (!thread) return NextResponse.json({ error: 'Thread não encontrada.' }, { status: 404 })
  if (thread.locked) return NextResponse.json({ error: 'Thread bloqueada.' }, { status: 403 })

  // Check ban
  const admin = createAdminClient()
  const { data: ban } = await admin.from('bans').select('id').eq('user_id', user.id).single()
  if (ban) return NextResponse.json({ error: 'Conta banida.' }, { status: 403 })

  const { data: reply, error } = await supabase.from('replies').insert({
    thread_id, author_id: user.id, body: body.trim(), image_url: image_url ?? '',
  }).select('*, author:profiles!author_id(*)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(reply, { status: 201 })
}
