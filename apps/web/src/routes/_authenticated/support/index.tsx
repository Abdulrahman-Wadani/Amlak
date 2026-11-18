import { createFileRoute } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { AdminSupport } from "@/components/admin-support"
import { UserSupport } from "@/components/user-support"

export const Route = createFileRoute("/_authenticated/support/")({
  component: SupportPage,
})

/** Admins answer every request; everyone else sends theirs and reads the replies. */
function SupportPage() {
  const { user } = useAuth()
  return user?.role === "ADMIN" ? <AdminSupport /> : <UserSupport />
}
