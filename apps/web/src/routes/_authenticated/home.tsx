import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Ticket,
  Wallet,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  LogOut,
} from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import type { Place } from "@amlak/shared"
import { storedUser, useAuth } from "@/lib/auth"
import {
  getPlaces,
  getDashboard,
  type DashboardPlace,
} from "@/lib/api"
import { S } from "@/lib/dom-style"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "cn"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { StatusBadge, TypeLabel } from "@/components/place-shared"
import "@/styles/motion.css"

export const Route = createFileRoute("/_authenticated/home")({
  // Admins have no dashboard here; their start page is /admin.
  beforeLoad: () => {
    if (storedUser()?.role === "ADMIN") {
      throw redirect({ to: "/admin" })
    }
  },
  component: HomePage,
})

function greeting(hour: number): ReactNode {
  if (hour < 12) return <Trans>Good morning</Trans>
  if (hour < 17) return <Trans>Good afternoon</Trans>
  return <Trans>Good evening</Trans>
}

function HomePage() {
  const { i18n } = useLingui()
  const { user, accessToken } = useAuth()

  const [places, setPlaces] = useState<Place[] | null>(null)
  const [dashboard, setDashboard] = useState<DashboardPlace[] | null>(null)

  const [placesError, setPlacesError] = useState(false)
  const [dashboardError, setDashboardError] = useState(false)

  const [now] = useState(() => new Date())

  const isWorker = String(user?.role ?? "").toUpperCase() === "WORKER"

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    Promise.all([
      getPlaces(accessToken),
      getDashboard(accessToken),
    ])
      .then(([placesResult, dashboardResult]) => {
        if (!alive) return

        setPlaces(placesResult)
        setDashboard(dashboardResult.data)
      })
      .catch(() => {
        if (!alive) return
      })

    getPlaces(accessToken)
      .then((result) => {
        if (alive) setPlaces(result)
      })
      .catch(() => {
        if (alive) setPlacesError(true)
      })

    getDashboard(accessToken)
      .then((result) => {
        if (alive) setDashboard(result.data)
      })
      .catch(() => {
        if (alive) setDashboardError(true)
      })

    return () => {
      alive = false
    }
  }, [accessToken])


  const locale = i18n.locale === "ar" ? "ar" : "en"

  const today = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now)

  const money = (n: number) =>
    new Intl.NumberFormat(locale).format(n)

  const stats = useMemo(() => {
    const rows = dashboard ?? []

    const pendingTickets = rows.reduce(
      (sum, p) => sum + (p.open_tickets?.PENDING_REVIEW ?? 0),
      0
    )

    const approvedTickets = rows.reduce(
      (sum, p) => sum + (p.open_tickets?.APPROVED ?? 0),
      0
    )

    const overdueTickets = rows.reduce(
      (sum, p) => sum + (p.open_tickets?.overdue ?? 0),
      0
    )

    const checkIns = rows.reduce(
      (sum, p) => sum + (p.today?.check_ins ?? 0),
      0
    )

    const checkOuts = rows.reduce(
      (sum, p) => sum + (p.today?.check_outs ?? 0),
      0
    )

    const budgets = rows
      .map((p) => p.maintenance_budget)
      .filter((budget) => budget !== null)

    const budgetTotal = budgets.reduce(
      (sum, budget) => sum + (budget?.budget ?? 0),
      0
    )

    const budgetSpent = budgets.reduce(
      (sum, budget) => sum + (budget?.spent ?? 0),
      0
    )

    const budgetRemaining = budgets.reduce(
      (sum, budget) => sum + (budget?.remaining ?? 0),
      0
    )

    const currency = budgets[0]?.currency ?? "SAR"

    return {
      pendingTickets,
      approvedTickets,
      overdueTickets,
      checkIns,
      checkOuts,
      bookings: checkIns + checkOuts,
      budgetTotal,
      budgetSpent,
      budgetRemaining,
      currency,
    }
  }, [dashboard])

  const dashboardLoading = dashboard === null && !dashboardError
  const placesLoading = places === null && !placesError

  const dashboardByPlace = useMemo(
    () => new Map((dashboard ?? []).map((p) => [p.place_id, p])),
    [dashboard]
  )

  return (
    <div
      style={S(
        "max-width: 1240px; margin-inline: auto; padding: 28px 40px 56px; display: flex; flex-direction: column; gap: 24px; box-sizing: border-box"
      )}
    >
      {/* Welcome section */}
      <section
        aria-label={t`Today`}
        className="am-rise"
        style={S(
          "background: var(--foreground); color: #fff; padding: 32px; display: flex; flex-wrap: wrap; gap: 24px 48px; align-items: flex-end; justify-content: space-between; box-sizing: border-box"
        )}
      >
        <div
          style={S(
            "flex: 1 1 360px; min-width: 0; display: flex; flex-direction: column; gap: 14px"
          )}
        >
          <span style={S("font-size: 14px; color: var(--info-200)")}>
            <Trans>Today</Trans>, {today}
          </span>

          <p
            style={S(
              "margin: 0; font-size: 28px; font-weight: 700; line-height: 1.35"
            )}
          >
            {greeting(now.getHours())}, {user?.fullname}
          </p>

          <span style={S("font-size: 14px; color: var(--info-200)")}>
            
          </span>
        </div>

        <div style={S("display: flex; flex-wrap: wrap; gap: 10px")}>
          <Link
            to="/tickets"
            className={cn(buttonVariants(), "am-btn")}
            style={S(
              "height: 44px; padding: 0 16px; background: #fff; color: var(--foreground); border: 1px solid #fff; font-size: 15px; font-weight: 600"
            )}
          >
            {isWorker ? <Trans>My tasks</Trans> : <Trans>Review tickets</Trans>}
          </Link>

          <Link
            to="/bookings"
            className={cn(buttonVariants({ variant: "outline" }), "am-btn")}
            style={S(
              "height: 44px; padding: 0 16px; background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.45); font-size: 15px; font-weight: 600"
            )}
          >
            <Trans>Bookings</Trans>
          </Link>
        </div>
      </section>

      {/* Statistics */}
      <div
        style={S(
          "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; align-items: stretch"
        )}
      >
        <StatCard
          icon={<Ticket size={20} />}
          iconBg="var(--warn-50)"
          iconFg="var(--warn)"
          title={<Trans>Tickets waiting for your review</Trans>}
          value={
            dashboardLoading ? (
              <Skeleton style={S("height: 40px; width: 100px")} />
            ) : dashboardError ? (
              "—"
            ) : (
              money(stats.pendingTickets)
            )
          }
          note={
            dashboardLoading ? (
              <Trans>Loading ticket statistics...</Trans>
            ) : (
              <span>
                <Trans>Approved:</Trans> {money(stats.approvedTickets)}
                {" · "}
                <span style={S("color: var(--danger)")}>
                  <Trans>Overdue:</Trans> {money(stats.overdueTickets)}
                </span>
              </span>
            )
          }
        />

        <StatCard
          icon={<CalendarDays size={20} />}
          iconBg="var(--info-50)"
          iconFg="var(--info-700)"
          title={<Trans>Bookings today</Trans>}
          value={
            dashboardLoading ? (
              <Skeleton style={S("height: 40px; width: 100px")} />
            ) : dashboardError ? (
              "—"
            ) : (
              money(stats.bookings)
            )
          }
          note={
            dashboardLoading ? (
              <Trans>Loading booking statistics...</Trans>
            ) : (
              <span>
                <Trans>Check-ins:</Trans> {money(stats.checkIns)}
                {" · "}
                <Trans>Check-outs:</Trans> {money(stats.checkOuts)}
              </span>
            )
          }
        />

        {!isWorker && (
          <StatCard
            icon={<Wallet size={20} />}
            iconBg="var(--good-50)"
            iconFg="var(--good)"
            title={<Trans>Monthly maintenance budget</Trans>}
            value={
              dashboardLoading ? (
                <Skeleton style={S("height: 40px; width: 140px")} />
              ) : dashboardError ? (
                "—"
              ) : (
                `${money(stats.budgetTotal)} ${stats.currency}`
              )
            }
            note={
              dashboardLoading ? (
                <Trans>Loading budget statistics...</Trans>
              ) : (
                <span>
                  <Trans>Spent:</Trans> {money(stats.budgetSpent)} {stats.currency}
                  {" · "}
                  <Trans>Remaining:</Trans> {money(stats.budgetRemaining)}{" "}
                  {stats.currency}
                </span>
              )
            }
          >
            {dashboard !== null && dashboard.length > 0 && (
              <BudgetDetails
                dashboard={dashboard}
                money={money}
              />
            )}
          </StatCard>
        )}
      </div>

      {/* Places */}
      <section>
        <div
          style={S(
            "display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px"
          )}
        >
          <h2 style={S("font-size: 16px; font-weight: 700; margin: 0")}>
            <Trans>Your places</Trans>
          </h2>

          <Link
            to="/places"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "am-btn"
            )}
          >
            <Trans>See all</Trans>
          </Link>
        </div>

        {placesLoading && (
          <div style={S("display: flex; flex-direction: column; gap: 10px")}>
            <Skeleton style={S("height: 120px")} />
            <Skeleton style={S("height: 120px")} />
          </div>
        )}

        {placesError && (
          <p style={S("color: var(--muted-foreground)")}>
            <Trans>We could not load your places.</Trans>
          </p>
        )}

        {places !== null && places.length === 0 && !placesError && (
          <Empty style={S("padding: 32px")}>
            <EmptyHeader>
              <EmptyTitle>
                <Trans>No properties yet</Trans>
              </EmptyTitle>
              <EmptyDescription>
                <Trans>Add your first property to see it here.</Trans>
              </EmptyDescription>
              <Link
                to="/places"
                className={cn(buttonVariants({ size: "sm" }), "am-btn")}
              >
                <Trans>Add property</Trans>
              </Link>
            </EmptyHeader>
          </Empty>
        )}

        <div style={S("display: flex; flex-direction: column; gap: 10px")}>
          {(places ?? []).map((p) => {
            const dashboardPlace = dashboardByPlace.get(p.id)

            return (
              <Link
                key={p.id}
                to="/place/$place_id"
                params={{ place_id: p.id }}
                className="am-lift"
                style={S(
                  "display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; background: var(--card); border: 1px solid var(--border); padding: 16px 18px; text-decoration: none; color: inherit; box-shadow: 2px 2px 0 rgba(27,36,48,0.10)"
                )}
              >
                <span
                  style={S(
                    "display: flex; flex-direction: column; gap: 4px; min-width: 0"
                  )}
                >
                  <span style={S("font-size: 16px; font-weight: 700")}>
                    {p.place_name}
                  </span>

                  <span
                    style={S(
                      "font-size: 13px; color: var(--muted-foreground)"
                    )}
                  >
                    <TypeLabel type={p.place_type} />, {p.city}
                  </span>

                  {dashboardPlace && (
                    <span
                      style={S(
                        "display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 12px; color: var(--muted-foreground)"
                      )}
                    >
                      <span>
                        <CheckCircle2
                          size={13}
                          style={{ display: "inline", verticalAlign: "middle" }}
                        />{" "}
                        <Trans>Good:</Trans>{" "}
                        {money(dashboardPlace.assets?.GOOD ?? 0)}
                      </span>

                      <span>
                        <Wrench
                          size={13}
                          style={{ display: "inline", verticalAlign: "middle" }}
                        />{" "}
                        <Trans>Needs maintenance:</Trans>
                        {money(dashboardPlace.assets?.NEEDS_MAINTENANCE ?? 0)}
                      </span>

                      <span>
                        <AlertTriangle
                          size={13}
                          style={{ display: "inline", verticalAlign: "middle" }}
                        />{" "}
                        <Trans>Out of service:</Trans>
                        {money(dashboardPlace.assets?.OUT_OF_SERVICE ?? 0)}
                      </span>
                    </span>
                  )}
                </span>

                <span
                  style={S(
                    "display: flex; align-items: center; flex-wrap: wrap; gap: 14px; flex: none"
                  )}
                >
                  {!isWorker && (
                    <span
                      style={S(
                        "font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 14px"
                      )}
                    >
                      {money(p.monthly_maintenance_budget)} {p.currency}
                    </span>
                  )}

                  <StatusBadge status={p.status} />
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  icon,
  iconBg,
  iconFg,
  title,
  value,
  note,
  children,
}: {
  icon: ReactNode
  iconBg: string
  iconFg: string
  title: ReactNode
  value: ReactNode
  note: ReactNode
  children?: ReactNode
}) {
  return (
    <Card
      className="am-lift"
      style={S(
        "padding: 24px; gap: 8px; border: 1px solid var(--border); box-shadow: 2px 2px 0 rgba(27,36,48,0.10); display: flex; flex-direction: column"
      )}
    >
      <CardHeader style={S("padding: 0; gap: 6px")}>
        <div
          style={S(
            "display: flex; align-items: center; justify-content: space-between; gap: 12px"
          )}
        >
          <CardTitle
            style={S(
              "font-size: 15px; font-weight: 500; color: #5B636E"
            )}
          >
            {title}
          </CardTitle>

          <span
            aria-hidden="true"
            style={S(
              `width: 40px; height: 40px; flex: none; display: inline-flex; align-items: center; justify-content: center; background: ${iconBg}; color: ${iconFg}`
            )}
          >
            {icon}
          </span>
        </div>

        <span
          style={S(
            "font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 40px; font-weight: 700; line-height: 1.15"
          )}
        >
          {value}
        </span>

        <CardDescription style={S("font-size: 14px; color: #5B636E")}>
          {note}
        </CardDescription>
      </CardHeader>

      {children && (
        <CardContent style={S("padding: 0")}>
          {children}
        </CardContent>
      )}
    </Card>
  )
}
function BudgetDetails({
  dashboard,
  money,
}: {
  dashboard: DashboardPlace[]
  money: (n: number) => string
}) {
  const [open, setOpen] = useState(false)
  


  const placesWithBudget = dashboard.filter(
    (p) => p.maintenance_budget !== null
  )

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="am-disclose"
        aria-expanded={open}
        aria-controls="budget-details"
        onClick={() => setOpen(!open)}
        style={S(
          "align-self: flex-start; margin-inline-start: -12px; color: var(--info-700); font-size: 14px; font-weight: 600; height: 44px"
        )}
      >
        {open ? <Trans>Hide details</Trans> : <Trans>Details</Trans>}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </Button>
        
      {open && (
        <div
          id="budget-details"
          className="am-reveal"
          style={S(
            "display: flex; flex-direction: column; border-top: 1px solid var(--border); padding-top: 8px"
          )}
        >
          {placesWithBudget.map((p) => {
            const budget = p.maintenance_budget

            if (!budget) return null

            return (
              <div
                key={p.place_id}
                style={S(
                  "display: flex; flex-direction: column; gap: 6px; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px"
                )}
              >
                <span style={S("font-weight: 600")}>
                  {p.place_name}
                </span>

                <div
                  style={S(
                    "display: flex; flex-wrap: wrap; gap: 12px; color: var(--muted-foreground)"
                  )}
                >
                  <span>
                    <Trans>Budget:</Trans>{" "}
                    {money(budget.budget)} {budget.currency}
                  </span>

                  <span>
                    <Trans>Spent:</Trans>{" "}
                    {money(budget.spent)} {budget.currency}
                  </span>

                  <span>
                    <Trans>Remaining:</Trans>{" "}
                    {money(budget.remaining)} {budget.currency}
                  </span>
                </div>
              </div>
            )
          })}
          
        </div>
      )}
    </>
  )
}