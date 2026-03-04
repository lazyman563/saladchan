import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

export const BOARDS = {
  geral:      { icon: '🥗', color: 'green',  tagClass: 'bt-green'  },
  tecnologia: { icon: '💻', color: 'teal',   tagClass: 'bt-teal'   },
  arte:       { icon: '🎨', color: 'violet', tagClass: 'bt-violet' },
  humor:      { icon: '😂', color: 'pink',   tagClass: 'bt-pink'   },
  jogos:      { icon: '🎮', color: 'orange', tagClass: 'bt-orange' },
  musica:     { icon: '🎵', color: 'sky',    tagClass: 'bt-sky'    },
} as const

export type BoardId = keyof typeof BOARDS

export function getAvatarGradient(id: string) {
  const gradients = [
    'linear-gradient(135deg,#4ade80,#2dd4bf)',
    'linear-gradient(135deg,#f472b6,#a78bfa)',
    'linear-gradient(135deg,#fb923c,#fbbf24)',
    'linear-gradient(135deg,#38bdf8,#6366f1)',
    'linear-gradient(135deg,#a3e635,#4ade80)',
    'linear-gradient(135deg,#f87171,#fb923c)',
  ]
  const num = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return gradients[num % gradients.length]
}

export async function uploadImage(
  supabase: any,
  file: File,
  bucket: string,
  path: string
): Promise<string> {
  const ext  = file.name.split('.').pop()
  const name = `${path}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(name, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(name)
  return data.publicUrl
}
