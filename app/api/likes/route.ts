import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { thread_id, reply_id } = await req.json()
  if (!thread_id && !reply_id) return NextResponse.json({ error: 'Alvo necessario.' }, { status: 400 })

  const col = thread_id ? 'thread_id' : 'reply_id'
  const val = thread_id || reply_id

  const { data: existing } = await supabase.from('likes').select('id').eq('user_id', user.id).eq(col, val).maybeSingle()

  if (existing) {
    await supabase.from('likes').delete().eq('id', (existing as any).id)
    return NextResponse.json({ action: 'unliked' })
  } else {
    await (supabase.from('likes') as any).insert({ user_id: user.id, [col]: val })
    return NextResponse.json({ action: 'liked' })
  }
}
