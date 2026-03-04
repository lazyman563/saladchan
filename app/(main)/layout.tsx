import Topbar from '@/components/Topbar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <main className="relative z-10">{children}</main>
    </>
  )
}
