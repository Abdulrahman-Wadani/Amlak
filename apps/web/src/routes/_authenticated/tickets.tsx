import { useEffect, useState } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { plural, t } from "@lingui/core/macro"
import { Camera } from "lucide-react"
import type { Place, Ticket, TicketStatus } from "@amlak/shared"
import { storedUser, useAuth } from "@/lib/auth"
import { getPlaces, listAllTickets, listTickets } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Page } from "@/components/page"
import { ReportPopup } from "@/components/report-form"
import { FilterTabs, ListFooter, NativeSelect, Panel } from "@/components/panel"
import { EmptyState, LoadError, LoadingList } from "@/components/states"
import { TaskCard, TicketCard, useTicketNames } from "@/components/ticket-parts"

export const Route = createFileRoute("/_authenticated/tickets")({
  // Admins cannot list tickets (GET /tickets is for Managers and Workers).
  beforeLoad: () => {
    if (storedUser()?.role === "ADMIN") {
      throw redirect({ to: "/admin" })
    }
  },
  component: TicketsPage,
})

const PAGE_SIZE = 12
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] items-stretch gap-4"

function TicketsPage() {
  const { user } = useAuth()
  return user?.role === "WORKER" ? <MyTasks /> : <ManagerTickets />
}

type Filter = "ALL" | TicketStatus
const FILTERS: { key: Filter; label: React.ReactNode }[] = [
  { key: "ALL", label: <Trans>All</Trans> },
  { key: "PENDING_REVIEW", label: <Trans>Pending review</Trans> },
  { key: "APPROVED", label: <Trans>Approved</Trans> },
  { key: "COMPLETED", label: <Trans>Completed</Trans> },
  { key: "REJECTED", label: <Trans>Rejected</Trans> },
]

/** The Manager's tickets, by status and place, newest first, paged by the API. */
function ManagerTickets() {
  const { accessToken } = useAuth()
  const [filter, setFilter] = useState<Filter>("ALL")
  const [placeId, setPlaceId] = useState("")
  const [page, setPage] = useState(1)
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Partial<Record<Filter, number>>>({})
  const [places, setPlaces] = useState<Place[]>([])
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const names = useTicketNames(accessToken, tickets?.map((ticket) => ticket.place_id) ?? [])

  useEffect(() => {
    if (!accessToken) return
    getPlaces(accessToken)
      .then(setPlaces)
      .catch(() => {})
  }, [accessToken])

  // One small request per status, for the counts on the filters.
  useEffect(() => {
    if (!accessToken) return
    let alive = true
    for (const item of FILTERS) {
      listTickets(
        accessToken,
        { status: item.key === "ALL" ? undefined : item.key, place_id: placeId || undefined },
        1,
        1,
      )
        .then((result) => alive && setCounts((prev) => ({ ...prev, [item.key]: result.pagination.total })))
        .catch(() => {})
    }
    return () => {
      alive = false
    }
  }, [accessToken, placeId, reload])

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    setTickets(null)
    setFailed(false)
    listTickets(
      accessToken,
      { status: filter === "ALL" ? undefined : filter, place_id: placeId || undefined },
      page,
      PAGE_SIZE,
    )
      .then((result) => {
        if (!alive) return
        setTickets(result.data)
        setTotal(result.pagination.total)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, filter, placeId, page, reload])

  const pending = counts.PENDING_REVIEW
  const summary =
    pending === undefined
      ? undefined
      : plural(pending, {
          0: "No tickets wait for your review.",
          one: "One ticket waiting for your review.",
          other: "# tickets waiting for your review.",
        })

  return (
    <Page title={<Trans>Maintenance tickets</Trans>} phoneTitle={<Trans>Maintenance</Trans>} description={summary}>
      {/* One card holds the page's list, its filters and its pages. */}
      <Panel className="gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterTabs
            label={t`Filter by status`}
            value={filter}
            onChange={(key) => {
              setFilter(key)
              setPage(1)
            }}
            tabs={FILTERS.map((item) => ({ key: item.key, label: item.label, count: counts[item.key] ?? 0 }))}
          />
          <div className="w-full desk:w-[220px]">
            <label htmlFor="ticket-place" className="sr-only">
              <Trans>Place</Trans>
            </label>
            <NativeSelect
              id="ticket-place"
              value={placeId}
              onChange={(value) => {
                setPlaceId(value)
                setPage(1)
              }}
            >
              <option value="">{t`All places`}</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.place_name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {failed ? (
          <LoadError title={<Trans>Could not load tickets</Trans>} onRetry={() => setReload((n) => n + 1)} />
        ) : tickets === null ? (
          <LoadingList />
        ) : tickets.length === 0 ? (
          filter === "PENDING_REVIEW" ? (
            <EmptyState
              title={<Trans>No tickets waiting for review</Trans>}
              text={<Trans>When a worker reports damage, the ticket will appear here.</Trans>}
            />
          ) : (
            <EmptyState title={<Trans>No tickets here</Trans>} text={<Trans>Tickets with this status will appear here.</Trans>} />
          )
        ) : (
          <div className={GRID}>
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                place={names.places[ticket.place_id]}
                asset={ticket.asset_id ? names.assets[ticket.asset_id] : undefined}
              />
            ))}
          </div>
        )}

        {tickets && tickets.length > 0 && (
          <ListFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            range={(from, to, all) => t`${from} to ${to} of ${all} tickets`}
            onPage={setPage}
          />
        )}
      </Panel>
    </Page>
  )
}

type Tab = "ASSIGNED" | "REPORTS" | "COMPLETED"

/** The Worker's tasks: assigned and approved, the reports they sent, and what they completed. */
function MyTasks() {
  const { accessToken, user } = useAuth()
  const [tab, setTab] = useState<Tab>("ASSIGNED")
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [reporting, setReporting] = useState(false)
  const names = useTicketNames(accessToken, [])

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    setFailed(false)
    // A worker sees the tickets of their own places: few enough to read at once.
    listAllTickets(accessToken, { sort: "due_date" })
      .then((list) => alive && setTickets(list))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, reload])

  const me = user?.id
  const groups: Record<Tab, Ticket[]> = {
    ASSIGNED: tickets?.filter((ticket) => ticket.assignee_id === me && ticket.status === "APPROVED") ?? [],
    REPORTS: tickets?.filter((ticket) => ticket.reporter_id === me) ?? [],
    COMPLETED: tickets?.filter((ticket) => ticket.assignee_id === me && ticket.status === "COMPLETED") ?? [],
  }
  const shown = groups[tab]

  return (
    <Page
      title={<Trans>My tasks</Trans>}
      description={<Trans>Tickets assigned to you.</Trans>}
      phoneActions={false}
      actions={
        <Button type="button" onClick={() => setReporting(true)}>
          <Camera aria-hidden="true" />
          <Trans>Report damage</Trans>
        </Button>
      }
    >
      {reporting && (
        <ReportPopup
          onClose={() => setReporting(false)}
          onSaved={() => {
            setReporting(false)
            setReload((n) => n + 1)
          }}
        />
      )}
      {/* One card holds the page's list, its filters and its pages. */}
      <Panel className="gap-5">
        <FilterTabs
          label={t`Filter tasks`}
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "ASSIGNED", label: <Trans>Assigned to me</Trans>, count: groups.ASSIGNED.length },
            { key: "REPORTS", label: <Trans>My reports</Trans>, count: groups.REPORTS.length },
            { key: "COMPLETED", label: <Trans>Completed</Trans>, count: groups.COMPLETED.length },
          ]}
        />

        {failed ? (
          <LoadError title={<Trans>Could not load tickets</Trans>} onRetry={() => setReload((n) => n + 1)} />
        ) : tickets === null ? (
          <LoadingList />
        ) : shown.length === 0 ? (
          <EmptyState
            title={
              tab === "ASSIGNED" ? (
                <Trans>You have no open tasks</Trans>
              ) : tab === "REPORTS" ? (
                <Trans>You have not reported anything yet</Trans>
              ) : (
                <Trans>No completed tasks yet</Trans>
              )
            }
            text={tab === "ASSIGNED" ? <Trans>Tasks your manager approves for you will appear here.</Trans> : undefined}
          />
        ) : (
          <div className={GRID}>
            {shown.map((ticket) => (
              <TaskCard
                key={ticket.id}
                ticket={ticket}
                place={names.places[ticket.place_id]}
                canComplete={tab === "ASSIGNED"}
              />
            ))}
          </div>
        )}

        <p className="m-0 text-[13px] text-muted-foreground">
          <Trans>“My reports” shows the reports you sent and their status, with photos and no costs.</Trans>
        </p>
      </Panel>
    </Page>
  )
}
