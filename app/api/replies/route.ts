import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const threadId = new URL(req.url).searchParams.get('thread_id')
  if (!threadId) return NextResponse.json({ error: 'thread_id required' }, { status: 400 })

  const { data: { user } } = await supabase.auth.getUser()
  const db = supabase as any

  const { data: replies, error } = await db
    .from('replies')
    .select('*, author:profiles!author_id(id,username,display_name,avatar_url,role,verified)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const r = (replies ?? []) as any[]
  let likedIds: string[] = []
  if (user && r.length) {
    const ids = r.map((x: any) => x.id)
    const { data: likes } = await db.from('likes').select('reply_id').eq('user_id', user.id).in('reply_id', ids)
    likedIds = ((likes ?? []) as any[]).map((l: any) => l.reply_id)
  }

  return NextResponse.json(r.map((x: any) => ({ ...x, liked_by_me: likedIds.includes(x.id) })))
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { thread_id, body, image_url } = await req.json()
  if (!thread_id || !body?.trim()) return NextResponse.json({ error: 'Dados obrigatorios.' }, { status: 400 })

  const { data: thread } = await db.from('threads').select('locked,author_id').eq('id', thread_id).single()
  if (!thread) return NextResponse.json({ error: 'Thread nao encontrada.' }, { status: 404 })
  if (thread.locked) return NextResponse.json({ error: 'Thread bloqueada.' }, { status: 403 })

  const admin = createAdminClient() as any
  const { data: ban } = await admin.from('bans').select('id').eq('user_id', user.id).single()
  if (ban) return NextResponse.json({ error: 'Conta banida.' }, { status: 403 })

  const { data: reply, error } = await db.from('replies').insert({
    thread_id, author_id: user.id, body: body.trim(), image_url: image_url ?? '',
  }).select('*, author:profiles!author_id(*)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(reply, { status: 201 })
}
