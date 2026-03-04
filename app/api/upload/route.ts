// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKETS = {
  avatar:  { bucket: 'avatars',       maxSize: 2 * 1024 * 1024  },
  banner:  { bucket: 'banners',       maxSize: 5 * 1024 * 1024  },
  thread:  { bucket: 'thread-images', maxSize: 10 * 1024 * 1024 },
  reply:   { bucket: 'reply-images',  maxSize: 5 * 1024 * 1024  },
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const formData = await req.formData()
  const file  = formData.get('file') as File | null
  const type  = (formData.get('type') as string) ?? 'thread'

  if (!file) return NextResponse.json({ error: 'Arquivo obrigatório.' }, { status: 400 })

  const config = BUCKETS[type as keyof typeof BUCKETS]
  if (!config)  return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })

  if (file.size > config.maxSize)
    return NextResponse.json({ error: `Arquivo muito grande (máx. ${config.maxSize / 1024 / 1024}MB).` }, { status: 413 })

  const allowed = ['image/jpeg','image/png','image/gif','image/webp']
  if (!allowed.includes(file.type))
    return NextResponse.json({ error: 'Tipo de arquivo não permitido.' }, { status: 415 })

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(config.bucket).upload(path, file, { upsert: true, contentType: file.type })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from(config.bucket).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
