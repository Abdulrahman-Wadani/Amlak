import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Check, ChevronRight } from "lucide-react"
import type { Ticket } from "@amlak/shared"
import { getPlaceAssets, getPlaces } from "@/lib/api"
import { useFormat } from "@/lib/format"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"
import { OverdueChip, TicketStatusChip } from "@/components/place-shared"
import { PriorityText } from "@/components/home-parts"

/** Place names, and the asset names of the places that show up, for the ticket cards. */
export function useTicketNames(token: string | null, placeIds: string[]) {
  const [places, setPlaces] = useState<Record<string, string>>({})
  const [assets, setAssets] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!token) return
    let alive = true
    getPlaces(token)
      .then((list) => alive && setPlaces(Object.fromEntries(list.map((p) => [p.id, p.place_name]))))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  const wanted = [...new Set(placeIds)].filter((id) => !loaded.has(id))
  const key = wanted.sort().join(",")
  useEffect(() => {
    if (!token || !key) return
    const ids = key.split(",")
    setLoaded((prev) => new Set([...prev, ...ids]))
    for (const id of ids) {
      getPlaceAssets(token, id)
        .then((list) => setAssets((prev) => ({ ...prev, ...Object.fromEntries(list.map((a) => [a.id, a.name])) })))
        .catch(() => {})
    }
  }, [token, key])

  return { places, assets }
}

/** A ticket's status, or Overdue when an approved ticket is past its due date. */
export function TicketChip({ ticket }: { ticket: Ticket }) {
  return ticket.is_overdue ? <OverdueChip /> : <TicketStatusChip status={ticket.status} />
}

/** A card in the Manager's tickets list: what, where, status, priority and when. */
export function TicketCard({ ticket, asset, place }: { ticket: Ticket; asset?: string; place?: string }) {
  const { relative } = useFormat()
  const where = asset && place ? t`${asset}, ${place}` : (asset ?? place ?? "")
  return (
    <Link
      to="/ticket/$ticket_id"
      params={{ ticket_id: ticket.id }}
      className="am-lift box-border flex min-w-0 flex-col gap-2.5 border border-border bg-card p-4 text-foreground no-underline shadow-sm"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col leading-[1.5]">
          <span dir="auto" className="truncate font-semibold">
            {ticket.description}
          </span>
          <span className="text-[13px] text-muted-foreground">{where || " "}</span>
        </span>
        <ChevronRight aria-hidden="true" className="mt-0.5 size-5 flex-none text-muted-foreground rtl:rotate-180" strokeWidth={1.8} />
      </span>
      <span className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[13px]">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <TicketChip ticket={ticket} />
          <PriorityText priority={ticket.priority} />
        </span>
        <span className="text-muted-foreground">{relative(ticket.created_at)}</span>
      </span>
    </Link>
  )
}

/** A card in the Worker's lists: the task, its place and due date, and Complete task when it is theirs to do. */
export function TaskCard({ ticket, place, canComplete }: { ticket: Ticket; place?: string; canComplete: boolean }) {
  const { date, relative } = useFormat()
  const due = ticket.due_date ? date(ticket.due_date, { day: "numeric", month: "long" }) : null
  const when =
    ticket.status === "APPROVED" && due
      ? ticket.is_overdue
        ? t`Was due ${due}`
        : t`Due ${due}`
      : relative(ticket.created_at)
  return (
    <div className="box-border flex min-w-0 flex-col gap-2.5 border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link
          to="/ticket/$ticket_id"
          params={{ ticket_id: ticket.id }}
          className="flex min-h-11 min-w-0 flex-col leading-[1.5] text-foreground no-underline hover:underline"
        >
          <span dir="auto" className="line-clamp-2 font-semibold">
            {ticket.description}
          </span>
          <span className="text-[13px] text-muted-foreground">{place ? t`${place}, ${when}` : when}</span>
        </Link>
        <TicketChip ticket={ticket} />
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-[15px]">
        <PriorityText priority={ticket.priority} />
        {canComplete && (
          <Link to="/ticket/complete/$ticket_id" params={{ ticket_id: ticket.id }} className={cn(buttonVariants())}>
            <Check aria-hidden="true" />
            <Trans>Complete task</Trans>
          </Link>
        )}
      </div>
    </div>
  )
}
