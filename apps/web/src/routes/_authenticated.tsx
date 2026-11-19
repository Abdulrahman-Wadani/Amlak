import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { restoreSession, useAuth } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"

export const Route = createFileRoute("/_authenticated")({
  // The refresh cookie decides: wait for it, then let in or send to /signin.
  beforeLoad: async () => {
    if (!(await restoreSession())) {
      throw redirect({ to: "/signin" })
    }
  },
  component: ManagerLayout,
})

function ManagerLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!user) void navigate({ to: "/signin" })
  }, [user, navigate])
  if (!user) return null
  // For roles will be fixed later
  return <AppShell role={user.role} />
}
