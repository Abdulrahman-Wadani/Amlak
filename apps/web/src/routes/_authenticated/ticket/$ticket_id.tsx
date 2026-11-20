import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link, createFileRoute, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { plural, t } from "@lingui/core/macro"
import { Check, CircleAlert, RotateCw } from "lucide-react"
import type { Asset, Place, PlaceWorker, Ticket } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import {
  approveTicket,
  getAssetById,
  getPlace,
  getPlaceHealth,
  getPlaceWorkers,
  getTicketById,
  getWorkers,
  reassignTicket,
  rejectTicket,
  type DashboardPlace,
} from "@/lib/api"
import { todayIn } from "@/lib/dates"
import { ApiError, errorMessage } from "@/lib/errors"
import { LIMITS, tooLarge, tooLong } from "@/lib/limits"
import { useFormat } from "@/lib/format"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "cn"
import { Page } from "@/components/page"
import { Field, InfoRows, NativeSelect, Panel, PanelTitle, PhoneActionBar } from "@/components/panel"
import { PhotoTiles } from "@/components/photo-picker"
import { PriorityText } from "@/components/home-parts"
import { LoadError, Notice } from "@/components/states"
import { TicketChip } from "@/components/ticket-parts"
import { toast } from "@/components/toast"

export const Route = createFileRoute("/_authenticated/ticket/$ticket_id")({
  component: TicketPage,
})

type Person = { id: string; name: string }

/**
 * A maintenance ticket: its description and photos, its history and
 * details, and what the viewer can do with it: review (approve or reject)
 * and reassign for the Manager, complete for the assigned Worker.
 */
function TicketPage() {
  const { ticket_id } = useParams({ from: "/_authenticated/ticket/$ticket_id" })
  const { accessToken, user } = useAuth()
  const isManager = user?.role === "MANAGER"
  const { date, relative, dateFormat, number } = useFormat()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [assignable, setAssignable] = useState<Person[]>([])
  const [health, setHealth] = useState<DashboardPlace | null>(null)
  const [failed, setFailed] = useState(false)
  const [changed, setChanged] = useState(false)

  const load = useCallback(async () => {
    if (!accessToken) return
    const found = await getTicketById(accessToken, ticket_id)
    setTicket(found)
    if (found.asset_id) getAssetById(accessToken, found.asset_id).then(setAsset).catch(() => setAsset(null))
    return found
  }, [accessToken, ticket_id])

  useEffect(() => {
    if (!accessToken || !user) return
    let alive = true
    load()
      .then(async (found) => {
        if (!found || !alive) return
        const p = await getPlace(accessToken, found.place_id).catch(() => null)
        if (!alive) return
        setPlace(p)
        const people: Record<string, string> = { [user.id]: user.fullname }
        if (isManager) {
          const [workers, placeWorkers, row] = await Promise.all([
            getWorkers(accessToken).catch(() => []),
            getPlaceWorkers(accessToken, found.place_id).catch(() => [] as PlaceWorker[]),
            getPlaceHealth(accessToken, found.place_id).catch(() => null),
          ])
          for (const worker of workers) people[worker.id] = worker.fullname
          if (!alive) return
          setHealth(row)
          setAssignable([
            ...placeWorkers
              .filter((item) => item.worker.status === "ACTIVE")
              .map((item) => ({ id: item.worker.id, name: item.worker.fullname })),
            ...(p ? [{ id: p.owner_id, name: t`Me` }] : []),
          ])
        }
        if (alive) setNames(people)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, user, isManager, load])

  // Someone else acted on the ticket first: show its latest state and say so.
  async function onConflict(err: unknown): Promise<boolean> {
    if (err instanceof ApiError && err.status === 409) {
      await load().catch(() => {})
      setChanged(true)
      return true
    }
    return false
  }

  const nameOf = (id: string | null) => (id ? names[id] : undefined)
  const due = ticket?.due_date ? date(ticket.due_date, { day: "numeric", month: "long" }) : null
  const damage = ticket?.attachments?.filter((a) => a.attachment_type === "DAMAGE").map((a) => a.file_url) ?? []
  const after = ticket?.attachments?.filter((a) => a.attachment_type === "AFTER_REPAIR").map((a) => a.file_url) ?? []
  const when = (value: string) => dateFormat({ dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  const placeLink = place && (
    <Link
      to="/place/$place_id"
      params={{ place_id: place.id }}
      className="relative underline underline-offset-4 before:absolute before:inset-x-0 before:-inset-y-3.5 before:content-['']"
    >
      {place.place_name}
    </Link>
  )

  if (failed) {
    return (
      <Page
        title={<Trans>Maintenance ticket</Trans>}
        parent={isManager ? { label: <Trans>Maintenance tickets</Trans>, link: { to: "/tickets" } } : { label: <Trans>My tasks</Trans>, link: { to: "/tickets" } }}
      >
        <LoadError title={<Trans>Could not load this ticket</Trans>} onRetry={() => window.location.reload()} />
      </Page>
    )
  }

  const pending = ticket?.status === "PENDING_REVIEW"
  const approved = ticket?.status === "APPROVED"
  const mine = ticket?.assignee_id === user?.id

  // The ticket's history, newest first, from what the ticket records.
  const damageCount = number(damage.length)
  const afterCount = number(after.length)
  const history: { at: string; who?: string; text: React.ReactNode }[] = []
  if (ticket) {
    const photos = damage.length
    history.push({
      at: ticket.created_at,
      who: nameOf(ticket.reporter_id),
      text:
        photos > 0
          ? plural(photos, {
              one: "created the ticket and attached one photo.",
              other: "created the ticket and attached # photos.",
            })
          : t`created the ticket.`,
    })
    if (ticket.reviewed_at && ticket.status !== "PENDING_REVIEW") {
      const assignee = nameOf(ticket.assignee_id)
      history.push({
        at: ticket.reviewed_at,
        who: nameOf(ticket.reviewed_by),
        text:
          ticket.status === "REJECTED"
            ? t`rejected the ticket.`
            : assignee
              ? t`approved the ticket and assigned ${assignee}.`
              : t`approved the ticket.`,
      })
    }
    if (ticket.completed_at) {
      history.push({ at: ticket.completed_at, who: nameOf(ticket.assignee_id), text: t`completed the ticket.` })
    }
    history.sort((a, b) => b.at.localeCompare(a.at))
  }

  const detailRows = ticket
    ? [
        { label: <Trans>Status</Trans>, value: <TicketChip ticket={ticket} /> },
        { label: <Trans>Priority</Trans>, value: <PriorityText priority={ticket.priority} /> },
        ...(pending || ticket.status === "REJECTED"
          ? [
              {
                label: <Trans>Type</Trans>,
                value: ticket.ticket_type === "PREVENTIVE" ? <Trans>Preventive</Trans> : <Trans>Corrective</Trans>,
              },
            ]
          : []),
        ...(!pending && ticket.status !== "REJECTED" && nameOf(ticket.assignee_id)
          ? [{ label: <Trans>Assigned to</Trans>, value: nameOf(ticket.assignee_id) }]
          : []),
        ...(approved && due ? [{ label: <Trans>Due</Trans>, value: due }] : []),
        ...(approved && ticket.estimated_cost != null && place
          ? [{ label: <Trans>Estimated cost</Trans>, value: <Amount value={ticket.estimated_cost} currency={place.currency} /> }]
          : []),
        ...(ticket.status === "COMPLETED" && ticket.actual_cost != null && place
          ? [{ label: <Trans>Actual cost</Trans>, value: <Amount value={ticket.actual_cost} currency={place.currency} /> }]
          : []),
        { label: <Trans>Place</Trans>, value: placeLink ?? "—" },
        ...(pending || ticket.status === "REJECTED"
          ? [{ label: <Trans>Asset</Trans>, value: asset?.name ?? <Trans>No specific asset</Trans> }]
          : []),
        ...((pending || ticket.status === "REJECTED") && nameOf(ticket.reporter_id)
          ? [{ label: <Trans>Reported by</Trans>, value: nameOf(ticket.reporter_id) }]
          : []),
      ]
    : []

  return (
    <Page
      title={ticket ? <span className="line-clamp-2"><bdi>{ticket.description}</bdi></span> : <Skeleton className="h-7 w-72" />}
      phoneTitle={<Trans>Maintenance ticket</Trans>}
      phoneSubtitle={ticket && place ? t`${place.place_name}, ${relative(ticket.created_at)}` : undefined}
      parent={
        isManager
          ? { label: <Trans>Maintenance tickets</Trans>, link: { to: "/tickets" } }
          : { label: <Trans>My tasks</Trans>, link: { to: "/tickets" } }
      }
      phoneEnd="none"
      tabs={!(isManager && pending)}
    >
      {changed && (
        <Notice tone="warn" icon={<RotateCw />} title={<Trans>The ticket status changed.</Trans>}>
          <Trans>Someone else acted on it a moment ago. We reloaded it so you see the latest status.</Trans>
        </Notice>
      )}
      {ticket === null ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          {/* What to do next first (at the start: right in Arabic), then the details; side by side when there is room. */}
          <div className="grid items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))] desk:gap-6 [&>div>section]:flex-1">
            {isManager && pending && place && (
              <>
                <div className="flex flex-col desk:hidden">
                  <ReviewPanel
                    ticket={ticket}
                    place={place}
                    people={assignable}
                    remaining={health?.maintenance_budget?.remaining}
                    reporter={nameOf(ticket.reporter_id)}
                    onDone={load}
                    onConflict={onConflict}
                    phone
                  />
                </div>
                <div className="hidden flex-col desk:flex">
                  <ReviewPanel
                    ticket={ticket}
                    place={place}
                    people={assignable}
                    remaining={health?.maintenance_budget?.remaining}
                    reporter={nameOf(ticket.reporter_id)}
                    onDone={load}
                    onConflict={onConflict}
                  />
                </div>
              </>
            )}
            {isManager && approved && place && (
              <ReassignPanel ticket={ticket} place={place} people={assignable} onDone={load} onConflict={onConflict} />
            )}
            {!isManager && approved && mine && (
              <Panel>
                <Link to="/ticket/complete/$ticket_id" params={{ ticket_id: ticket.id }} className={cn(buttonVariants(), "w-full")}>
                  <Check aria-hidden="true" />
                  <Trans>Complete task</Trans>
                </Link>
                {due && (
                  <span className="text-[13px] text-muted-foreground">
                    {ticket.is_overdue ? <Trans>Was due {due}</Trans> : <Trans>Due {due}</Trans>}
                  </span>
                )}
              </Panel>
            )}
            <DetailsPanel rows={detailRows} />
          </div>

          {/* Then one card: what happened, with its photos, and the history, a line between each part. */}
          <Panel holdsSections className="gap-6 [&>section+section]:border-t [&>section+section]:border-border [&>section+section]:pt-6">
            <Panel labelledBy="desc-title">
              <PanelTitle id="desc-title">
                <Trans>Description</Trans>
              </PanelTitle>
              <p className="m-0 bg-secondary p-4 text-[15px] leading-[1.8] whitespace-pre-line">
                <bdi>{ticket.description}</bdi>
              </p>
              {damage.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">
                    <Trans>Damage photos ({damageCount})</Trans>
                  </span>
                  <PhotoTiles urls={damage} label={(n) => t`Damage photo ${n}`} />
                </div>
              )}
            </Panel>
            {ticket.status === "REJECTED" && ticket.rejection_reason && (
              <Panel labelledBy="reason-title">
                <PanelTitle id="reason-title">
                  <Trans>Reason for rejection</Trans>
                </PanelTitle>
                <p className="m-0 bg-secondary p-4 text-[15px] leading-[1.8]">
                  <bdi>{ticket.rejection_reason}</bdi>
                </p>
              </Panel>
            )}
            {ticket.status === "COMPLETED" && (
              <Panel labelledBy="after-title">
                <PanelTitle id="after-title">
                  <Trans>After the repair</Trans>
                </PanelTitle>
                {ticket.completion_notes && (
                  <p className="m-0 bg-secondary p-4 text-[15px] leading-[1.8]">
                    <bdi>{ticket.completion_notes}</bdi>
                  </p>
                )}
                {after.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">
                      <Trans>Photos after the repair ({afterCount})</Trans>
                    </span>
                    <PhotoTiles urls={after} label={(n) => t`Photo after repair ${n}`} />
                  </div>
                )}
              </Panel>
            )}
            <Panel labelledBy="history-title">
              <div className="flex flex-col gap-0.5">
                <PanelTitle id="history-title">
                  <Trans>Ticket history</Trans>
                </PanelTitle>
                <span className="text-[13px] text-muted-foreground">
                  <Trans>Who did what to this ticket and when, newest first.</Trans>
                </span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                {history.map((event) => (
                  <li key={`${event.at}-${String(event.text)}`} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2.5 size-2 flex-none rounded-full bg-primary" />
                    <span className="flex flex-col leading-[1.6]">
                      <span>
                        {event.who && <strong className="font-semibold">{event.who} </strong>}
                        {event.text}
                      </span>
                      <span className="text-[13px] text-muted-foreground">{when(event.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </Panel>
        </>
      )}
    </Page>
  )
}

function Amount({ value, currency }: { value: number; currency: string }) {
  const { money } = useFormat()
  return <span className="font-mono tabular-nums">{money(value, currency)}</span>
}

function DetailsPanel({ rows }: { rows: { label: React.ReactNode; value: React.ReactNode }[] }) {
  return (
    <Panel labelledBy="details-title" className="gap-2">
      <PanelTitle id="details-title">
        <Trans>Details</Trans>
      </PanelTitle>
      <InfoRows rows={rows} />
    </Panel>
  )
}

/** Approve (with the estimated cost, the assignee and the due date) or reject with a reason. */
function ReviewPanel({
  ticket,
  place,
  people,
  remaining,
  reporter,
  onDone,
  onConflict,
  phone = false,
}: {
  ticket: Ticket
  place: Place
  people: Person[]
  remaining?: number
  reporter?: string
  onDone: () => Promise<unknown>
  onConflict: (err: unknown) => Promise<boolean>
  phone?: boolean
}) {
  const { accessToken } = useAuth()
  const { money } = useFormat()
  const [cost, setCost] = useState("")
  const [assignee, setAssignee] = useState("")
  const [due, setDue] = useState("")
  const [errors, setErrors] = useState<{ cost?: string; due?: string }>({})
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")
  const chosen = assignee || people[0]?.id || ""
  const prefix = phone ? "m-" : ""

  async function approve(event?: FormEvent) {
    event?.preventDefault()
    if (!accessToken) return
    const next: typeof errors = {}
    if (cost.trim() && !(Number(cost) >= 0)) next.cost = t`Enter an amount of 0 or more, or leave it empty.`
    else next.cost = tooLarge(cost)
    if (!due) next.due = t`Choose the due date.`
    setErrors(next)
    if (Object.values(next).some(Boolean) || !chosen) return
    setBusy(true)
    setError("")
    try {
      await approveTicket(accessToken, ticket.id, {
        assignee_id: chosen,
        due_date: due,
        ...(cost.trim() ? { estimated_cost: Number(cost) } : {}),
      })
      const name = people.find((person) => person.id === chosen)?.name ?? ""
      toast(t`Ticket approved and sent to ${name}.`)
      await onDone()
    } catch (err) {
      if (!(await onConflict(err))) setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function reject() {
    if (!accessToken) return
    const reasonProblem = reason.trim() ? tooLong(reason, LIMITS.text) : t`Write the reason.`
    if (reasonProblem) {
      setReasonError(reasonProblem)
      return
    }
    setBusy(true)
    setReasonError("")
    try {
      await rejectTicket(accessToken, ticket.id, { reason: reason.trim() })
      setRejecting(false)
      toast(t`Ticket rejected.`)
      await onDone()
    } catch (err) {
      setRejecting(false)
      if (!(await onConflict(err))) setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const approveButton = (
    <Button type="submit" form={`${prefix}review-form`} disabled={busy} className={phone ? undefined : "w-full"}>
      <Trans>Approve ticket</Trans>
    </Button>
  )
  const rejectButton = (
    <Button type="button" variant="destructive" disabled={busy} className={phone ? undefined : "w-full"} onClick={() => setRejecting(true)}>
      {phone ? <Trans>Reject</Trans> : <Trans>Reject ticket</Trans>}
    </Button>
  )

  return (
    <Panel labelledBy={`${prefix}review-title`} className="gap-4">
      <PanelTitle id={`${prefix}review-title`}>
        <Trans>Review</Trans>
      </PanelTitle>
      <form id={`${prefix}review-form`} onSubmit={approve} noValidate className="flex flex-col gap-4">
        <Field
          id={`${prefix}cost`}
          optional
          label={<Trans>Estimated cost</Trans>}
          error={errors.cost}
          hint={
            remaining != null ? (
              <Trans>Left in this place’s budget this month: {money(remaining, place.currency, { maximumFractionDigits: 0 })}</Trans>
            ) : (
              <Trans>In Saudi riyals.</Trans>
            )
          }
        >
          <Input id={`${prefix}cost`} inputMode="decimal" dir="ltr" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
        <Field id={`${prefix}assignee`} required label={<Trans>Assign to</Trans>}>
          <NativeSelect id={`${prefix}assignee`} value={chosen} onChange={setAssignee}>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id={`${prefix}due`} required label={<Trans>Due date</Trans>} error={errors.due}>
          <Input
            id={`${prefix}due`}
            type="date"
            dir="ltr"
            min={todayIn(place.timezone)}
            value={due}
            aria-invalid={errors.due ? true : undefined}
            onChange={(e) => setDue(e.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {error}
          </p>
        )}
        {!phone && (
          <div className="flex flex-col gap-2.5">
            {approveButton}
            {rejectButton}
            <span className="text-[13px] text-muted-foreground">
              {reporter ? (
                <Trans>If you reject, we will ask for a reason and send it to {reporter}.</Trans>
              ) : (
                <Trans>If you reject, we will ask for a reason and send it to the reporter.</Trans>
              )}
            </span>
          </div>
        )}
      </form>
      {phone && (
        <PhoneActionBar>
          <div className="flex flex-[1] [&>*]:w-full">{rejectButton}</div>
          <div className="flex flex-[2] [&>*]:w-full">{approveButton}</div>
        </PhoneActionBar>
      )}
      <Dialog open={rejecting} onOpenChange={(open) => !open && !busy && setRejecting(false)}>
        <DialogContent showCloseButton={false} className="box-border flex flex-col gap-3 rounded-[4px] bg-card p-6 ring-0 sm:max-w-[440px]">
          <DialogTitle className="m-0 text-xl leading-[1.4] font-bold">
            <Trans>Reject ticket</Trans>
          </DialogTitle>
          <Field
            id={`${prefix}reason`}
            required
            label={<Trans>Reason for rejection</Trans>}
            error={reasonError}
            hint={
              reporter ? (
                <Trans>We will send the reason to {reporter} with a notification.</Trans>
              ) : (
                <Trans>We will send the reason to the reporter with a notification.</Trans>
              )
            }
          >
            <Textarea id={`${prefix}reason`} rows={3} dir="auto" maxLength={LIMITS.text} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setRejecting(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button type="button" variant="destructive-soft" disabled={busy} onClick={() => void reject()}>
              <Trans>Reject ticket</Trans>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}

/** Give an approved ticket to someone else, with a new due date. */
function ReassignPanel({
  ticket,
  place,
  people,
  onDone,
  onConflict,
}: {
  ticket: Ticket
  place: Place
  people: Person[]
  onDone: () => Promise<unknown>
  onConflict: (err: unknown) => Promise<boolean>
}) {
  const { accessToken } = useAuth()
  const others = people.filter((person) => person.id !== ticket.assignee_id)
  const [assignee, setAssignee] = useState("")
  const [due, setDue] = useState(ticket.due_date ?? "")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const chosen = assignee || others[0]?.id || ""

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!accessToken || !chosen || !due) return
    setBusy(true)
    setError("")
    try {
      await reassignTicket(accessToken, ticket.id, { assignee_id: chosen, due_date: due })
      const name = people.find((person) => person.id === chosen)?.name ?? ""
      toast(t`Ticket reassigned to ${name}.`)
      await onDone()
    } catch (err) {
      if (!(await onConflict(err))) setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel labelledBy="reassign-title" className="gap-4">
      <PanelTitle id="reassign-title">
        <Trans>Reassign</Trans>
      </PanelTitle>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field
          id="reassign-worker"
          required
          label={<Trans>Worker</Trans>}
          hint={others.length === 0 ? <Trans>No one else can take this ticket at this place.</Trans> : undefined}
        >
          <NativeSelect id="reassign-worker" value={chosen} onChange={setAssignee} disabled={others.length === 0}>
            {others.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="reassign-due" required label={<Trans>Due date</Trans>}>
          <Input id="reassign-due" type="date" dir="ltr" min={todayIn(place.timezone)} value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {error}
          </p>
        )}
        <Button type="submit" variant="outline" className="w-full" disabled={busy || !chosen || !due}>
          {busy ? <Trans>Saving…</Trans> : <Trans>Reassign</Trans>}
        </Button>
      </form>
    </Panel>
  )
}
