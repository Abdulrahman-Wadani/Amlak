import { createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { storedUser, useAuth } from "@/lib/auth"
import { Page } from "@/components/page"
import { ExpenseForm } from "@/components/expense-form"

export const Route = createFileRoute("/_authenticated/expense/new")({
  beforeLoad: () => {
    if (storedUser()?.role !== "MANAGER") throw redirect({ to: "/home" })
  },
  component: AddExpense,
})

function AddExpense() {
  const { accessToken } = useAuth()
  return (
    <Page title={<Trans>Add expense</Trans>} parent={{ label: <Trans>Expenses</Trans>, link: { to: "/expenses" } }} phoneEnd="none" tabs={false}>
      {accessToken && <ExpenseForm token={accessToken} />}
    </Page>
  )
}
