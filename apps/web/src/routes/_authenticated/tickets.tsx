import { useEffect, useMemo, useState } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react"
import { CircleAlert } from "lucide-react"
import type { Ticket } from "@amlak/shared"
import { storedUser, useAuth } from "@/lib/auth"
import { getPlaces, listTickets } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { OverdueChip, PriorityChip } from "@/components/place-shared"
import { Pager } from "@/components/pager"
import { Page } from "@/components/page"
import { dateFormat } from "@/lib/format"

export const Route = createFileRoute("/_authenticated/tickets")({
  // Admins cannot list tickets (GET /tickets is for Managers and Workers).
  beforeLoad: () => {
    if (storedUser()?.role === "ADMIN") {
      throw redirect({ to: "/admin" })
    }
  },
  component: TicketsPage,
})

const PAGE_SIZE = 20

function TicketsPage() {
  const { user } = useAuth()
  return user?.role === "WORKER" ? <MyTasks /> : <WaitingForReview />
}

/** The Worker's APPROVED tickets, soonest due first, paged by the API. */
function MyTasks() {
  const { accessToken, user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const placeNames = usePlaceNames()

  useEffect(() => {
    if (!accessToken || !user) return
    let alive = true
    setTickets(null)
    listTickets(
      accessToken,
      { assignee_id: user.id, status: "APPROVED", sort: "due_date" },
      page,
      PAGE_SIZE,
    )
      .then((result) => {
        if (!alive) return
        setTickets(result.data)
        setTotalPages(Math.max(1, result.pagination.total_pages))
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [accessToken, user, page])

  return (
    <TicketsLayout
      title={<Trans>My tasks</Trans>}
      intro={<Trans>Approved tickets assigned to you, the soonest due first.</Trans>}
      tickets={tickets}
      error={error}
      empty={<Trans>You have no open tasks.</Trans>}
      placeNames={placeNames}
      page={page}
      totalPages={totalPages}
      onPage={setPage}
    />
  )
}

/** The Manager's tickets waiting for review, newest first, paged by the API. */
function WaitingForReview() {
  const { accessToken } = useAuth()
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const placeNames = usePlaceNames()

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    setTickets(null)
    listTickets(accessToken, { status: "PENDING_REVIEW" }, page, PAGE_SIZE)
      .then((result) => {
        if (!alive) return
        setTickets(result.data)
        setTotalPages(Math.max(1, result.pagination.total_pages))
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [accessToken, page])

  return (
    <TicketsLayout
      title={<Trans>Waiting for review</Trans>}
      intro={<Trans>Reported damage that needs your approval, newest first.</Trans>}
      tickets={tickets}
      error={error}
      empty={<Trans>No tickets are waiting for review.</Trans>}
      placeNames={placeNames}
      page={page}
      totalPages={totalPages}
      onPage={setPage}
    />
  )
}

function usePlaceNames(): Record<string, string> {
  const { accessToken } = useAuth()
  const [names, setNames] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((places) => {
        if (alive) {
          setNames(Object.fromEntries(places.map((p) => [p.id, p.place_name])))
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [accessToken])
  return names
}

function TicketsLayout({
  title,
  intro,
  tickets,
  error,
  empty,
  placeNames,
  page,
  totalPages,
  onPage,
}: {
  title: React.ReactNode
  intro: React.ReactNode
  tickets: Ticket[] | null
  error: boolean
  empty: React.ReactNode
  placeNames: Record<string, string>
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  const { i18n } = useLingui()
  const dayFormat = useMemo(
    () =>
      dateFormat(i18n.locale === "ar" ? "ar" : "en", {
        dateStyle: "medium",
        timeZone: "UTC",
      }),
    [i18n.locale],
  )

  return (
    <Page title={title} description={intro}>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          <Trans>We could not load the tickets.</Trans>
        </p>
      )}

      {!error && tickets === null && (
        <div style={S("display: flex; flex-direction: column; gap: 10px")}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} style={S("height: 76px")} />
          ))}
        </div>
      )}

      {!error && tickets?.length === 0 && (
        <Empty style={S("padding: 40px")}>
          <EmptyHeader>
            <EmptyTitle>{empty}</EmptyTitle>
            <EmptyDescription>
              <Trans>New tickets will show here.</Trans>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!error && tickets && tickets.length > 0 && (
        <ul style={S("list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px")}>
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                to="/ticket/$ticket_id"
                params={{ ticket_id: ticket.id }}
                className="am-lift"
                data-overdue={ticket.is_overdue ? "true" : undefined}
                style={S(
                  `display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; text-decoration: none; color: inherit; background: var(--card); border: 1px solid ${ticket.is_overdue ? "var(--crit-200)" : "var(--border)"}; border-inline-start: 4px solid ${ticket.is_overdue ? "var(--crit)" : "var(--border)"}`,
                )}
              >
                <span style={S("display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1 1 260px")}>
                  <span style={S("font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                    {ticket.description}
                  </span>
                  <span style={S("font-size: 13px; color: var(--muted-foreground)")}>
                    {placeNames[ticket.place_id] ?? <Trans>Place</Trans>}
                    {" · "}
                    {ticket.due_date ? (
                      <Trans>Due {dayFormat.format(new Date(ticket.due_date))}</Trans>
                    ) : (
                      <Trans>
                        Reported {dayFormat.format(new Date(ticket.created_at))}
                      </Trans>
                    )}
                  </span>
                </span>
                <span style={S("display: flex; gap: 8px; flex-wrap: wrap")}>
                  {ticket.is_overdue && <OverdueChip />}
                  <PriorityChip priority={ticket.priority} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager page={page} totalPages={totalPages} onPage={onPage} />
    </Page>
  )
}
