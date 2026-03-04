import type { Metadata } from 'next'
import { Nunito, Space_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: '🥗 SaladChan', template: '%s — SaladChan' },
  description: 'Um imageboard colorido, bonito e com regras.',
  openGraph: {
    title: '🥗 SaladChan',
    description: 'Um imageboard colorido, bonito e com regras.',
    siteName: 'SaladChan',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} ${spaceMono.variable}`}>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#172617',
              color: '#e8f5e8',
              border: '1.5px solid #253d25',
              borderRadius: '12px',
              fontFamily: 'var(--font-nunito)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#4ade80', secondary: '#0b150b' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#0b150b' } },
          }}
        />
      </body>
    </html>
  )
}
