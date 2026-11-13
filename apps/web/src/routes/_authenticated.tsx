import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (!sessionStorage.getItem("authUser")) {
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
  return <AppShell role="manager" />
}
