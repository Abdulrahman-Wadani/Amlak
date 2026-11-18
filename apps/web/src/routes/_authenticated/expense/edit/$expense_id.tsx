import { useEffect, useState } from "react"
import { createFileRoute, redirect, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import type { Expense } from "@amlak/shared"
import { storedUser, useAuth } from "@/lib/auth"
import { getExpenseById } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Page } from "@/components/page"
import { LoadError } from "@/components/states"
import { ExpenseForm } from "@/components/expense-form"

export const Route = createFileRoute("/_authenticated/expense/edit/$expense_id")({
  beforeLoad: () => {
    if (storedUser()?.role !== "MANAGER") throw redirect({ to: "/home" })
  },
  component: EditExpense,
})

function EditExpense() {
  const { expense_id } = useParams({ from: "/_authenticated/expense/edit/$expense_id" })
  const { accessToken } = useAuth()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    getExpenseById(accessToken, expense_id)
      .then(setExpense)
      .catch(() => setFailed(true))
  }, [accessToken, expense_id])

  return (
    <Page title={<Trans>Edit expense</Trans>} parent={{ label: <Trans>Expenses</Trans>, link: { to: "/expenses" } }} phoneEnd="none" tabs={false}>
      {failed ? (
        <LoadError title={<Trans>Could not load this expense</Trans>} onRetry={() => window.location.reload()} />
      ) : expense && accessToken ? (
        <ExpenseForm token={accessToken} expense={expense} />
      ) : (
        <Skeleton className="h-96" />
      )}
    </Page>
  )
}
