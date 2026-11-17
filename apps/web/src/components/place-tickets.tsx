import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { ArrowRight, CircleAlert, Plus } from "lucide-react"
import type { Asset, Ticket } from "@amlak/shared"
import { listTickets } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PriorityChip, TicketStatusChip } from "@/components/place-shared"
import { Pager } from "@/components/pager"

const PAGE_SIZE = 20

type Filter = "OPEN" | "ALL"

/**
 * A place's maintenance tickets, paged by the API. "Open" (the default)
 * asks for open=true: PENDING_REVIEW and APPROVED, the same tickets the
 * dashboard and the places page count. "All" sends no filter.
 */
export function PlaceTickets({
  token,
  placeId,
  assets,
}: {
  token: string
  placeId: string
  assets: Asset[] | null
}) {
  const [filter, setFilter] = useState<Filter>("OPEN")
  const [page, setPage] = useState(1)
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setTickets(null)
    setFailed(false)
    listTickets(
      token,
      { place_id: placeId, ...(filter === "OPEN" ? { open: true } : {}) },
      page,
      PAGE_SIZE,
    )
      .then((result) => {
        if (!alive) return
        setTickets(result.data)
        setTotal(result.pagination.total)
        setTotalPages(Math.max(1, result.pagination.total_pages))
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [token, placeId, filter, page])

  function choose(next: Filter) {
    setFilter(next)
    setPage(1)
  }

  const tabs: { key: Filter; label: React.ReactNode }[] = [
    { key: "OPEN", label: <Trans>Open</Trans> },
    { key: "ALL", label: <Trans>All</Trans> },
  ]

  return (
    <Card
      className="am-lift"
      style={S("padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0")}
    >
      <CardHeader
        style={S(
          "padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap",
        )}
      >
        <CardTitle style={S("font-size: 17px; font-weight: 750")}>
          <Trans>Maintenance tickets</Trans>
          {total !== null && (
            <span
              data-testid="place-tickets-total"
              style={S("margin-inline-start: 8px; font-size: 12px; color: var(--muted-foreground)")}
            >
              {total}
            </span>
          )}
        </CardTitle>
        <div style={S("display: flex; align-items: center; gap: 10px; flex-wrap: wrap")}>
          <div role="group" aria-label={t`Filter by status`} style={S("display: flex; gap: 8px")}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className="am-tab"
                aria-pressed={filter === tab.key}
                onClick={() => choose(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <CardAction>
            <Link
              to="/ticket/new"
              search={{ place_id: placeId }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "am-btn")}
              style={S("height: 38px; padding: 0 12px; gap: 6px; white-space: nowrap")}
            >
              <Plus size={16} />
              <Trans>Add ticket</Trans>
            </Link>
          </CardAction>
        </div>
      </CardHeader>

      <CardContent style={S("padding: 20px; display: flex; flex-direction: column; gap: 14px")}>
        {failed ? (
          <p role="alert" className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            <Trans>We could not load the tickets.</Trans>
          </p>
        ) : tickets === null ? (
          <Skeleton style={S("height: 70px")} />
        ) : tickets.length === 0 ? (
          <p style={S("text-align: center; color: var(--muted-foreground); font-size: 14px")}>
            {filter === "OPEN" ? (
              <Trans>This place has no open tickets.</Trans>
            ) : (
              <Trans>This place has no maintenance tickets.</Trans>
            )}
          </p>
        ) : (
          <div style={S("display: flex; flex-direction: column; gap: 10px")}>
            {tickets.map((ticket) => {
              const asset = assets?.find((a) => a.id === ticket.asset_id)
              return (
                <Link
                  key={ticket.id}
                  to="/ticket/$ticket_id"
                  params={{ ticket_id: ticket.id }}
                  className="am-lift"
                  style={S(
                    "display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px; border: 1px solid var(--border); background: var(--card); text-decoration: none; color: inherit",
                  )}
                >
                  <div style={S("display: flex; flex-direction: column; gap: 6px; min-width: 0")}>
                    <strong style={S("font-size: 14px")}>
                      {ticket.description || t`Maintenance ticket`}
                    </strong>
                    <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
                      {asset?.name ?? t`No asset`}
                      {" · "}
                      {ticket.ticket_type === "CORRECTIVE"
                        ? t`Corrective maintenance`
                        : t`Preventive maintenance`}
                    </span>
                    <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
                      <PriorityChip priority={ticket.priority} />
                    </span>
                  </div>
                  <div style={S("display: flex; align-items: center; gap: 10px")}>
                    <TicketStatusChip status={ticket.status} />
                    <ArrowRight size={17} className="rtl:rotate-180" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </CardContent>
    </Card>
  )
}
