import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    // mock for auth/me
    if (!sessionStorage.getItem("mockUser")) {
      throw redirect({ to: "/signin" })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b-2 border-foreground px-6 py-3">
        <span className='font-display text-lg font-extrabold'>Amlak</span>
        <div className='flex items-center gap-4'>
          <span className='font-mono text-sm'>{user?.fullname}</span>
          <Button variant="outline" onClick={() => { logout(); navigate({ to: "/signin"}) }}>
            Logout
          </Button>
        </div>
      </header>
    <main className='mx-auto max-w-5xl p-6'>
      <Outlet />
    </main>
    </div >
  )
}
