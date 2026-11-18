import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { Building2, CalendarDays, Camera, ChevronLeft, Plus, Wallet, Wrench } from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { plural, t } from "@lingui/core/macro"
import type { Place, Ticket } from "@amlak/shared"
import { storedUser, useAuth } from "@/lib/auth"
import {
  countPlaceWorkers,
  getDashboard,
  getPlaces,
  listAllBookingsForPlace,
  listTickets,
  type Booking,
  type DashboardPlace,
} from "@/lib/api"
import { groupBookings } from "@/lib/bookings"
import { addDays, todayIn } from "@/lib/dates"
import { useFormat } from "@/lib/format"
import { placeCounts } from "@/lib/places"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BookingStatusChip, OverdueChip, StatusBadge, TicketStatusChip, TypeLabel } from "@/components/place-shared"
import { DetailRow, DetailsLink, PlaceStatusText, PriorityText, StatCard } from "@/components/home-parts"
import { Page } from "@/components/page"
import { AddBookingPopup } from "@/components/booking-form"
import { ReportPopup } from "@/components/report-form"
import { Panel, PanelTitle } from "@/components/panel"
import { cn } from "cn"

/** How many places the home card shows before See all. */
const HOME_PLACES = 6

export const Route = createFileRoute("/_authenticated/home")({
  // Admins have no dashboard here; their start page is /admin.
  beforeLoad: () => {
    if (storedUser()?.role === "ADMIN") {
      throw redirect({ to: "/admin" })
    }
  },
  component: HomePage,
})

function greeting(hour: number, name: string): ReactNode {
  if (hour < 12) return <Trans>Good morning, {name}</Trans>
  if (hour < 17) return <Trans>Good afternoon, {name}</Trans>
  return <Trans>Good evening, {name}</Trans>
}

function HomePage() {
  const { user } = useAuth()
  return user?.role === "WORKER" ? <WorkerHome /> : <ManagerHome />
}

const DAY_MS = 24 * 60 * 60 * 1000

type TodayRow = { booking: Booking; place: Place }

/**
 * Today's arrivals and departures. The dashboard counts them per place; only
 * places with any are loaded (there is no endpoint across places).
 */
function useTodayBookings(places: Place[] | null, dashboard: DashboardPlace[] | null) {
  const { accessToken } = useAuth()
  const [rows, setRows] = useState<{ checkIns: TodayRow[]; checkOuts: TodayRow[] } | null>(null)
  useEffect(() => {
    if (!accessToken || !places || !dashboard) return
    let alive = true
    const busy = new Set(
      dashboard.filter((d) => (d.today?.check_ins ?? 0) + (d.today?.check_outs ?? 0) > 0).map((d) => d.place_id),
    )
    Promise.all(
      places
        .filter((place) => busy.has(place.id))
        .map(async (place) => {
          const today = todayIn(place.timezone)
          const bookings = await listAllBookingsForPlace(accessToken, place.id, { from: addDays(today, -1), to: today })
          const groups = groupBookings(bookings, today, today)
          return { place, groups }
        }),
    )
      .then((results) => {
        if (!alive) return
        setRows({
          checkIns: results.flatMap(({ place, groups }) => groups.checkIns.map((booking) => ({ booking, place }))),
          checkOuts: results.flatMap(({ place, groups }) => groups.checkOuts.map((booking) => ({ booking, place }))),
        })
      })
      .catch(() => alive && setRows({ checkIns: [], checkOuts: [] }))
    return () => {
      alive = false
    }
  }, [accessToken, places, dashboard])
  return rows
}

function useHomeData() {
  const { accessToken } = useAuth()
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [dashboard, setDashboard] = useState<DashboardPlace[] | null>(null)
  const [placesError, setPlacesError] = useState(false)
  const [dashboardError, setDashboardError] = useState(false)
  // Bumped after a popup saves, so the figures load again.
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((result) => alive && setPlaces(result))
      .catch(() => alive && setPlacesError(true))
    getDashboard(accessToken)
      .then((result) => alive && setDashboard(result.data))
      .catch(() => alive && setDashboardError(true))
    return () => {
      alive = false
    }
  }, [accessToken, version])
  return { places, dashboard, placesError, dashboardError, refresh: () => setVersion((n) => n + 1) }
}

function sum(rows: DashboardPlace[], pick: (row: DashboardPlace) => number | undefined) {
  return rows.reduce((total, row) => total + (pick(row) ?? 0), 0)
}

/** "One check-in and one check-out", from the two counts. */
function arrivalsNote(checkIns: number, checkOuts: number) {
  const ins = plural(checkIns, { 0: "No check-ins", one: "One check-in", other: "# check-ins" })
  const outs = plural(checkOuts, { 0: "no check-outs", one: "one check-out", other: "# check-outs" })
  return t`${ins} and ${outs}`
}

// ─── Manager ────────────────────────────────────────────────────────────────

function ManagerHome() {
  const { user, accessToken } = useAuth()
  const f = useFormat()
  const [now] = useState(() => new Date())
  const { places, dashboard, placesError, dashboardError, refresh } = useHomeData()
  const [adding, setAdding] = useState(false)
  const today = useTodayBookings(places, dashboard)

  // Tickets waiting for review: the first three, the total and the oldest.
  const [pending, setPending] = useState<{ items: Ticket[]; total: number; oldest: Ticket | null } | null>(null)
  useEffect(() => {
    if (!accessToken) return
    let alive = true
    listTickets(accessToken, { status: "PENDING_REVIEW" }, 1, 3)
      .then(async (first) => {
        const total = first.pagination.total
        // The list is newest first, so the oldest is alone on the last page of one.
        const oldest =
          total > 3 ? ((await listTickets(accessToken, { status: "PENDING_REVIEW" }, total, 1)).data[0] ?? null) : (first.data.at(-1) ?? null)
        if (alive) setPending({ items: first.data, total, oldest })
      })
      .catch(() => alive && setPending({ items: [], total: 0, oldest: null }))
    return () => {
      alive = false
    }
  }, [accessToken])

  // Workers per place, for the place cards.
  const [workerCounts, setWorkerCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!accessToken || !places) return
    let alive = true
    for (const place of places) {
      countPlaceWorkers(accessToken, place.id)
        .then((n) => alive && setWorkerCounts((current) => ({ ...current, [place.id]: n })))
        .catch(() => {})
    }
    return () => {
      alive = false
    }
  }, [accessToken, places])

  const rows = useMemo(() => dashboard ?? [], [dashboard])
  const pendingCount = pending?.total ?? sum(rows, (r) => r.open_tickets?.PENDING_REVIEW)
  const checkIns = sum(rows, (r) => r.today?.check_ins)
  const checkOuts = sum(rows, (r) => r.today?.check_outs)
  const budgets = rows.filter((r) => r.maintenance_budget && r.maintenance_budget.budget > 0)
  const currency = budgets[0]?.maintenance_budget?.currency ?? places?.[0]?.currency ?? "SAR"
  const budgetTotal = sum(budgets, (r) => r.maintenance_budget?.budget)
  const budgetSpent = sum(budgets, (r) => r.maintenance_budget?.spent)
  const percent = budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : null
  const counts = useMemo(() => placeCounts(rows), [rows])
  const placeNames = useMemo(() => new Map((places ?? []).map((p) => [p.id, p.place_name])), [places])
  const loading = dashboard === null && !dashboardError
  const number = (n: number) => (loading ? <Skeleton className="h-10 w-16" /> : dashboardError ? "—" : f.number(n))

  const oldestDays = pending?.oldest ? Math.max(0, Math.floor((now.getTime() - new Date(pending.oldest.created_at).getTime()) / DAY_MS)) : null
  const month = f.date(now, { month: "long" })

  const headline = (() => {
    const guests = plural(checkIns, {
      0: "No guests arrive today",
      one: "One guest arrives today",
      other: "# guests arrive today",
    })
    const tickets = plural(pendingCount, {
      0: "no tickets wait for your decision",
      one: "one ticket waits for your decision",
      other: "# tickets wait for your decision",
    })
    return t`${guests}, and ${tickets}.`
  })()

  const todayDate = f.date(now, { weekday: "long", day: "numeric", month: "long" })

  return (
    <Page
      title={greeting(now.getHours(), user?.fullname ?? "")}
      description={
        <>
          <Trans>Today, {todayDate}</Trans>
          {!loading && <>{t` · `}{headline}</>}
        </>
      }
      phoneTitle={<Trans>Home</Trans>}
      phoneStart="logo"
      phoneActions={false}
      actions={
        <Button type="button" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" />
          <Trans>Add booking</Trans>
        </Button>
      }
    >

      {adding && (
        <AddBookingPopup
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            refresh()
          }}
        />
      )}
      {/* The figures, then the places in one card. */}
      <div className="flex min-w-0 flex-col gap-4 desk:gap-6">
        <div className="min-w-0">
          <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
            <StatCard
              compactOnPhone
              icon={<Wrench strokeWidth={1.8} />}
              iconTone="warn"
              title={<Trans>Tickets waiting for your review</Trans>}
              value={number(pendingCount)}
              note={
                oldestDays === null ? (
                  <Trans>Nothing to review.</Trans>
                ) : oldestDays === 0 ? (
                  <Trans>The oldest arrived today</Trans>
                ) : (
                  plural(oldestDays, { one: "The oldest is # day old", other: "The oldest is # days old" })
                )
              }
              details={
                pending && pending.items.length > 0 ? (
                  <>
                    {pending.items.map((ticket) => (
                      <DetailRow
                        key={ticket.id}
                        title={<span dir="auto" className="line-clamp-1">{ticket.description}</span>}
                        sub={placeNames.get(ticket.place_id)}
                        end={<PriorityText priority={ticket.priority} />}
                      />
                    ))}
                    <Link to="/tickets" className="no-underline">
                      <DetailsLink>
                        <Trans>Review tickets</Trans>
                        <ChevronLeft aria-hidden="true" className="size-4 ltr:rotate-180" />
                      </DetailsLink>
                    </Link>
                  </>
                ) : undefined
              }
            />
            <StatCard
              compactOnPhone
              icon={<CalendarDays strokeWidth={1.8} />}
              iconTone="info"
              title={<Trans>Bookings today</Trans>}
              value={number(checkIns + checkOuts)}
              note={arrivalsNote(checkIns, checkOuts)}
              details={checkIns + checkOuts > 0 ? <TodayDetails rows={today} /> : undefined}
            />
            <StatCard
              compactOnPhone
              icon={<Wallet strokeWidth={1.8} />}
              iconTone="good"
              title={<Trans>Maintenance spending in {month}</Trans>}
              value={loading ? <Skeleton className="h-10 w-20" /> : percent === null ? "—" : `${f.number(percent)}%`}
              note={
                percent === null ? (
                  <Trans>No monthly budget is set.</Trans>
                ) : (
                  <Trans>
                    {f.number(budgetSpent)} of {f.money(budgetTotal, currency, { maximumFractionDigits: 0 })}
                  </Trans>
                )
              }
              bar={percent}
              details={
                budgets.length > 0 ? (
                  <>
                    {budgets.map((row) => (
                      <DetailRow
                        key={row.place_id}
                        title={row.place_name}
                        sub={
                          <Trans>
                            of a{" "}
                            {f.money(row.maintenance_budget?.budget ?? 0, row.maintenance_budget?.currency ?? currency, {
                              maximumFractionDigits: 0,
                            })}{" "}
                            budget
                          </Trans>
                        }
                        end={
                          <span className="font-mono font-semibold tabular-nums">
                            {f.money(row.maintenance_budget?.spent ?? 0, row.maintenance_budget?.currency ?? currency, {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        }
                      />
                    ))}
                  </>
                ) : undefined
              }
            />
          </div>
        </div>

        <Panel labelledBy="your-places">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle id="your-places">
              <Trans>Your places</Trans>
            </PanelTitle>
            <Link to="/places" className="inline-flex min-h-11 items-center text-sm font-semibold">
              <Trans>See all</Trans>
            </Link>
          </div>
          {placesError ? (
            <p className="m-0 text-muted-foreground">
              <Trans>We could not load your places.</Trans>
            </p>
          ) : places === null ? (
            <Skeleton className="h-[168px]" />
          ) : places.length === 0 ? (
            <div className="flex flex-col items-start gap-3 border border-dashed border-border p-[18px]">
              <span className="text-muted-foreground">
                <Trans>Add your first property to see it here.</Trans>
              </span>
              <Link to="/place/new" className={cn(buttonVariants(), "no-underline")}>
                <Trans>Add place</Trans>
              </Link>
            </div>
          ) : (
            // The first places only, so nothing scrolls inside the card; See all opens the rest.
            <div className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]">
              {places.slice(0, HOME_PLACES).map((place) => (
                <Link
                  key={place.id}
                  to="/place/$place_id"
                  params={{ place_id: place.id }}
                  className="am-lift box-border flex min-w-0 flex-col gap-3.5 border border-border bg-card p-[18px] text-foreground no-underline"
                >
                  <span className="flex items-start gap-3">
                    <span aria-hidden="true" className="inline-flex size-11 flex-none items-center justify-center bg-secondary">
                      <Building2 className="size-5" strokeWidth={1.8} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col leading-[1.4]">
                      <span className="truncate text-base font-semibold">{place.place_name}</span>
                      <span className="text-[13px] text-muted-foreground">
                        <TypeLabel type={place.place_type} />
                        {t`, `}
                        {place.city}
                      </span>
                      <PlaceStatusText status={place.status} />
                    </span>
                  </span>
                  <span className="flex gap-3 border-t border-border pt-3">
                    <PlaceStat label={<Trans>Assets</Trans>} value={counts[place.id] ? f.number(counts[place.id].assets) : "—"} />
                    <PlaceStat label={<Trans>Open tickets</Trans>} value={counts[place.id] ? f.number(counts[place.id].openTickets) : "—"} />
                    <PlaceStat
                      label={<Trans>Workers</Trans>}
                      value={workerCounts[place.id] === undefined ? "—" : f.number(workerCounts[place.id])}
                    />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </Page>
  )
}

function PlaceStat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <span className="flex flex-1 flex-col leading-[1.35]">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="font-mono text-lg font-semibold tabular-nums">{value}</span>
    </span>
  )
}

function TodayDetails({ rows }: { rows: { checkIns: TodayRow[]; checkOuts: TodayRow[] } | null }) {
  if (!rows) return <Skeleton className="my-2 h-10" />
  return (
    <>
      {rows.checkIns.map(({ booking, place }) => (
        <DetailRow
          key={`in-${booking.id}`}
          title={<Trans>Check-in: {booking.guest_name}</Trans>}
          sub={place.place_name}
          end={<BookingStatusChip status={booking.status} />}
        />
      ))}
      {rows.checkOuts.map(({ booking, place }) => (
        <DetailRow
          key={`out-${booking.id}`}
          title={<Trans>Check-out: {booking.guest_name}</Trans>}
          sub={place.place_name}
          end={<BookingStatusChip status={booking.status} />}
        />
      ))}
    </>
  )
}

// ─── Worker ─────────────────────────────────────────────────────────────────

function WorkerHome() {
  const { user, accessToken } = useAuth()
  const f = useFormat()
  const [now] = useState(() => new Date())
  const { places, dashboard, placesError, dashboardError, refresh } = useHomeData()
  const [reporting, setReporting] = useState(false)
  const today = useTodayBookings(places, dashboard)

  // My open tasks: approved tickets assigned to me, soonest due first.
  const [tasks, setTasks] = useState<{ items: Ticket[]; total: number } | null>(null)
  const [tasksError, setTasksError] = useState(false)
  useEffect(() => {
    if (!accessToken || !user) return
    let alive = true
    listTickets(accessToken, { assignee_id: user.id, status: "APPROVED", sort: "due_date" }, 1, 100)
      .then((result) => alive && setTasks({ items: result.data, total: result.pagination.total }))
      .catch(() => alive && setTasksError(true))
    return () => {
      alive = false
    }
  }, [accessToken, user])

  const placeById = useMemo(() => new Map((places ?? []).map((p) => [p.id, p])), [places])
  const isOverdue = (ticket: Ticket) => {
    if (!ticket.due_date) return false
    const place = placeById.get(ticket.place_id)
    return ticket.due_date.slice(0, 10) < todayIn(place?.timezone ?? "Asia/Riyadh")
  }
  const overdue = tasks?.items.filter(isOverdue).length ?? 0
  const checkIns = sum(dashboard ?? [], (r) => r.today?.check_ins)
  const loading = (value: unknown, failed: boolean) => value === null && !failed


  return (
    <Page
      title={greeting(now.getHours(), user?.fullname ?? "")}
      description={f.date(now, { weekday: "long", day: "numeric", month: "long" })}
      phoneTitle={<Trans>Home</Trans>}
      phoneSubtitle={f.date(now, { weekday: "long", day: "numeric", month: "long" })}
      phoneStart="logo"
      actions={
        <Button type="button" className="w-full desk:w-auto" onClick={() => setReporting(true)}>
          <Camera aria-hidden="true" strokeWidth={1.8} />
          <Trans>Report damage</Trans>
        </Button>
      }
    >
      {/* With one place the report starts on it; otherwise the worker picks the place. */}
      {reporting && (
        <ReportPopup
          placeId={places?.length === 1 ? places[0].id : undefined}
          onClose={() => setReporting(false)}
          onSaved={() => {
            setReporting(false)
            refresh()
          }}
        />
      )}
      <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
        <StatCard
          title={<Trans>My open tasks</Trans>}
          value={loading(tasks, tasksError) ? <Skeleton className="h-10 w-16" /> : tasksError ? "—" : f.number(tasks?.total ?? 0)}
          note={
            overdue === 0
              ? <Trans>None of them is overdue</Trans>
              : plural(overdue, { one: "One of them is overdue", other: "# of them are overdue" })
          }
          details={
            tasks && tasks.items.length > 0 ? (
              <>
                {tasks.items.slice(0, 3).map((ticket) => {
                  const late = isOverdue(ticket)
                  const place = placeById.get(ticket.place_id)?.place_name ?? ""
                  const due = ticket.due_date ? f.date(ticket.due_date.slice(0, 10), { day: "numeric", month: "long" }) : null
                  return (
                    <DetailRow
                      key={ticket.id}
                      title={<span dir="auto" className="line-clamp-1">{ticket.description}</span>}
                      sub={
                        due === null
                          ? place
                          : late
                            ? <Trans>{place}, was due {due}</Trans>
                            : <Trans>{place}, due {due}</Trans>
                      }
                      end={late ? <OverdueChip /> : <TicketStatusChip status={ticket.status} />}
                    />
                  )
                })}
                <Link to="/tickets" className="no-underline">
                  <DetailsLink>
                    <Trans>Open my tasks</Trans>
                    <ChevronLeft aria-hidden="true" className="size-4 ltr:rotate-180" />
                  </DetailsLink>
                </Link>
              </>
            ) : undefined
          }
        />
        <StatCard
          title={<Trans>Guests arriving today</Trans>}
          value={loading(dashboard, dashboardError) ? <Skeleton className="h-10 w-16" /> : dashboardError ? "—" : f.number(checkIns)}
          note={
            today && today.checkIns.length > 0
              ? [...new Set(today.checkIns.map((r) => r.place.place_name))].join(t`, `)
              : <Trans>No guests arrive today.</Trans>
          }
          details={today && today.checkIns.length > 0 ? <TodayDetails rows={{ checkIns: today.checkIns, checkOuts: [] }} /> : undefined}
        />
        <StatCard
          title={<Trans>My places</Trans>}
          value={loading(places, placesError) ? <Skeleton className="h-10 w-16" /> : placesError ? "—" : f.number(places?.length ?? 0)}
          note={
            places && places.length > 0
              ? places.map((p) => p.place_name).join(t`, `)
              : <Trans>You are not assigned to a place yet.</Trans>
          }
          details={
            places && places.length > 0 ? (
              <>
                {places.map((place) => (
                  <DetailRow key={place.id} title={place.place_name} sub={place.city} end={<StatusBadge status={place.status} />} />
                ))}
                <Link to="/places" className="no-underline">
                  <DetailsLink>
                    <Trans>Open my places</Trans>
                    <ChevronLeft aria-hidden="true" className="size-4 ltr:rotate-180" />
                  </DetailsLink>
                </Link>
              </>
            ) : undefined
          }
        />
      </div>
    </Page>
  )
}
