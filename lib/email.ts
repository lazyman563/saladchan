import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'noreply@saladchan.com'
const APP    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ─── Base HTML wrapper ────────────────────────────────────────────────────────
function baseEmail(title: string, content: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#0b150b;font-family:sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#172617;border:1.5px solid #253d25;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#0d1f0d,#162616);padding:28px 32px;border-bottom:1px solid #253d25;text-align:center">
      <div style="font-size:2.5rem">🥗</div>
      <div style="font-size:1.5rem;font-weight:900;background:linear-gradient(120deg,#4ade80,#2dd4bf);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-top:8px">SaladChan</div>
    </div>
    <div style="padding:32px">${content}</div>
    <div style="padding:20px 32px;border-top:1px solid #253d25;text-align:center;font-size:12px;color:#567856">
      © ${new Date().getFullYear()} SaladChan — <a href="${APP}/rules" style="color:#4ade80">Regras</a> · <a href="${APP}/privacy" style="color:#4ade80">Privacidade</a>
    </div>
  </div>
</body></html>`
}

const h1 = (t: string) => `<h1 style="font-size:22px;font-weight:900;color:#e8f5e8;margin:0 0 12px">${t}</h1>`
const p  = (t: string) => `<p style="font-size:15px;color:#9dbb9d;line-height:1.6;margin:0 0 20px">${t}</p>`
const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#4ade80,#2dd4bf);color:#0b150b;font-weight:800;font-size:15px;border-radius:100px;text-decoration:none;margin-bottom:20px">${label}</a>`
const code = (c: string) =>
  `<div style="text-align:center;margin:20px 0"><span style="font-size:36px;font-weight:900;font-family:monospace;letter-spacing:12px;color:#4ade80;background:#0f1c0f;padding:16px 24px;border-radius:12px;border:1.5px solid #253d25">${c}</span></div>`

// ─── Email senders ────────────────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, username: string, otp: string) {
  return resend.emails.send({
    from: `SaladChan 🥗 <${FROM}>`,
    to:   [email],
    subject: '🥗 Verifique seu email — SaladChan',
    html: baseEmail('Verifique seu email', `
      ${h1('Bem-vindo ao SaladChan, @' + username + '!')}
      ${p('Use o código abaixo para verificar seu endereço de email. O código expira em <strong style="color:#fbbf24">15 minutos</strong>.')}
      ${code(otp)}
      ${p('Se você não criou uma conta no SaladChan, ignore este email.')}
    `),
  })
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  return resend.emails.send({
    from: `SaladChan 🥗 <${FROM}>`,
    to:   [email],
    subject: '🔒 Redefinir senha — SaladChan',
    html: baseEmail('Redefinir senha', `
      ${h1('Redefinir sua senha')}
      ${p('Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha.')}
      ${btn(resetLink, '🔒 Redefinir Senha')}
      ${p('Este link expira em <strong style="color:#fbbf24">1 hora</strong>. Se você não solicitou a redefinição, ignore este email.')}
    `),
  })
}

export async function sendWelcomeEmail(email: string, username: string) {
  return resend.emails.send({
    from: `SaladChan 🥗 <${FROM}>`,
    to:   [email],
    subject: '🥗 Conta verificada! Bem-vindo ao SaladChan',
    html: baseEmail('Conta verificada!', `
      ${h1('Sua conta está verificada! ✅')}
      ${p('Parabéns, @' + username + '! Sua conta no SaladChan foi verificada com sucesso. Agora você tem acesso completo à plataforma.')}
      ${btn(APP + '/feed', '🥗 Ir para o Feed')}
      ${p('Lembre-se de ler as <a href="${APP}/rules" style="color:#4ade80">regras da comunidade</a> antes de começar a postar. Boas conversas!')}
    `),
  })
}

export async function sendBanEmail(email: string, username: string, reason: string, permanent: boolean) {
  return resend.emails.send({
    from: `SaladChan 🥗 <${FROM}>`,
    to:   [email],
    subject: '⚠️ Conta banida — SaladChan',
    html: baseEmail('Conta banida', `
      ${h1('Sua conta foi banida')}
      ${p('Olá @' + username + ', sua conta foi banida da plataforma SaladChan.')}
      <div style="background:#1d301d;border:1.5px solid rgba(248,113,113,.3);border-radius:12px;padding:16px;margin-bottom:20px">
        <div style="font-size:12px;color:#f87171;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Motivo</div>
        <div style="color:#e8f5e8;font-size:14px">${reason}</div>
      </div>
      ${p(permanent ? 'Este banimento é permanente.' : 'Se acreditar que foi um erro, entre em contato com a moderação.')}
    `),
  })
}

export async function sendReplyNotificationEmail(
  email: string, username: string, replier: string, threadTitle: string, threadUrl: string
) {
  return resend.emails.send({
    from: `SaladChan 🥗 <${FROM}>`,
    to:   [email],
    subject: `💬 ${replier} respondeu sua thread — SaladChan`,
    html: baseEmail('Nova resposta', `
      ${h1('Nova resposta na sua thread!')}
      ${p('<strong style="color:#2dd4bf">@' + replier + '</strong> respondeu à sua thread <strong style="color:#e8f5e8">"' + threadTitle + '"</strong>.')}
      ${btn(threadUrl, '💬 Ver Resposta')}
    `),
  })
}
