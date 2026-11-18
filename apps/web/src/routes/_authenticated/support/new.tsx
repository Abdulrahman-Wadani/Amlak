import { createFileRoute, redirect } from "@tanstack/react-router"

// New requests are sent from the support page itself (the design's Support).
export const Route = createFileRoute("/_authenticated/support/new")({
  beforeLoad: () => {
    throw redirect({ to: "/support" })
  },
})
