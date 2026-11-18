import { useEffect, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import type { Expense, ExpenseCategory, Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import {
  getPlaces,
  expenseslist,
  getFinancialReport,
  createExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  type FinancialReport,
  type ExpenseInput,
} from "@/lib/api"
import { S } from "@/lib/dom-style"
import { errorMessage } from "@/lib/errors"

import { Wallet, Building2, CalendarDays, Receipt, TrendingDown, TrendingUp, FileText, AlertCircle, Plus, Pencil, Trash2, X, Save, BarChart3 } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Skeleton } from "@/components/ui/skeleton"
import { Page } from "@/components/page"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

/**
 * The manager's money pages: /expenses (the expense log) and /reports (the
 * budget, income and profit for a period). Both filter by place.
 */
type CategoryKey = "ALL" | ExpenseCategory

const CATEGORIES: ExpenseCategory[] = [
  "MAINTENANCE",
  "UTILITIES",
  "TAXES",
  "CLEANING",
  "SUPPLIES",
  "OTHER",
]

function localDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function FinancePage({ view }: { view: "expenses" | "reports" }) {
  const { i18n } = useLingui()
  const { accessToken } = useAuth()


  const [places, setPlaces] = useState<Place[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [report, setReport] = useState<FinancialReport | null>(null)

  const [placeFilter, setPlaceFilter] = useState("ALL")
  const [category, setCategory] = useState<CategoryKey>("ALL")

  const [placesLoading, setPlacesLoading] = useState(true)
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)

  const [placesError, setPlacesError] = useState("")
  const [expensesError, setExpensesError] = useState("")
  const [reportError, setReportError] = useState("")

  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

  const [from, setFrom] = useState(localDate(firstDay))
  const [to, setTo] = useState(localDate(today))

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState("")

  const [form, setForm] = useState<{
    place_id: string
    category: ExpenseCategory
    amount: string
    expense_date: string
    description: string
    ticket_id: string
    receipt: File | null
  }>({
    place_id: "",
    category: "MAINTENANCE",
    amount: "",
    expense_date: localDate(today),
    description: "",
    ticket_id: "",
    receipt: null,
  })

  const money = new Intl.NumberFormat(i18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const dayFormatter = new Intl.DateTimeFormat(i18n.locale, {
    dateStyle: "medium",
  })

  const monthLabel = new Intl.DateTimeFormat(
    i18n.locale,
    {
      month: "long",
      year: "numeric",
    },
  ).format(today)

  function categoryLabel(value: ExpenseCategory) {
    switch (value) {
      case "MAINTENANCE":
        return t`Maintenance`
      case "UTILITIES":
        return t`Utilities`
      case "TAXES":
        return t`Taxes`
      case "CLEANING":
        return t`Cleaning`
      case "SUPPLIES":
        return t`Supplies`
      case "OTHER":
        return t`Other`
    }
  }

  function getPlaceName(placeId: string) {
    return places.find((place) => place.id === placeId)?.place_name ?? placeId
  }

  function getPlaceCurrency(placeId: string) {
    return places.find((place) => place.id === placeId)?.currency ?? "SAR"
  }

  // Load places
  useEffect(() => {
    if (!accessToken) return

    let alive = true

    setPlacesLoading(true)
    setPlacesError("")

    getPlaces(accessToken)
      .then((result) => {
        if (alive) {
          setPlaces(result)
          setForm((current) => ({
            ...current,
            place_id: current.place_id || result[0]?.id || "",
          }))
        }
      })
      .catch((error) => {
        console.error(error)
        if (alive) {
          setPlacesError(
            t`Failed to load places.`,
          )
        }
      })
      .finally(() => {
        if (alive) setPlacesLoading(false)
      })

    return () => {
      alive = false
    }
  }, [accessToken])

  // Load expenses
  useEffect(() => {
    if (!accessToken || placesLoading || places.length === 0) {
      if (!placesLoading && places.length === 0) {
        setExpenses([])
      }
      return
    }

    let alive = true

    async function loadExpenses() {
      try {
        setExpensesLoading(true)
        setExpensesError("")

        const selectedPlaces =
          placeFilter === "ALL"
            ? places
            : places.filter((place) => place.id === placeFilter)

        const responses = await Promise.all(
          selectedPlaces.map((place) =>
            expenseslist(accessToken!, place.id),
          ),
        )

        if (alive) {
          setExpenses(responses.flat())
        }
      } catch (error) {
        console.error(error)
        if (alive) {
          setExpenses([])
          setExpensesError(
            t`Failed to load expenses. Please try again.`,
          )
        }
      } finally {
        if (alive) setExpensesLoading(false)
      }
    }

    void loadExpenses()

    return () => {
      alive = false
    }
  }, [accessToken, places, placesLoading, placeFilter])

  // Load financial report
  useEffect(() => {
    if (!accessToken || !from || !to || from > to) return

    let alive = true

    async function loadReport() {
      try {
        setReportLoading(true)
        setReportError("")

        const result = await getFinancialReport(accessToken!, {
          from,
          to,
          ...(placeFilter !== "ALL" ? { place_id: placeFilter } : {}),
        })

        if (alive) setReport(result)
      } catch (error) {
        console.error(error)
        if (alive) {
          setReport(null)
          setReportError(
            t`Failed to load financial report.`,
          )
        }
      } finally {
        if (alive) setReportLoading(false)
      }
    }

    void loadReport()

    return () => {
      alive = false
    }
  }, [accessToken, from, to, placeFilter])

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(
        (expense) =>
          category === "ALL" || expense.category === category,
      )
      .sort(
        (a, b) =>
          new Date(b.expense_date).getTime() -
          new Date(a.expense_date).getTime(),
      )
  }, [expenses, category])

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      ALL: expenses.length,
      MAINTENANCE: 0,
      UTILITIES: 0,
      TAXES: 0,
      CLEANING: 0,
      SUPPLIES: 0,
      OTHER: 0,
    }

    expenses.forEach((expense) => {
      counts[expense.category]++
    })

    return counts
  }, [expenses])

  const budgetByCurrency = useMemo(() => {
    const result: Record<string, number> = {}

    const selectedPlaces =
      placeFilter === "ALL"
        ? places
        : places.filter((place) => place.id === placeFilter)

    selectedPlaces.forEach((place) => {
      const currency = place.currency || "SAR"
      result[currency] =
        (result[currency] || 0) +
        Number(place.monthly_maintenance_budget || 0)
    })

    return result
  }, [places, placeFilter])

  const selectedReportTotals = report?.totals_by_currency ?? []

  function formatMoney(amount: number) {
    return money.format(Number(amount || 0))
  }

  function openCreateForm() {
    setEditingId(null)
    setFormError("")
    setForm({
      place_id: placeFilter !== "ALL" ? placeFilter : places[0]?.id ?? "",
      category: "MAINTENANCE",
      amount: "",
      expense_date: localDate(new Date()),
      description: "",
      ticket_id: "",
      receipt: null,
    })
    setFormOpen(true)
  }

  async function openEditForm(expenseId: string) {
    if (!accessToken) return

    try {
      setFormLoading(true)
      setFormError("")

      const expense = await getExpenseById(accessToken, expenseId)

      setEditingId(expense.id)
      setForm({
        place_id: expense.place_id,
        category: expense.category,
        amount: String(expense.amount),
        expense_date: expense.expense_date.slice(0, 10),
        description: expense.description ?? "",
        ticket_id: expense.ticket_id ?? "",
        receipt: null,
      })

      setFormOpen(true)
    } catch (error) {
      console.error(error)
      window.alert(
        t`Failed to load expense details.`,
      )
    } finally {
      setFormLoading(false)
    }
  }

  async function refreshFinance() {
    if (!accessToken) return

    const selectedPlaces =
      placeFilter === "ALL"
        ? places
        : places.filter((place) => place.id === placeFilter)

    const responses = await Promise.all(
      selectedPlaces.map((place) =>
        expenseslist(accessToken, place.id),
      ),
    )

    setExpenses(responses.flat())

    const nextReport = await getFinancialReport(accessToken, {
      from,
      to,
      ...(placeFilter !== "ALL" ? { place_id: placeFilter } : {}),
    })

    setReport(nextReport)
  }

  async function handleSaveExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!accessToken) return

    const amount = Number(form.amount)

    if (!form.place_id || !Number.isFinite(amount) || amount <= 0) {
      setFormError(
        t`Select a place and enter a valid amount.`,
      )
      return
    }

    const input: ExpenseInput = {
      category: form.category,
      amount,
      expense_date: form.expense_date,
      description: form.description,
      ticket_id: form.ticket_id,
      receipt: form.receipt,
    }

    try {
      setFormLoading(true)
      setFormError("")

      if (editingId) {
        await updateExpense(accessToken, editingId, input)
      } else {
        await createExpense(accessToken, form.place_id, input)
      }

      setFormOpen(false)
      await refreshFinance()
    } catch (error) {
      console.error(error)
      setFormError(
        errorMessage(error),
      )
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!accessToken) return

    const confirmed = window.confirm(
      t`Are you sure you want to delete this expense?`,
    )

    if (!confirmed) return

    try {
      await deleteExpense(accessToken, expenseId)
      await refreshFinance()
    } catch (error) {
      console.error(error)
      window.alert(
        errorMessage(error),
      )
    }
  }

  const inputStyle = S(
    "height: 40px; width: 100%; min-width: 0; padding: 0 11px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 13px",
  )

  const labelStyle = S(
    "display: flex; flex-direction: column; gap: 7px; font-size: 12px; font-weight: 650",
  )

  const isExpenses = view === "expenses"

  return (
    <Page
      title={isExpenses ? <Trans>Expenses</Trans> : <Trans>Financial reports</Trans>}
      description={<Trans>Track expenses and budgets for your places.</Trans>}
      phoneStart={isExpenses ? "none" : "back"}
      phoneActions={!isExpenses}
      phoneEnd={
        isExpenses
          ? { label: t`Add expense`, icon: "plus", onClick: openCreateForm }
          : "none"
      }
      actions={
        <>
          <span style={S("display: flex; align-items: center; gap: 8px; color: var(--muted-foreground); font-size: 13px")}>
            <CalendarDays size={16} aria-hidden="true" />
            {monthLabel}
          </span>
          {isExpenses ? (
            <Link to="/reports" className={cn(buttonVariants({ variant: "outline" }), "no-underline")}>
              <Trans>Financial reports</Trans>
            </Link>
          ) : (
            <Link to="/expenses" className={cn(buttonVariants({ variant: "outline" }), "no-underline")}>
              <Trans>Expenses</Trans>
            </Link>
          )}
        </>
      }
    >
      {/* Place filter */}
      <Card style={S("padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0")}>
        <CardHeader style={S("padding: 18px 20px; border-bottom: 1px solid var(--border); gap: 4px")}>
          <CardTitle style={S("font-size: 17px; font-weight: 750")}>
            <Building2
              size={17}
              style={S("display: inline; vertical-align: middle; margin-inline-end: 7px")}
            />
            <Trans>Filter by place</Trans>
          </CardTitle>
        </CardHeader>

        <CardContent style={S("padding: 20px")}>
          {placesLoading ? (
            <Skeleton style={S("height: 42px; width: 100%; max-width: 420px")} />
          ) : placesError ? (
            <p style={S("color: var(--destructive); font-size: 13px; margin: 0")}>
              {placesError}
            </p>
          ) : (
            <label style={labelStyle}>
              <span><Trans>Choose a place</Trans></span>
              <select
                value={placeFilter}
                onChange={(event) => setPlaceFilter(event.target.value)}
                style={{ ...inputStyle, maxWidth: 420 }}
              >
                <option value="ALL"><Trans>All places</Trans></option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.place_name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </CardContent>
      </Card>

      {!isExpenses && (
      <>
      {/* Summary */}
      <div
        style={S(
          "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px",
        )}
      >
        <Card className="am-lift" style={S("padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0")}>
          <CardContent style={S("padding: 20px; display: flex; flex-direction: column; gap: 14px")}>
            <div style={S("display: flex; align-items: center; justify-content: space-between; gap: 10px")}>
              <span style={S("font-size: 13px; color: var(--muted-foreground); font-weight: 600")}>
                <Trans>Monthly budget</Trans>
              </span>
              <Wallet size={19} style={S("color: var(--primary)")} />
            </div>

            {placesLoading ? (
              <Skeleton style={S("height: 30px; width: 150px")} />
            ) : (
              Object.entries(budgetByCurrency).length > 0 ? (
                Object.entries(budgetByCurrency).map(([currency, amount]) => (
                  <div key={currency} style={S("font-size: 21px; font-weight: 800; direction: ltr; text-align: match-parent")}>
                    {formatMoney(amount)}{" "}
                    <span style={S("font-size: 12px; color: var(--muted-foreground)")}>{currency}</span>
                  </div>
                ))
              ) : (
                <div style={S("font-size: 23px; font-weight: 800")}>0.00</div>
              )
            )}

            <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
              <Trans>Total budget for the selected places</Trans>
            </span>
          </CardContent>
        </Card>

        <Card className="am-lift" style={S("padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0")}>
          <CardContent style={S("padding: 20px; display: flex; flex-direction: column; gap: 14px")}>
            <div style={S("display: flex; align-items: center; justify-content: space-between; gap: 10px")}>
              <span style={S("font-size: 13px; color: var(--muted-foreground); font-weight: 600")}>
                <Trans>Total income</Trans>
              </span>
              <TrendingUp size={19} style={S("color: var(--primary)")} />
            </div>

            {reportLoading ? (
              <Skeleton style={S("height: 30px; width: 150px")} />
            ) : selectedReportTotals.length ? (
              selectedReportTotals.map((item) => (
                <div key={item.currency} style={S("font-size: 21px; font-weight: 800; direction: ltr; text-align: match-parent")}>
                  {formatMoney(item.total_income)}{" "}
                  <span style={S("font-size: 12px; color: var(--muted-foreground)")}>{item.currency}</span>
                </div>
              ))
            ) : (
              <div style={S("font-size: 23px; font-weight: 800")}>—</div>
            )}

            <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
              <Trans>Booking income in the selected period</Trans>
            </span>
          </CardContent>
        </Card>

        <Card className="am-lift" style={S("padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0")}>
          <CardContent style={S("padding: 20px; display: flex; flex-direction: column; gap: 14px")}>
            <div style={S("display: flex; align-items: center; justify-content: space-between; gap: 10px")}>
              <span style={S("font-size: 13px; color: var(--muted-foreground); font-weight: 600")}>
                <Trans>Total expenses</Trans>
              </span>
              <TrendingDown size={19} style={S("color: var(--destructive)")} />
            </div>

            {reportLoading ? (
              <Skeleton style={S("height: 30px; width: 150px")} />
            ) : selectedReportTotals.length ? (
              selectedReportTotals.map((item) => (
                <div key={item.currency} style={S("font-size: 21px; font-weight: 800; direction: ltr; text-align: match-parent")}>
                  {formatMoney(item.total_expenses)}{" "}
                  <span style={S("font-size: 12px; color: var(--muted-foreground)")}>{item.currency}</span>
                </div>
              ))
            ) : (
              <div style={S("font-size: 23px; font-weight: 800")}>—</div>
            )}

            <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
              <Trans>Expenses in the selected period</Trans>
            </span>
          </CardContent>
        </Card>

        <Card className="am-lift" style={S("padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0")}>
          <CardContent style={S("padding: 20px; display: flex; flex-direction: column; gap: 14px")}>
            <div style={S("display: flex; align-items: center; justify-content: space-between; gap: 10px")}>
              <span style={S("font-size: 13px; color: var(--muted-foreground); font-weight: 600")}>
                <Trans>Net profit</Trans>
              </span>
              <BarChart3 size={19} style={S("color: var(--primary)")} />
            </div>

            {reportLoading ? (
              <Skeleton style={S("height: 30px; width: 150px")} />
            ) : selectedReportTotals.length ? (
              selectedReportTotals.map((item) => (
                <div key={item.currency} style={S("font-size: 21px; font-weight: 800; direction: ltr; text-align: match-parent")}>
                  {formatMoney(item.profit)}{" "}
                  <span style={S("font-size: 12px; color: var(--muted-foreground)")}>{item.currency}</span>
                </div>
              ))
            ) : (
              <div style={S("font-size: 23px; font-weight: 800")}>—</div>
            )}

            <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
              <Trans>Income minus expenses</Trans>
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Financial report */}
      <Card style={S("padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0")}>
        <CardHeader style={S("padding: 18px 20px; border-bottom: 1px solid var(--border); gap: 5px")}>
          <CardTitle style={S("font-size: 17px; font-weight: 750")}>
            <BarChart3 size={17} style={S("display: inline; vertical-align: middle; margin-inline-end: 7px")} />
            <Trans>Financial report</Trans>
          </CardTitle>
          <p style={S("font-size: 12px; color: var(--muted-foreground); margin: 0")}>
            <Trans>Choose a period to see income, expenses and profit.</Trans>
          </p>
        </CardHeader>

        <CardContent style={S("padding: 20px; display: flex; flex-direction: column; gap: 18px")}>
          <div style={S("display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px")}>
            <label style={labelStyle}>
              <span><Trans>From</Trans></span>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span><Trans>To</Trans></span>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          {reportError && (
            <p style={S("color: var(--destructive); font-size: 13px; margin: 0")}>
              {reportError}
            </p>
          )}

          {reportLoading ? (
            <Skeleton style={S("height: 100px; width: 100%")} />
          ) : report?.places.length ? (
            <div style={S("display: flex; flex-direction: column; gap: 10px")}>
              {report.places.map((place) => (
                <div
                  key={place.place_id}
                  style={S("border: 1px solid var(--border); padding: 15px; display: flex; flex-direction: column; gap: 12px")}
                >
                  <div style={S("font-size: 14px; font-weight: 750")}>
                    {place.place_name}
                    <span style={S("font-size: 11px; color: var(--muted-foreground); margin-inline-start: 7px")}>
                      {place.currency}
                    </span>
                  </div>

                  <div style={S("display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px")}>
                    <div>
                      <div style={S("font-size: 11px; color: var(--muted-foreground)")}>
                        <Trans>Income</Trans>
                      </div>
                      <div style={S("font-size: 15px; font-weight: 750; direction: ltr; text-align: match-parent")}>
                        {formatMoney(place.total_income)}
                      </div>
                    </div>

                    <div>
                      <div style={S("font-size: 11px; color: var(--muted-foreground)")}>
                        <Trans>Expenses</Trans>
                      </div>
                      <div style={S("font-size: 15px; font-weight: 750; direction: ltr; text-align: match-parent")}>
                        {formatMoney(place.total_expenses)}
                      </div>
                    </div>

                    <div>
                      <div style={S("font-size: 11px; color: var(--muted-foreground)")}>
                        <Trans>Net profit</Trans>
                      </div>
                      <div style={S("font-size: 15px; font-weight: 750; direction: ltr; text-align: match-parent")}>
                        {formatMoney(place.profit)}
                      </div>
                    </div>
                  </div>

                  <div style={S("border-top: 1px solid var(--border); padding-top: 10px")}>
                    <div style={S("font-size: 12px; font-weight: 700; margin-bottom: 9px")}>
                      <Trans>Expenses by category</Trans>
                    </div>
                    <div style={S("display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px")}>
                      {CATEGORIES.map((item) => (
                        <div key={item} style={S("display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--muted-foreground)")}>
                          <span>{categoryLabel(item)}</span>
                          <span style={S("font-weight: 700; direction: ltr")}>
                            {formatMoney(place.expenses_by_category?.[item] ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !reportLoading && (
              <p style={S("font-size: 13px; color: var(--muted-foreground); text-align: center; padding: 20px")}>
                <Trans>No financial data in the selected period.</Trans>
              </p>
            )
          )}
        </CardContent>
      </Card>

      </>
      )}

      {isExpenses && (
      <>
      {/* Expenses */}
      <Card style={S("padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0")}>
        <CardHeader
          style={S(
            "padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px",
          )}
        >
          <div style={S("display: flex; flex-direction: column; gap: 5px")}>
            <CardTitle style={S("font-size: 17px; font-weight: 750")}>
              <Receipt size={17} style={S("display: inline; vertical-align: middle; margin-inline-end: 7px")} />
              <Trans>Expense log</Trans>
              <span style={S("margin-inline-start: 8px; font-size: 12px; font-weight: 600; color: var(--muted-foreground); border: 1px solid var(--border); padding: 2px 8px")}>
                {filteredExpenses.length}
              </span>
            </CardTitle>
            <p style={S("font-size: 12px; color: var(--muted-foreground); margin: 0")}>
              <Trans>Every expense recorded for your places.</Trans>
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            disabled={places.length === 0 || placesLoading}
            className="am-btn"
            style={S("height: 36px; padding: 0 13px; display: flex; align-items: center; gap: 7px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 12px; font-weight: 650; opacity: 1")}
          >
            <Plus size={15} />
            <Trans>Add expense</Trans>
          </button>
        </CardHeader>

        <CardContent style={S("padding: 20px; display: flex; flex-direction: column; gap: 18px")}>
          {/* Category filters */}
          <div style={S("display: flex; align-items: center; gap: 8px; flex-wrap: wrap")}>
            {(["ALL", ...CATEGORIES] as CategoryKey[]).map((item) => {
              const active = category === item
              const label =
                item === "ALL"
                  ? t`All`
                  : categoryLabel(item)

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className="am-btn"
                  style={S(
                    `height: 36px; padding: 0 13px; display: flex; align-items: center; gap: 7px; border: 1px solid ${active ? "var(--primary)" : "var(--border)"}; background: ${active ? "var(--primary)" : "var(--card)"}; color: ${active ? "var(--primary-foreground)" : "var(--foreground)"}; font-size: 12px; font-weight: 600`,
                  )}
                >
                  {label}
                  <span style={S("font-size: 11px; opacity: .8")}>
                    {categoryCounts[item]}
                  </span>
                </button>
              )
            })}
          </div>

          {expensesLoading && (
            <div style={S("display: flex; flex-direction: column; gap: 10px")}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} style={S("height: 82px")} />
              ))}
            </div>
          )}

          {!expensesLoading && expensesError && (
            <div style={S("display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 32px 16px; border: 1px dashed var(--border); text-align: center")}>
              <AlertCircle size={28} style={S("color: var(--destructive)")} />
              <p style={S("font-size: 14px; font-weight: 650; margin: 0")}>
                <Trans>We could not load the expenses</Trans>
              </p>
              <p style={S("font-size: 13px; color: var(--muted-foreground); margin: 0")}>
                {expensesError}
              </p>
            </div>
          )}

          {!expensesLoading && !expensesError && filteredExpenses.length === 0 && (
            <div style={S("display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 36px 16px; border: 1px dashed var(--border); text-align: center")}>
              <FileText size={28} style={S("color: var(--muted-foreground)")} />
              <p style={S("font-size: 14px; font-weight: 650; margin: 0")}>
                <Trans>No expenses</Trans>
              </p>
              <p style={S("font-size: 13px; color: var(--muted-foreground); margin: 0")}>
                <Trans>No expenses match the selected filters.</Trans>
              </p>
            </div>
          )}

          {!expensesLoading && !expensesError && filteredExpenses.length > 0 && (
            <div style={S("display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px")}>
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="am-lift"
                  style={S("display: flex; flex-direction: column; gap: 13px; min-width: 0; border: 1px solid var(--border); padding: 16px; background: var(--card)")}
                >
                  <div style={S("display: flex; align-items: flex-start; justify-content: space-between; gap: 10px")}>
                    <div style={S("display: flex; flex-direction: column; gap: 5px; min-width: 0")}>
                      <span style={S("font-size: 14px; font-weight: 750; overflow-wrap: anywhere")}>
                        {expense.description || categoryLabel(expense.category)}
                      </span>
                      <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
                        {categoryLabel(expense.category)}
                      </span>
                    </div>
                    <Receipt size={17} style={S("color: var(--muted-foreground); flex-shrink: 0")} />
                  </div>

                  <div style={S("font-size: 20px; font-weight: 800; direction: ltr; text-align: match-parent")}>
                    {formatMoney(Number(expense.amount))}
                    <span style={S("font-size: 11px; font-weight: 600; color: var(--muted-foreground); margin-inline-start: 5px")}>
                      {getPlaceCurrency(expense.place_id)}
                    </span>
                  </div>

                  <div style={S("border-top: 1px solid var(--border); padding-top: 11px; display: flex; flex-direction: column; gap: 9px")}>
                    <div style={S("display: flex; align-items: center; gap: 7px; color: var(--muted-foreground); font-size: 12px")}>
                      <Building2 size={14} />
                      <span style={S("overflow-wrap: anywhere")}>{getPlaceName(expense.place_id)}</span>
                    </div>

                    <div style={S("display: flex; align-items: center; gap: 7px; color: var(--muted-foreground); font-size: 12px")}>
                      <CalendarDays size={14} />
                      {dayFormatter.format(new Date(expense.expense_date))}
                    </div>

                    {expense.receipt_url && (
                      <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="am-btn"
                        style={S("height: 34px; display: flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--border); color: var(--foreground); font-size: 12px; text-decoration: none")}
                      >
                        <FileText size={14} />
                        <Trans>View receipt</Trans>
                      </a>
                    )}

                    <div style={S("display: flex; gap: 8px; margin-top: 3px")}>
                      <button
                        type="button"
                        onClick={() => void openEditForm(expense.id)}
                        disabled={formLoading}
                        className="am-btn"
                        style={S("height: 34px; flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 12px")}
                      >
                        <Pencil size={13} />
                        <Trans>Edit</Trans>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDeleteExpense(expense.id)}
                        className="am-btn"
                        style={S("height: 34px; flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--border); background: var(--card); color: var(--destructive); font-size: 12px")}
                      >
                        <Trash2 size={13} />
                        <Trans>Delete</Trans>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit modal */}
      {formOpen && (
        <div
          style={S("position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; padding: 16px")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !formLoading) {
              setFormOpen(false)
            }
          }}
        >
          <div
            style={S("width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; background: var(--card); border: 1px solid var(--border); padding: 22px; display: flex; flex-direction: column; gap: 18px")}
          >
            <div style={S("display: flex; align-items: center; justify-content: space-between; gap: 12px")}>
              <h2 style={S("font-size: 18px; font-weight: 800; margin: 0")}>
                {editingId
                  ? t`Edit expense`
                  : t`Add expense`}
              </h2>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={formLoading}
                className="am-btn"
                style={S("width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: var(--card); color: var(--foreground)")}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} style={S("display: flex; flex-direction: column; gap: 14px")}>
              <label style={labelStyle}>
                <span><Trans>Place</Trans></span>
                <select
                  value={form.place_id}
                  onChange={(event) => setForm({ ...form, place_id: event.target.value })}
                  required
                  disabled={!!editingId}
                  style={inputStyle}
                >
                  <option value=""><Trans>Choose a place</Trans></option>
                  {places.map((place) => (
                    <option key={place.id} value={place.id}>{place.place_name}</option>
                  ))}
                </select>
              </label>

              <div style={S("display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px")}>
                <label style={labelStyle}>
                  <span><Trans>Category</Trans></span>
                  <select
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value as ExpenseCategory })}
                    style={inputStyle}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>{categoryLabel(item)}</option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  <span><Trans>Amount</Trans></span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(event) => setForm({ ...form, amount: event.target.value })}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </label>
              </div>

              <label style={labelStyle}>
                <span><Trans>Expense date</Trans></span>
                <input
                  type="date"
                  required
                  value={form.expense_date}
                  onChange={(event) => setForm({ ...form, expense_date: event.target.value })}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span><Trans>Description</Trans></span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  rows={3}
                  placeholder={t`Expense description (optional)`}
                  style={S("width: 100%; min-width: 0; padding: 10px 11px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 13px; resize: vertical")}
                />
              </label>

              <label style={labelStyle}>
                <span><Trans>Maintenance ticket ID (optional)</Trans></span>
                <input
                  value={form.ticket_id}
                  onChange={(event) => setForm({ ...form, ticket_id: event.target.value })}
                  placeholder="UUID"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span><Trans>Attach a receipt (optional)</Trans></span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => setForm({ ...form, receipt: event.target.files?.[0] ?? null })}
                  style={S("width: 100%; min-width: 0; font-size: 12px; color: var(--foreground)")}
                />
                {editingId && (
                  <span style={S("font-size: 11px; color: var(--muted-foreground)")}>
                    <Trans>Leave it empty to keep the current receipt.</Trans>
                  </span>
                )}
              </label>

              {formError && (
                <p style={S("font-size: 12px; color: var(--destructive); margin: 0")}>
                  {formError}
                </p>
              )}

              <div style={S("display: flex; justify-content: flex-end; gap: 9px; padding-top: 5px")}>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={formLoading}
                  className="am-btn"
                  style={S("height: 38px; padding: 0 14px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 12px")}
                >
                  <Trans>Cancel</Trans>
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="am-btn"
                  style={S("height: 38px; padding: 0 16px; display: flex; align-items: center; gap: 7px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 12px; font-weight: 700; opacity: 1")}
                >
                  <Save size={14} />
                  {formLoading
                    ? t`Saving...`
                    : t`Save`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </Page>
  )
}