import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Ticket,
  Wallet,
} from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getPlaces } from "@/lib/api"
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
  const [error, setError] = useState(false)
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

  const locale = i18n.locale === "ar" ? "ar" : "en"
  const today = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now)
  const money = (n: number) => new Intl.NumberFormat(locale).format(n)

  const budgetTotal = useMemo(
    () => (places ?? []).reduce((sum, p) => sum + p.monthly_maintenance_budget, 0),
    [places]
  )
  const currency = places?.[0]?.currency ?? "SAR"

  return (
    <div
      style={S(
        "max-width: 1240px; margin-inline: auto; padding: 28px 40px 56px; display: flex; flex-direction: column; gap: 24px; box-sizing: border-box"
      )}
    >
      <section
        aria-label="today"
        className="am-rise"
        style={S(
          "background: var(--foreground); color: #fff; padding: 32px; box-shadow: 4px 4px 0 var(--warn); display: flex; flex-wrap: wrap; gap: 24px 48px; align-items: flex-end; justify-content: space-between; box-sizing: border-box"
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
          <p style={S("margin: 0; font-size: 28px; font-weight: 700; line-height: 1.35")}>
            {greeting(now.getHours())}, {user?.fullname}
          </p>
          <span style={S("font-size: 14px; color: var(--info-200)")}>
            <Trans>
              Ticket and booking activity appears here once those services are
              wired up.
            </Trans>
          </span>
        </div>
        <div style={S("display: flex; flex-wrap: wrap; gap: 10px")}>
          <Link
            to="/tickets"
            className={cn(
              buttonVariants(),
              "am-btn"
            )}
            style={S(
              "height: 44px; padding: 0 16px; background: #fff; color: var(--foreground); border: 1px solid #fff; font-size: 15px; font-weight: 600"
            )}
          >
            <Trans>Review tickets</Trans>
          </Link>
          <Link
            to="/bookings"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "am-btn"
            )}
            style={S(
              "height: 44px; padding: 0 16px; background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.45); font-size: 15px; font-weight: 600"
            )}
          >
            <Trans>Bookings</Trans>
          </Link>
        </div>
      </section>

      <div
        style={S(
          "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; align-items: start"
        )}
      >
        <StatCard
          icon={<Ticket size={20} />}
          iconBg="var(--warn-50)"
          iconFg="var(--warn)"
          title={<Trans>Tickets waiting for your review</Trans>}
          value="—"
          note={
            <Trans>
              Ticket data appears here once the maintenance service is wired up.
            </Trans>
          }
        />
        <StatCard
          icon={<CalendarDays size={20} />}
          iconBg="var(--info-50)"
          iconFg="var(--info-700)"
          title={<Trans>Bookings today</Trans>}
          value="—"
          note={
            <Trans>
              Booking data appears here once the bookings service is wired up.
            </Trans>
          }
        />
        <StatCard
          icon={<Wallet size={20} />}
          iconBg="var(--good-50)"
          iconFg="var(--good)"
          title={<Trans>Monthly maintenance budget</Trans>}
          value={
            loading(places, error) ? (
              <Skeleton style={S("height: 40px; width: 140px")} />
            ) : (
              `${money(budgetTotal)} ${currency}`
            )
          }
          note={
            <Trans>
              Summed from your places' monthly budgets.
            </Trans>
          }
        >
          {places !== null && places.length > 0 && (
            <BudgetDetails places={places} money={money} currency={currency} />
          )}
        </StatCard>
      </div>

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

        {loading(places, error) && (
          <div style={S("display: flex; flex-direction: column; gap: 10px")}>
            <Skeleton style={S("height: 96px")} />
            <Skeleton style={S("height: 96px")} />
          </div>
        )}

        {error && (
          <p style={S("color: var(--muted-foreground)")}>
            <Trans>We could not load your places.</Trans>
          </p>
        )}

        {places !== null && places.length === 0 && !error && (
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
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "am-btn"
                )}
              >
                <Trans>Add property</Trans>
              </Link>
            </EmptyHeader>
          </Empty>
        )}

        <div style={S("display: flex; flex-direction: column; gap: 10px")}>
          {(places ?? []).map((p) => (
            <Link
              key={p.id}
              to="/place/$place_id"
              params={{ place_id: p.id }}
              className="am-lift"
              style={S(
                "display: flex; align-items: center; justify-content: space-between; gap: 16px; background: var(--card); border: 1px solid var(--border); padding: 14px 18px; text-decoration: none; color: inherit; box-shadow: 2px 2px 0 rgba(27,36,48,0.10)"
              )}
            >
              <span style={S("display: flex; flex-direction: column; gap: 2px; min-width: 0")}>
                <span style={S("font-size: 16px; font-weight: 700")}>{p.place_name}</span>
                <span style={S("font-size: 13px; color: var(--muted-foreground)")}>
                  <TypeLabel type={p.place_type} />, {p.city}
                </span>
              </span>
              <span style={S("display: flex; align-items: center; gap: 14px; flex: none")}>
                <span
                  style={S(
                    "font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 14px"
                  )}
                >
                  {money(p.monthly_maintenance_budget)} {p.currency}
                </span>
                <StatusBadge status={p.status} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function loading(places: Place[] | null, error: boolean): boolean {
  return places === null && !error
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
          <CardTitle style={S("font-size: 15px; font-weight: 500; color: #5B636E")}>
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
        <CardContent style={S("padding: 0")}>{children}</CardContent>
      )}
    </Card>
  )
}

function BudgetDetails({
  places,
  money,
  currency,
}: {
  places: Place[]
  money: (n: number) => string
  currency: string
}) {
  const [open, setOpen] = useState(false)
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
          {places.map((p) => (
            <div
              key={p.id}
              style={S(
                "display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; font-size: 14px"
              )}
            >
              <span style={S("min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                {p.place_name}
              </span>
              <span
                style={S(
                  "font-family: var(--font-mono); font-variant-numeric: tabular-nums; flex: none"
                )}
              >
                {money(p.monthly_maintenance_budget)} {currency}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
