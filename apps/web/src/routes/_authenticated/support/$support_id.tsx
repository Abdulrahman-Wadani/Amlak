import { createFileRoute, redirect } from "@tanstack/react-router"

// A request opens inside the support page (the design's Support and Support requests).
export const Route = createFileRoute("/_authenticated/support/$support_id")({
  beforeLoad: () => {
    throw redirect({ to: "/support" })
  },
})
