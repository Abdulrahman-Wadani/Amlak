import { useEffect, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getPlaces } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import "@/styles/motion.css"


// Mirrors prisma model expense
export type ExpenseCategory =
  | "MAINTENANCE"
  | "UTILITIES"
  | "TAXES"
  | "CLEANING"
  | "SUPPLIES"
  | "OTHER"

export type Expense = {
  id: string
  place_id: string
  category: ExpenseCategory
  description: string | null
  amount: string | number
  expense_date: string
  receipt_url: string | null
}

export const Route = createFileRoute("/_authenticated/finance")({
  component: FinancePage,
})

const CATEGORIES = [
  { key: "ALL", label: <Trans>All</Trans> },
  { key: "MAINTENANCE", label: <Trans>Maintenance</Trans> },
  { key: "UTILITIES", label: <Trans>Bills</Trans> },
  { key: "TAXES", label: <Trans>Taxes</Trans> },
  { key: "CLEANING", label: <Trans>Cleaning</Trans> },
  { key: "SUPPLIES", label: <Trans>Supplies</Trans> },
  { key: "OTHER", label: <Trans>Other</Trans> },
] as const

type CategoryKey = (typeof CATEGORIES)[number]["key"]

function FinancePage() {
  const { i18n } = useLingui()
  const { accessToken } = useAuth()
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [error, setError] = useState(false)
  const [placeFilter, setPlaceFilter] = useState("ALL")
  const [category, setCategory] = useState<CategoryKey>("ALL")
  // Date is impure; capture once at mount.
  const [now] = useState(() => new Date())

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((list) => alive && setPlaces(list))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [accessToken])

  // empty for expenses endpoint
  const expenses: Expense[] = []

  const monthLabel = new Intl.DateTimeFormat(
    i18n.locale === "ar" ? "ar" : "en",
    { month: "long", year: "numeric" }
  ).format(now)

  const budgetTotal = useMemo(
    () =>
      (places ?? [])
        .filter((p) => placeFilter === "ALL" || p.id === placeFilter)
        .reduce((sum, p) => sum + p.monthly_maintenance_budget, 0),
    [places, placeFilter]
  )

  const currency = places?.find((p) => p.id === placeFilter)?.currency ?? "SAR"

  const money = (n: number) =>
    new Intl.NumberFormat(i18n.locale === "ar" ? "ar" : "en").format(n)

  return (
    <div
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 20px"
      )}
    >
      <div
        style={S(
          "display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap"
        )}
      >
        <h1 style={S("font-size: 30px; font-weight: 800; margin: 0")}>
          <Trans>Expenses</Trans>
        </h1>
        <div style={S("min-width: 220px")}>
          <Label htmlFor="xp">
            <Trans>Place</Trans>
          </Label>
          <Select value={placeFilter} onValueChange={(v) => setPlaceFilter(String(v))}>
            <SelectTrigger id="xp" size="sm" style={S("width: 100%; height: 36px; margin-top: 4px")}>
              <SelectValue placeholder={<Trans>All places</Trans>}>
                {(value: string | null) =>
                  value === "ALL" || value === null ? (
                    <Trans>All places</Trans>
                  ) : (
                    places?.find((p) => p.id === value)?.place_name ?? value
                  )
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                <Trans>All places</Trans>
              </SelectItem>
              {(places ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.place_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card style={S("padding: 0")}>
        <CardHeader>
          <CardTitle>
            <Trans>Monthly maintenance budget</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent style={S("font-size: 30px; font-weight: 800")}>
          {places === null && !error ? (
            <Skeleton style={S("width: 160px; height: 30px")} />
          ) : (
            <>
              {money(budgetTotal)}{" "}
              <span style={S("font-size: 16px; font-weight: 600")}>{currency}</span>
            </>
          )}
        </CardContent>
      </Card>

      <div role="group" aria-label="Filter" style={S("display: flex; gap: 6px; flex-wrap: wrap")}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            className="am-tab"
            aria-pressed={category === c.key}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
            <span style={S("color: var(--muted-foreground); font-size: 12px")}>
              {c.key === "ALL"
                ? expenses.length
                : expenses.filter((e) => e.category === c.key).length}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p style={S("color: var(--muted-foreground)")}>
          <Trans>We could not load your places.</Trans>
        </p>
      )}

      <Empty style={S("padding: 40px")}>
        <EmptyHeader>
          <EmptyTitle>
            <Trans>No expenses recorded for {monthLabel} yet</Trans>
          </EmptyTitle>
          <EmptyDescription>
            <Trans>
              Expense data appears here once the expenses service is wired up.
            </Trans>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
