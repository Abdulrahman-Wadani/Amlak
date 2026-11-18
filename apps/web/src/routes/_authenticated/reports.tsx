import { createFileRoute } from "@tanstack/react-router"
import { FinancePage } from "@/components/finance-page"

export const Route = createFileRoute("/_authenticated/reports")({
  component: () => <FinancePage view="reports" />,
})
