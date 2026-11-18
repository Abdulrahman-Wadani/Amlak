import { createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { storedUser, useAuth } from "@/lib/auth"
import { FormPopup } from "@/components/form-popup"
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
    <FormPopup title={<Trans>Add expense</Trans>} back={{ to: "/expenses" }}>
      {accessToken && <ExpenseForm token={accessToken} />}
    </FormPopup>
  )
}
