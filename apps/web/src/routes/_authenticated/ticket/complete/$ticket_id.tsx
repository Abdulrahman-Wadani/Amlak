import { useEffect, useState, type FormEvent } from "react"
import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"
import type { Place, Ticket } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { completeTicket, getPlace, getTicketById } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { LIMITS, tooLarge, tooLong } from "@/lib/limits"
import { useFormat } from "@/lib/format"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "cn"
import { Page } from "@/components/page"
import { Field, FormButtons, Panel, PhoneActionBar, TwoColumns } from "@/components/panel"
import { PhotoPicker, PhotoTiles } from "@/components/photo-picker"
import { LoadError } from "@/components/states"
import { TicketChip } from "@/components/ticket-parts"

export const Route = createFileRoute("/_authenticated/ticket/complete/$ticket_id")({
  component: CompleteTask,
})

type FieldKey = "photos" | "cost" | "notes"

/** Complete task: photos after the repair, what was fixed and what it cost. */
function CompleteTask() {
  const { ticket_id } = useParams({ from: "/_authenticated/ticket/complete/$ticket_id" })
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const { date, currencyName } = useFormat()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [failed, setFailed] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [notes, setNotes] = useState("")
  const [cost, setCost] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getTicketById(accessToken, ticket_id)
      .then(async (data) => {
        const found = data as Ticket
        if (!alive) return
        setTicket(found)
        const p = await getPlace(accessToken, found.place_id)
        if (alive) setPlace(p)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, ticket_id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const next: Partial<Record<FieldKey, string>> = {}
    if (photos.length === 0) next.photos = t`Add at least one photo of the finished work.`
    if (!/^\d+(\.\d{1,2})?$/.test(cost.trim())) next.cost = t`Enter the cost as a number, like 320 or 320.50.`
    else next.cost = tooLarge(cost)
    next.notes = tooLong(notes, LIMITS.longText)
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setSaving(true)
    setFormError("")
    try {
      await completeTicket(accessToken, ticket_id, {
        actual_cost: Number(cost.trim()),
        completion_notes: notes.trim() || undefined,
        photos,
      })
      await navigate({ to: "/ticket/$ticket_id", params: { ticket_id } })
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirm = (
    <Button type="submit" form="complete-form" disabled={saving || !ticket}>
      {saving ? <Trans>Saving…</Trans> : <Trans>Confirm completion</Trans>}
    </Button>
  )
  const damage = ticket?.attachments?.filter((a) => a.attachment_type === "DAMAGE").map((a) => a.file_url) ?? []
  const due = ticket?.due_date ? date(ticket.due_date, { day: "numeric", month: "long" }) : null

  return (
    <Page
      title={<Trans>Complete task</Trans>}
      parent={{ label: <Trans>My tasks</Trans>, link: { to: "/tickets" } }}
      phoneEnd="none"
      tabs={false}
    >
      {failed ? (
        <LoadError title={<Trans>Could not load this ticket</Trans>} onRetry={() => window.location.reload()} />
      ) : (
        <TwoColumns
          main={
            <Panel pad="lg">
              <form id="complete-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">
                    <Trans>Photos after repair</Trans>
                  </span>
                  <PhotoPicker
                    photos={photos}
                    onChange={setPhotos}
                    label={<Trans>Photo after repair</Trans>}
                    error={errors.photos}
                  />
                </div>
                <Field id="c-notes" label={<Trans>What did you fix?</Trans>} error={errors.notes}>
                  <Textarea id="c-notes" rows={3} dir="auto" maxLength={LIMITS.longText} aria-invalid={errors.notes ? true : undefined} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
                <Field
                  id="c-cost"
                  label={<Trans>What the repair cost</Trans>}
                  hint={place ? <Trans>In {currencyName(place.currency)}.</Trans> : undefined}
                  error={errors.cost}
                >
                  <Input
                    id="c-cost"
                    inputMode="decimal"
                    dir="ltr"
                    value={cost}
                    aria-invalid={errors.cost ? true : undefined}
                    aria-describedby={errors.cost ? "c-cost-error" : "c-cost-hint"}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </Field>
                {formError && (
                  <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                    <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                    {formError}
                  </p>
                )}
                <div className="hidden desk:block">
                  <FormButtons>
                    <Link to="/tickets" className={cn(buttonVariants({ variant: "outline" }))}>
                      <Trans>Cancel</Trans>
                    </Link>
                    {confirm}
                  </FormButtons>
                </div>
              </form>
              <PhoneActionBar>{confirm}</PhoneActionBar>
            </Panel>
          }
          side={
            ticket ? (
              <Panel className="desk:p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[13px] leading-[1.5] text-muted-foreground">
                    {place?.place_name}
                    {due && <>, {t`due ${due}`}</>}
                  </span>
                  <TicketChip ticket={ticket} />
                </div>
                <p dir="auto" className="m-0 text-[15px] leading-[1.8]">
                  {ticket.description}
                </p>
                <PhotoTiles urls={damage} columns={4} label={(n) => t`Damage photo ${n}`} />
              </Panel>
            ) : (
              <Skeleton className="h-48" />
            )
          }
        />
      )}
    </Page>
  )
}
