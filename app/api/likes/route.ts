// app/api/likes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { thread_id, reply_id } = await req.json()
  if (!thread_id && !reply_id) return NextResponse.json({ error: 'Alvo necessário.' }, { status: 400 })

  // Toggle: try insert, if conflict then delete
  const filter = thread_id
    ? { user_id: user.id, thread_id }
    : { user_id: user.id, reply_id }

  const { data: existing } = await supabase.from('likes').select('id').match(filter).single()

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id)
    return NextResponse.json({ action: 'unliked' })
  } else {
    await supabase.from('likes').insert({ user_id: user.id, ...filter })
    return NextResponse.json({ action: 'liked' })
  }
}
