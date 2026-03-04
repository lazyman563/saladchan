# 🥗 SaladChan 1.0 — Guia de Setup Completo

## Stack
- **Next.js 14** (App Router, Server Components, API Routes)
- **Supabase** — PostgreSQL + Auth (OAuth) + Storage (imagens)
- **Resend** — Emails transacionais
- **Vercel** — Deploy automático

---

## 1. Pré-requisitos

```bash
node --version   # >= 18
npm --version    # >= 9
```

---

## 2. Clonar e instalar

```bash
git clone <seu-repo>
cd saladchan
npm install
```

---

## 3. Supabase (banco + auth + storage)

### 3.1 Criar projeto
1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. **New Project** → escolha um nome (ex: `saladchan`) e uma senha forte
3. Aguarde o projeto provisionar (~2 min)

### 3.2 Rodar o schema SQL
1. No dashboard: **SQL Editor** → **New Query**
2. Cole o conteúdo completo de `supabase/schema.sql`
3. Clique em **Run** — isso cria todas as tabelas, triggers, RLS e buckets

### 3.3 Pegar as credenciais
- **Settings → API**:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon / public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha no cliente)

### 3.4 Configurar OAuth providers
No Supabase: **Authentication → Providers**

#### Google
1. [console.cloud.google.com](https://console.cloud.google.com) → New Project
2. **APIs & Services → Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized redirect URI: `https://xxxx.supabase.co/auth/v1/callback`
5. Cole **Client ID** e **Client Secret** no Supabase → Google provider

#### GitHub
1. [github.com/settings/apps](https://github.com/settings/apps) → **OAuth Apps → New**
2. Homepage URL: `https://saladchan.vercel.app`
3. Callback URL: `https://xxxx.supabase.co/auth/v1/callback`
4. Cole **Client ID** e **Client Secret** no Supabase → GitHub provider

#### Discord
1. [discord.com/developers/applications](https://discord.com/developers/applications) → New Application
2. **OAuth2 → Redirects** → Add: `https://xxxx.supabase.co/auth/v1/callback`
3. Cole **Client ID** e **Client Secret** no Supabase → Discord provider

### 3.5 Configurar Auth settings
No Supabase: **Authentication → URL Configuration**
- Site URL: `https://saladchan.vercel.app`
- Redirect URLs: `https://saladchan.vercel.app/auth/callback`

No Supabase: **Authentication → Email Templates**
- Desabilite o email padrão de confirmação (vamos usar o Resend)
- Em **Settings → Auth**: desabilite "Enable email confirmations" 
  (vamos gerenciar OTP manualmente via Resend)

---

## 4. Resend (emails)

1. Acesse [resend.com](https://resend.com) e crie conta
2. **API Keys → Create API Key** → copie a chave
3. **Domains → Add Domain** → adicione seu domínio (ex: `saladchan.com`)
4. Adicione os registros DNS no seu provedor (Cloudflare, Namecheap, etc.)
5. Aguarde verificação (~5 min)

> 💡 Para testes sem domínio próprio, use `onboarding@resend.dev` como FROM
> (limite de 1 email/dia para o mesmo destinatário no plano grátis)

---

## 5. Variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@saladchan.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 6. Rodar localmente

```bash
npm run dev
# → http://localhost:3000
```

---

## 7. Deploy na Vercel

### 7.1 Push para GitHub
```bash
git init
git add .
git commit -m "feat: SaladChan 1.0"
git remote add origin https://github.com/seu-usuario/saladchan.git
git push -u origin main
```

### 7.2 Importar na Vercel
1. [vercel.com](https://vercel.com) → **New Project** → Import do GitHub
2. Framework: **Next.js** (auto-detectado)
3. **Environment Variables** → adicione todas as vars do `.env.local`
4. Mude `NEXT_PUBLIC_APP_URL` para `https://saladchan.vercel.app`
5. **Deploy** 🚀

### 7.3 Domínio customizado (opcional)
- Vercel → **Settings → Domains** → adicione `saladchan.com`
- Atualize `NEXT_PUBLIC_APP_URL` e os redirects no Supabase

---

## 8. Pós-deploy: Virar admin

No Supabase **SQL Editor**:

```sql
-- Substitua 'seu_username' pelo seu usuário
update public.profiles
set role = 'admin'
where username = 'seu_username';
```

---

## 9. Estrutura de pastas

```
saladchan/
├── app/
│   ├── (auth)/              # Login, Register (sem topbar)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/              # Páginas principais (com topbar)
│   │   ├── feed/page.tsx
│   │   ├── profile/[username]/page.tsx
│   │   ├── settings/page.tsx
│   │   └── dashboard/page.tsx
│   ├── api/
│   │   ├── auth/route.ts    # Register, Login, OAuth, Verify, Forgot
│   │   ├── threads/route.ts # CRUD threads
│   │   ├── replies/route.ts # CRUD replies
│   │   ├── likes/route.ts   # Toggle likes
│   │   ├── users/route.ts   # Profile CRUD
│   │   ├── upload/route.ts  # Image upload → Supabase Storage
│   │   └── admin/route.ts   # Stats, Ban, Reports, Roles
│   ├── auth/callback/       # OAuth callback
│   ├── layout.tsx           # Root layout + fonts + toaster
│   └── globals.css          # Design system CSS
├── components/
│   └── Topbar.tsx           # Topbar com auth state + notificações realtime
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   └── server.ts        # Server client + Admin client
│   ├── email.ts             # Resend — todos os templates
│   └── utils.ts             # Helpers, timeAgo, uploadImage
├── types/
│   └── database.ts          # TypeScript types completos
├── middleware.ts             # Auth session refresh + route protection
├── supabase/
│   └── schema.sql           # Schema completo (tabelas + RLS + storage)
└── .env.local.example       # Template de variáveis
```

---

## 10. Features implementadas ✅

| Feature | Status |
|---------|--------|
| Registro com email + validação | ✅ |
| Verificação de email (OTP via Resend) | ✅ |
| Login com usuário ou email | ✅ |
| OAuth: Google, GitHub, Discord | ✅ |
| Recuperação de senha por email | ✅ |
| Foto de perfil + banner (Supabase Storage) | ✅ |
| Bio, localização, website | ✅ |
| Threads com imagem, board, título | ✅ |
| Respostas com imagem | ✅ |
| Curtidas com toggle | ✅ |
| Notificações em tempo real | ✅ |
| Lightbox de imagens | ✅ |
| Dashboard admin: stats reais | ✅ |
| Dashboard: fila de moderação | ✅ |
| Dashboard: gerenciar usuários | ✅ |
| Banimento com email de notificação | ✅ |
| Troca de roles (admin/mod/user) | ✅ |
| RLS (Row Level Security) no banco | ✅ |
| Middleware de proteção de rotas | ✅ |
| Emails: boas-vindas, verificação, reset, ban, notificação reply | ✅ |

---

## 11. Custos estimados (planos gratuitos)

| Serviço | Plano grátis |
|---------|-------------|
| Vercel | Ilimitado para projetos pessoais |
| Supabase | 500MB banco, 1GB storage, 50k MAU |
| Resend | 3.000 emails/mês |

**Total: R$ 0/mês** para começar 🥗
