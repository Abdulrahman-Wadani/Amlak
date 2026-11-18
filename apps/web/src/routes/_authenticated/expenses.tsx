import { useEffect, useState } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { ChevronLeft, ChevronRight, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react"
import type { Expense, ExpenseCategory, Place } from "@amlak/shared"
import { storedUser, useAuth } from "@/lib/auth"
import { apiAllPages, deleteExpense, getPlaces } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { useFormat } from "@/lib/format"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"
import { Page } from "@/components/page"
import { Field, FilterTabs, NativeSelect } from "@/components/panel"
import { ConfirmDialog, EmptyState, LoadError, LoadingList } from "@/components/states"
import { toast } from "@/components/toast"
import { Amount, CATEGORIES, CategoryChip, categoryLabel } from "@/components/finance-parts"
import { isoDay } from "@/components/booking-parts"

export const Route = createFileRoute("/_authenticated/expenses")({
  // Expenses are the Manager's (the API refuses everyone else).
  beforeLoad: () => {
    if (storedUser()?.role !== "MANAGER") throw redirect({ to: "/home" })
  },
  component: ExpensesPage,
})

type Filter = "ALL" | ExpenseCategory

/** The month's expenses across the places (or one place), by category, with the month's total. */
function ExpensesPage() {
  const { accessToken } = useAuth()
  const { number, date, dateFormat } = useFormat()
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placeId, setPlaceId] = useState("")
  const [filter, setFilter] = useState<Filter>("ALL")
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [toDelete, setToDelete] = useState<Expense | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    if (!accessToken) return
    getPlaces(accessToken)
      .then(setPlaces)
      .catch(() => setFailed(true))
  }, [accessToken])

  // Expenses are listed per place; "All places" reads each place's month.
  useEffect(() => {
    if (!accessToken || !places) return
    let alive = true
    setExpenses(null)
    setFailed(false)
    const from = isoDay(month)
    const to = isoDay(new Date(month.getFullYear(), month.getMonth() + 1, 0))
    const shown = places.filter((p) => !placeId || p.id === placeId)
    Promise.all(shown.map((p) => apiAllPages<Expense>(`/places/${p.id}/expenses?from=${from}&to=${to}`, accessToken)))
      .then((lists) => {
        if (!alive) return
        setExpenses(lists.flat().sort((a, b) => b.expense_date.localeCompare(a.expense_date)))
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, places, placeId, month, reload])

  const names = Object.fromEntries((places ?? []).map((p) => [p.id, p.place_name]))
  const countFor = (key: Filter) => expenses?.filter((e) => key === "ALL" || e.category === key).length ?? 0
  const shown = expenses?.filter((e) => filter === "ALL" || e.category === filter) ?? []
  // Places can use different currencies, so the total is per currency.
  const totals = new Map<string, number>()
  for (const expense of expenses ?? []) totals.set(expense.currency, (totals.get(expense.currency) ?? 0) + expense.amount)
  const monthName = dateFormat({ month: "long" }).format(month)
  const thisMonth = isoDay(month).slice(0, 7) === isoDay(new Date()).slice(0, 7)

  async function remove() {
    if (!accessToken || !toDelete) return
    setBusy(true)
    setDeleteError("")
    try {
      await deleteExpense(accessToken, toDelete.id)
      setToDelete(null)
      toast(t`Expense deleted.`)
      setReload((n) => n + 1)
    } catch (err) {
      setDeleteError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const iconButton =
    "am-icon inline-flex size-11 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-[18px]"

  return (
    <Page
      title={<Trans>Expenses</Trans>}
      description={<Trans>Visible to the manager only.</Trans>}
      phoneActions={false}
      phoneEnd={{ label: t`Add expense`, icon: "plus", link: { to: "/expense/new" } }}
      actions={
        <Link to="/expense/new" className={cn(buttonVariants())}>
          <Plus aria-hidden="true" />
          <Trans>Add expense</Trans>
        </Link>
      }
    >
      <section className="box-border flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-5 py-6 shadow-sm">
        <div className="flex items-center gap-1">
          <button type="button" aria-label={t`Previous month`} className={iconButton} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft aria-hidden="true" className="rtl:rotate-180" strokeWidth={1.8} />
          </button>
          <span className="text-[15px] text-muted-foreground">
            <Trans>{monthName} total</Trans>
          </span>
          <button
            type="button"
            aria-label={t`Next month`}
            className={iconButton}
            disabled={thisMonth}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <ChevronRight aria-hidden="true" className="rtl:rotate-180" strokeWidth={1.8} />
          </button>
        </div>
        <span className="flex flex-wrap gap-x-4 text-[28px]">
          {totals.size === 0 ? (
            <Amount value={0} currency={places?.[0]?.currency ?? ""} format={number} />
          ) : (
            [...totals].map(([currency, value]) => <Amount key={currency} value={value} currency={currency} format={number} />)
          )}
        </span>
      </section>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="w-full desk:w-[240px]">
          <Field id="expense-place" label={<Trans>Place</Trans>}>
            <NativeSelect id="expense-place" value={placeId} onChange={setPlaceId}>
              <option value="">{t`All places`}</option>
              {places?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.place_name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="w-full min-w-0 desk:w-auto desk:flex-1">
          <FilterTabs
            label={t`Filter by category`}
            value={filter}
            onChange={setFilter}
            tabs={[
              { key: "ALL" as Filter, label: <Trans>All</Trans>, count: countFor("ALL") },
              ...CATEGORIES.map((c) => ({ key: c as Filter, label: categoryLabel(c), count: countFor(c) })),
            ]}
          />
        </div>
        <Link to="/reports" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-foreground underline underline-offset-4">
          <Trans>Financial reports</Trans>
        </Link>
      </div>

      {failed ? (
        <LoadError title={<Trans>Could not load expenses</Trans>} onRetry={() => setReload((n) => n + 1)} />
      ) : expenses === null ? (
        <LoadingList />
      ) : shown.length === 0 ? (
        <EmptyState
          title={<Trans>No expenses this month</Trans>}
          text={<Trans>Expenses you add for this month will appear here.</Trans>}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] items-stretch gap-4">
          {shown.map((expense) => (
            <div key={expense.id} className="box-border flex min-w-0 flex-col gap-2.5 border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col leading-[1.5]">
                  <span dir="auto" className="truncate font-semibold">
                    {expense.description || categoryLabel(expense.category)}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {t`${names[expense.place_id] ?? ""}, ${date(expense.expense_date, { day: "numeric", month: "long" })}`}
                  </span>
                </div>
                <Amount value={expense.amount} currency={expense.currency} format={number} className="text-[17px]" />
              </div>
              <div className="mt-auto flex items-center justify-between gap-2">
                <CategoryChip category={expense.category} />
                <div className="flex items-center">
                  {expense.receipt_url && (
                    <a href={expense.receipt_url} target="_blank" rel="noreferrer" aria-label={t`Open the receipt`} className={`${iconButton} text-primary`}>
                      <ImageIcon aria-hidden="true" strokeWidth={1.8} />
                    </a>
                  )}
                  <Link
                    to="/expense/edit/$expense_id"
                    params={{ expense_id: expense.id }}
                    aria-label={t`Edit expense`}
                    className={`${iconButton} text-foreground`}
                  >
                    <Pencil aria-hidden="true" strokeWidth={1.8} />
                  </Link>
                  <button
                    type="button"
                    aria-label={t`Delete expense`}
                    className={`${iconButton} text-destructive`}
                    onClick={() => {
                      setDeleteError("")
                      setToDelete(expense)
                    }}
                  >
                    <Trash2 aria-hidden="true" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          open
          title={<Trans>Delete this expense?</Trans>}
          text={<Trans>It disappears from the expenses and the financial reports. This cannot be undone from the app.</Trans>}
          confirm={busy ? <Trans>Deleting…</Trans> : <Trans>Delete expense</Trans>}
          busy={busy}
          error={deleteError}
          onConfirm={() => void remove()}
          onClose={() => setToDelete(null)}
        />
      )}
    </Page>
  )
}
