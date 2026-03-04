import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  bio:          z.string().max(300).optional(),
  location:     z.string().max(100).optional(),
  website:      z.string().url().optional().or(z.literal('')),
})

export async function GET(req: NextRequest) {
  const supabase  = createClient() as any
  const username  = new URL(req.url).searchParams.get('username')
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,bio,location,website,avatar_url,banner_url,role,verified,post_count,reply_count,like_count,created_at')
    .eq('username', username)
    .single()

  if (error || !profile) return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 })
  return NextResponse.json(profile)
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const body   = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { data, error } = await supabase.from('profiles').update(parsed.data).eq('id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
