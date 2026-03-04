// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '@/lib/email'
import { z } from 'zod'

const registerSchema = z.object({
  username:    z.string().min(3).max(20).regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
  email:       z.string().email(),
  password:    z.string().min(8),
  displayName: z.string().min(1).max(50),
})

const loginSchema = z.object({
  identifier: z.string().min(1),  // email or username
  password:   z.string().min(1),
})


async function verifyCaptcha(token: string) {
  if (!token) return false
  const res = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: process.env.HCAPTCHA_SECRET!, response: token })
  })
  const data = await res.json()
  return data.success
}

export async function POST(req: NextRequest) {
  const { action, ...body } = await req.json()
  const supabase = createClient()
  const admin    = createAdminClient()

  // ── REGISTER ──────────────────────────────────────────────────────────────
  if (action === 'register') {
    const captchaOk = await verifyCaptcha(body.captchaToken)
    if (!captchaOk) return NextResponse.json({ error: 'Captcha inválido.' }, { status: 400 })
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    const { username, email, password, displayName } = parsed.data

    // Check username uniqueness
    const { data: existing } = await admin.from('profiles').select('id').eq('username', username).single()
    if (existing) return NextResponse.json({ error: 'Usuário já existe.' }, { status: 409 })

    // Create Supabase auth user (email_confirm=false so we handle OTP ourselves)
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { username, full_name: displayName },
        emailRedirectTo: undefined,
      },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Update display_name on the auto-created profile
    if (data.user) {
      await admin.from('profiles').update({ display_name: displayName, username }).eq('id', data.user.id)

      // Send our custom verification email via Resend
      // Supabase will generate a OTP we can send ourselves:
      const { data: otpData } = await admin.auth.admin.generateLink({
        type: 'signup', email,
      })
      const otp = otpData?.properties?.email_otp ?? '------'
      await sendVerificationEmail(email, username, otp)
    }

    return NextResponse.json({ ok: true, userId: data.user?.id })
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const captchaOk = await verifyCaptcha(body.captchaToken)
    if (!captchaOk) return NextResponse.json({ error: 'Captcha inválido.' }, { status: 400 })
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    const { identifier, password } = parsed.data

    let email = identifier
    // If identifier is a username, resolve to email
    if (!identifier.includes('@')) {
      const { data: prof } = await admin.from('profiles').select('id').eq('username', identifier).single()
      if (!prof) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
      const { data: authUser } = await admin.auth.admin.getUserById(prof.id)
      email = authUser.user?.email ?? identifier
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 })

    // Check if banned
    const { data: ban } = await admin.from('bans').select('reason,expires_at').eq('user_id', data.user.id).single()
    if (ban) {
      const expired = ban.expires_at && new Date(ban.expires_at) < new Date()
      if (!expired) {
        await supabase.auth.signOut()
        return NextResponse.json({ error: `Conta banida: ${ban.reason}` }, { status: 403 })
      }
      // Ban expired — remove it
      await admin.from('bans').delete().eq('user_id', data.user.id)
    }

    return NextResponse.json({ ok: true })
  }

  // ── VERIFY EMAIL OTP ─────────────────────────────────────────────────────
  if (action === 'verify') {
    const { email, token } = body
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
    if (error) return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 })
    if (data.user) {
      await admin.from('profiles').update({ verified: true }).eq('id', data.user.id)
      const { data: prof } = await admin.from('profiles').select('username').eq('id', data.user.id).single()
      await sendWelcomeEmail(email, prof?.username ?? 'amigo')
    }
    return NextResponse.json({ ok: true })
  }

  // ── FORGOT PASSWORD ──────────────────────────────────────────────────────
  if (action === 'forgot') {
    const { email } = body
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetLink })
    // Always return ok to avoid email enumeration
    return NextResponse.json({ ok: true })
  }

  // ── OAUTH SIGN-IN (returns URL, client handles redirect) ─────────────────
  if (action === 'oauth') {
    const { provider } = body as { provider: 'google'|'github'|'discord' }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        scopes: provider === 'discord' ? 'identify email' : undefined,
      },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ url: data.url })
  }

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 })
}
