import { createFileRoute, redirect } from "@tanstack/react-router"

// Finance became two pages; old links open the expense log.
export const Route = createFileRoute("/_authenticated/finance")({
  beforeLoad: () => {
    throw redirect({ to: "/expenses" })
  },
})
