import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code     = searchParams.get('code')
  const next     = searchParams.get('next') ?? '/feed'
  const error    = searchParams.get('error')

  if (error) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`)

  if (code) {
    const supabase = createClient()
    const { error: exchError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchError) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
