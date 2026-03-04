import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSchema = z.object({
  board_id:  z.string(),
  title:     z.string().min(3).max(200),
  body:      z.string().min(10).max(10000),
  image_url: z.string().url().optional().or(z.literal('')),
})

export async function GET(req: NextRequest) {
  const supabase = createClient() as any
  const { searchParams } = new URL(req.url)
  const board  = searchParams.get('board')
  const sort   = searchParams.get('sort') ?? 'new'
  const page   = parseInt(searchParams.get('page') ?? '0')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)
  const search = searchParams.get('search') ?? ''

  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('threads')
    .select('*, author:profiles!author_id(id,username,display_name,avatar_url,role,verified), board:boards!board_id(id,name,icon,color)')
    .range(page * limit, (page + 1) * limit - 1)

  if (board)  query = query.eq('board_id', board)
  if (search) query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`)

  if (sort === 'hot')          query = query.order('like_count', { ascending: false })
  else if (sort === 'replies') query = query.order('reply_count', { ascending: false })
  else                         query = query.order('pinned', { ascending: false }).order('created_at', { ascending: false })

  const { data: threads, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const t = (threads ?? []) as any[]
  let likedIds: string[] = []
  if (user && t.length) {
    const ids = t.map((x: any) => x.id)
    const { data: likes } = await supabase.from('likes').select('thread_id').eq('user_id', user.id).in('thread_id', ids)
    likedIds = ((likes ?? []) as any[]).map((l: any) => l.thread_id)
  }

  return NextResponse.json(t.map((x: any) => ({ ...x, liked_by_me: likedIds.includes(x.id) })))
}

export async function POST(req: NextRequest) {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const body   = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const admin = createAdminClient() as any
  const { data: ban } = await admin.from('bans').select('id').eq('user_id', user.id).single()
  if (ban) return NextResponse.json({ error: 'Sua conta esta banida.' }, { status: 403 })

  const { data: thread, error } = await supabase.from('threads').insert({
    board_id:  parsed.data.board_id,
    author_id: user.id,
    title:     parsed.data.title,
    body:      parsed.data.body,
    image_url: parsed.data.image_url ?? '',
  }).select('*, author:profiles!author_id(*), board:boards!board_id(*)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(thread, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient() as any
  const admin    = createAdminClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { id, action } = await req.json()
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (['pin','lock','delete_mod'].includes(action) && !['mod','admin'].includes((prof as any)?.role ?? ''))
    return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })

  if (action === 'pin')        { await admin.from('threads').update({ pinned: true  }).eq('id', id); return NextResponse.json({ ok: true }) }
  if (action === 'unpin')      { await admin.from('threads').update({ pinned: false }).eq('id', id); return NextResponse.json({ ok: true }) }
  if (action === 'lock')       { await admin.from('threads').update({ locked: true  }).eq('id', id); return NextResponse.json({ ok: true }) }
  if (action === 'delete_mod') { await admin.from('threads').delete().eq('id', id);                  return NextResponse.json({ ok: true }) }

  return NextResponse.json({ error: 'Acao desconhecida.' }, { status: 400 })
}
