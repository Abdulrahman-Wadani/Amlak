import { useEffect, useState, type ReactNode } from "react"
import { useEmbedded } from "@/components/panel"
import { ReportPopup } from "@/components/report-form"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Plus } from "lucide-react"
import type { Asset, Ticket } from "@amlak/shared"
import { listTickets } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pager } from "@/components/pager"
import { EmptyState, LoadError, LoadingList } from "@/components/states"
import { TicketCard } from "@/components/ticket-parts"

const PAGE_SIZE = 20

type Filter = "OPEN" | "ALL"

/**
 * The maintenance tickets of a place, or of one asset with assetId, paged
 * by the API. "Open" (the default) asks for open=true: PENDING_REVIEW and
 * APPROVED, the same tickets the dashboard and the places page count.
 * "All" sends no open filter.
 */
export function TicketsSection({
  token,
  placeId,
  assetId,
  assets,
  title,
  emptyOpen,
  emptyAll,
  showAddTicket = false,
}: {
  token: string
  placeId: string
  /** Only this asset's tickets (GET /tickets?asset_id=). */
  assetId?: string
  /** The place's assets, to name each ticket's asset; omit on an asset page. */
  assets?: Asset[] | null
  title: ReactNode
  emptyOpen: ReactNode
  emptyAll: ReactNode
  /** The Add ticket button: a Report damage popup for this place. */
  showAddTicket?: boolean
}) {
  const embedded = useEmbedded()
  const [filter, setFilter] = useState<Filter>("OPEN")
  const [page, setPage] = useState(1)
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [failed, setFailed] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    setTickets(null)
    setFailed(false)
    listTickets(
      token,
      {
        place_id: placeId,
        ...(assetId ? { asset_id: assetId } : {}),
        ...(filter === "OPEN" ? { open: true } : {}),
      },
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
  }, [token, placeId, assetId, filter, page, version])

  function choose(next: Filter) {
    setFilter(next)
    setPage(1)
  }

  const tabs: { key: Filter; label: ReactNode }[] = [
    { key: "OPEN", label: <Trans>Open</Trans> },
    { key: "ALL", label: <Trans>All</Trans> },
  ]

  return (
    <Card
      className={embedded ? undefined : "am-lift"}
      style={S(
        embedded
          ? "padding: 0; border: 0; box-shadow: none; background: transparent; overflow: visible; gap: 0"
          : "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0",
      )}
    >
      <CardHeader
        style={S(
          `${embedded ? "padding: 0 0 16px" : "padding: 18px 20px; border-bottom: 1px solid var(--border)"}; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap`,
        )}
      >
        <CardTitle className={embedded ? "sr-only" : undefined} style={S("font-size: 17px; font-weight: 750")}>
          {title}
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
          {showAddTicket && (
            <CardAction>
              <Button type="button" variant="outline" onClick={() => setReporting(true)}>
                <Plus size={16} />
                <Trans>Add ticket</Trans>
              </Button>
            </CardAction>
          )}
        </div>
      </CardHeader>

      {reporting && (
        <ReportPopup
          placeId={placeId}
          onClose={() => setReporting(false)}
          onSaved={() => {
            setReporting(false)
            setVersion((n) => n + 1)
          }}
        />
      )}
      <CardContent style={S(`padding: ${embedded ? "0" : "20px"}; display: flex; flex-direction: column; gap: 14px`)}>
        {failed ? (
          <LoadError card={false} title={<Trans>Could not load tickets</Trans>} />
        ) : tickets === null ? (
          <LoadingList card={false} rows={2} />
        ) : tickets.length === 0 ? (
          <EmptyState card={false} title={filter === "OPEN" ? emptyOpen : emptyAll} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] items-stretch gap-4">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                asset={assetId ? undefined : assets?.find((a) => a.id === ticket.asset_id)?.name}
              />
            ))}
          </div>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </CardContent>
    </Card>
  )
}
