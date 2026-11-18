import { useEffect, useMemo, useState } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import type { Place } from "@amlak/shared"
import { storedUser, useAuth } from "@/lib/auth"
import { getFinancialReport, getPlaces, type FinancialReport } from "@/lib/api"
import { useFormat } from "@/lib/format"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "cn"
import { Page } from "@/components/page"
import { Field, ListToolbar, Panel, Segmented, ToolbarSelect } from "@/components/panel"
import { LoadError, LoadingList } from "@/components/states"
import { Amount } from "@/components/finance-parts"
import { isoDay } from "@/components/booking-parts"

export const Route = createFileRoute("/_authenticated/reports")({
  beforeLoad: () => {
    if (storedUser()?.role !== "MANAGER") throw redirect({ to: "/home" })
  },
  component: ReportsPage,
})

type Period = "MONTH" | "THREE" | "SIX" | "CUSTOM"
type Row = { month: Date; from: string; to: string; income: number; expenses: number; profit: number }

/** The months a period covers, each clipped to the period (at most 12). */
function monthsOf(from: string, to: string) {
  const out: { month: Date; from: string; to: string }[] = []
  const start = new Date(`${from}T00:00:00`)
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (isoDay(cursor) <= to && out.length < 12) {
    const last = isoDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0))
    const first = isoDay(cursor)
    out.push({ month: cursor, from: first < from ? from : first, to: last > to ? to : last })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return out
}

/** Income, expenses and profit for a period and the places, with a month by month chart and table. */
function ReportsPage() {
  const { accessToken } = useAuth()
  const { number, money, lang, locale, dateFormat } = useFormat()
  const [period, setPeriod] = useState<Period>("SIX")
  const today = isoDay(new Date())
  const [custom, setCustom] = useState({ from: isoDay(new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1)), to: today })
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placeId, setPlaceId] = useState("")
  const [total, setTotal] = useState<FinancialReport | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    getPlaces(accessToken)
      .then(setPlaces)
      .catch(() => setPlaces([]))
  }, [accessToken])

  const range = useMemo(() => {
    const now = new Date()
    const back = period === "MONTH" ? 0 : period === "THREE" ? 2 : 5
    return period === "CUSTOM" ? custom : { from: isoDay(new Date(now.getFullYear(), now.getMonth() - back, 1)), to: today }
  }, [period, custom, today])

  const place = places?.find((p) => p.id === placeId)
  // Totals are per currency; the report shows the place's, or the first one.
  const currency = place?.currency ?? total?.totals_by_currency[0]?.currency ?? places?.[0]?.currency ?? ""

  useEffect(() => {
    if (!accessToken || !range.from || !range.to || range.to < range.from) return
    let alive = true
    setRows(null)
    setTotal(null)
    setFailed(false)
    const ask = (from: string, to: string) => getFinancialReport(accessToken, { from, to, place_id: placeId || undefined })
    const months = monthsOf(range.from, range.to)
    Promise.all([ask(range.from, range.to), ...months.map((m) => ask(m.from, m.to))])
      .then(([all, ...each]) => {
        if (!alive) return
        setTotal(all)
        const pick = (report: FinancialReport) =>
          report.totals_by_currency.find((x) => x.currency === (place?.currency ?? all.totals_by_currency[0]?.currency)) ?? {
            total_income: 0,
            total_expenses: 0,
            profit: 0,
          }
        setRows(
          months.map((m, i) => {
            const sum = pick(each[i])
            return { ...m, income: sum.total_income, expenses: sum.total_expenses, profit: sum.profit }
          }),
        )
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, range, placeId, place, reload])

  const sums = total?.totals_by_currency.find((x) => x.currency === currency)
  const income = sums?.total_income ?? 0
  const expenses = sums?.total_expenses ?? 0
  const profit = sums?.profit ?? 0
  const margin = income > 0 ? Math.round((profit / income) * 100) : null
  const currencyName = useMemo(() => {
    try {
      return currency ? (new Intl.DisplayNames([locale], { type: "currency" }).of(currency) ?? currency) : ""
    } catch {
      return currency
    }
  }, [currency, locale])
  const others = (total?.totals_by_currency ?? []).filter((x) => x.currency !== currency)

  return (
    <Page
      title={<Trans>Financial reports</Trans>}
      phoneTitle={<Trans>Reports</Trans>}
      description={currencyName ? <Trans>In {currencyName}. Visible to the manager only.</Trans> : <Trans>Visible to the manager only.</Trans>}
      phoneEnd="none"
      actions={
        <Link to="/expenses" className={cn(buttonVariants({ variant: "outline" }))}>
          <Trans>Expenses</Trans>
        </Link>
      }
    >
      <ListToolbar
        filters={
          <div className="[&>div]:grid-cols-2 desk:max-w-[640px] desk:[&>div]:grid-cols-4">
            <Segmented
              label={t`Period`}
              value={period}
              onChange={setPeriod}
              options={[
                { key: "MONTH", label: <Trans>This month</Trans> },
                { key: "THREE", label: <Trans>3 months</Trans> },
                { key: "SIX", label: <Trans>6 months</Trans> },
                { key: "CUSTOM", label: <Trans>Custom</Trans> },
              ]}
            />
          </div>
        }
      >
        <ToolbarSelect id="report-place" label={t`Places`} value={placeId} onChange={setPlaceId}>
          <option value="">{t`All places (${number(places?.length ?? 0)})`}</option>
          {places?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.place_name}
            </option>
          ))}
        </ToolbarSelect>
      </ListToolbar>

      {period === "CUSTOM" && (
        <div className="grid grid-cols-2 gap-3 desk:max-w-[480px]">
          <Field id="report-from" label={<Trans>From</Trans>}>
            <Input id="report-from" type="date" dir="ltr" max={custom.to} value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          </Field>
          <Field id="report-to" label={<Trans>To</Trans>}>
            <Input id="report-to" type="date" dir="ltr" min={custom.from} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </Field>
        </div>
      )}

      {failed ? (
        <LoadError title={<Trans>Could not load the report</Trans>} onRetry={() => setReload((n) => n + 1)} />
      ) : rows === null ? (
        <LoadingList />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] items-stretch gap-4">
            <Stat label={<Trans>Income</Trans>}>
              <Amount value={income} currency={currency} format={number} className="text-[32px]" />
            </Stat>
            <Stat label={<Trans>Expenses</Trans>}>
              <Amount value={expenses} currency={currency} format={number} className="text-[32px]" />
            </Stat>
            <Stat
              label={<Trans>Net profit</Trans>}
              note={margin !== null ? <Trans>Margin {number(margin)}%</Trans> : undefined}
            >
              <Amount value={profit} currency={currency} format={number} className="text-[32px]" />
            </Stat>
          </div>
          {others.length > 0 && (
            <p className="m-0 text-[13px] text-muted-foreground">
              <Trans>
                Places in other currencies are not added to these totals:{" "}
                {others.map((x) => money(x.profit, x.currency)).join(", ")} profit.
              </Trans>
            </p>
          )}
          <Chart rows={rows} lang={lang} monthLabel={(d) => dateFormat({ month: "short" }).format(d)} format={number} />
          {/* Four narrow columns that fit the card at any width: nothing scrolls sideways. */}
          <section className="min-w-0 border border-border bg-card shadow-sm">
            <table className="w-full table-fixed border-collapse text-sm desk:text-[15px]">
              <thead>
                <tr className="border-b border-border text-start text-[13px] font-semibold text-muted-foreground">
                  <th scope="col" className="px-2.5 py-3 text-start font-semibold [overflow-wrap:anywhere] desk:px-4">
                    <Trans>Month</Trans>
                  </th>
                  <th scope="col" className="px-2.5 py-3 text-start font-semibold [overflow-wrap:anywhere] desk:px-4">
                    <Trans>Income</Trans>
                  </th>
                  <th scope="col" className="px-2.5 py-3 text-start font-semibold [overflow-wrap:anywhere] desk:px-4">
                    <Trans>Expenses</Trans>
                  </th>
                  <th scope="col" className="px-2.5 py-3 text-start font-semibold [overflow-wrap:anywhere] desk:px-4">
                    <Trans>Profit</Trans>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.from} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-2.5 py-3.5 text-start font-normal [overflow-wrap:anywhere] desk:px-4">
                      {dateFormat({ month: "long" }).format(row.month)}
                    </th>
                    <td className="px-2.5 py-3.5 font-mono tabular-nums [overflow-wrap:anywhere] desk:px-4">{number(row.income, { maximumFractionDigits: 2 })}</td>
                    <td className="px-2.5 py-3.5 font-mono tabular-nums [overflow-wrap:anywhere] desk:px-4">{number(row.expenses, { maximumFractionDigits: 2 })}</td>
                    <td className="px-2.5 py-3.5 font-mono font-bold tabular-nums [overflow-wrap:anywhere] desk:px-4">{number(row.profit, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </Page>
  )
}

function Stat({ label, note, children }: { label: React.ReactNode; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="box-border flex h-full min-w-0 flex-col gap-1 border border-border bg-card px-5 py-6 shadow-sm">
      <span className="text-[15px] text-muted-foreground">{label}</span>
      {children}
      {note && <span className="mt-auto text-[13px] text-muted-foreground">{note}</span>}
    </section>
  )
}

/** Income and expenses side by side for each month, on a scale rounded up to a round number. */
function Chart({
  rows,
  lang,
  monthLabel,
  format,
}: {
  rows: Row[]
  lang: string
  monthLabel: (d: Date) => string
  format: (value: number, options?: Intl.NumberFormatOptions) => string
}) {
  const top = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expenses)))
  const magnitude = 10 ** Math.floor(Math.log10(top))
  const step = [1, 2, 2.5, 5, 10].map((m) => (m * magnitude) / 4).find((s) => s * 4 >= top) ?? magnitude
  const max = step * 4
  const ticks = [4, 3, 2, 1, 0].map((n) => n * step)
  const short = (value: number) => format(value, { notation: "compact", maximumFractionDigits: 1 })
  return (
    <Panel labelledBy="chart-title" className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="chart-title" className="m-0 text-lg font-bold">
          <Trans>Income and expenses</Trans>
        </h2>
        <div className="flex gap-4 text-[13px]">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 bg-chart-1" />
            <Trans>Income</Trans>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 bg-chart-2" />
            <Trans>Expenses</Trans>
          </span>
        </div>
      </div>
      {/* The table under the chart holds the same numbers for screen readers. */}
      <div aria-hidden="true" className="flex gap-3" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="relative h-[240px] min-w-0 flex-1 desk:h-[360px]">
          {ticks.map((tick) => (
            <div key={tick} className="absolute inset-x-0 border-t border-border" style={{ bottom: `${(tick / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end justify-around gap-2 px-2">
            {rows.map((row) => (
              <div key={row.from} className="flex h-full min-w-0 flex-1 items-end justify-center gap-1">
                <div className="w-full max-w-12 rounded-t-[2px] bg-chart-1" style={{ height: `${(row.income / max) * 100}%` }} />
                <div className="w-full max-w-12 rounded-t-[2px] bg-chart-2" style={{ height: `${(row.expenses / max) * 100}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="relative h-[240px] w-10 flex-none text-[13px] text-muted-foreground desk:h-[360px] desk:text-base">
          {ticks.map((tick) => (
            <span key={tick} className="absolute start-0 -translate-y-1/2" style={{ top: `${100 - (tick / max) * 100}%` }}>
              {short(tick)}
            </span>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="flex gap-3">
        <div className="flex flex-1 justify-around px-2 text-[13px] text-muted-foreground desk:text-lg">
          {rows.map((row) => (
            <span key={row.from} className="min-w-0 flex-1 truncate text-center">
              {monthLabel(row.month)}
            </span>
          ))}
        </div>
        <div className="w-10 flex-none" />
      </div>
    </Panel>
  )
}
