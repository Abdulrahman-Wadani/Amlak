import { useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { completeTicket } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { LIMITS, tooLarge, tooLong } from "@/lib/limits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormCancel, FormPopup, useFormPopup } from "@/components/form-popup"
import { Field, FieldNeed, FormButtons } from "@/components/panel"
import { PhotoPicker } from "@/components/photo-picker"

type FieldKey = "photos" | "cost" | "notes"

/** Complete task: photos after the repair (at least one), what was fixed and what it cost. */
function CompleteForm({ ticketId }: { ticketId: string }) {
  const { accessToken } = useAuth()
  const popup = useFormPopup()
  const [photos, setPhotos] = useState<File[]>([])
  const [notes, setNotes] = useState("")
  const [cost, setCost] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)

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
      await completeTicket(accessToken, ticketId, {
        actual_cost: Number(cost.trim()),
        completion_notes: notes.trim() || undefined,
        photos,
      })
      popup?.saved()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form id="complete-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">
          <Trans>Photos after repair</Trans>
          <FieldNeed required />
        </span>
        <PhotoPicker photos={photos} onChange={setPhotos} label={<Trans>Photo after repair</Trans>} error={errors.photos} />
      </div>
      <Field id="c-notes" optional label={<Trans>What did you fix?</Trans>} error={errors.notes}>
        <Textarea
          id="c-notes"
          rows={3}
          dir="auto"
          maxLength={LIMITS.longText}
          aria-invalid={errors.notes ? true : undefined}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <Field id="c-cost" required label={<Trans>What the repair cost</Trans>} hint={<Trans>In Saudi riyals.</Trans>} error={errors.cost}>
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
      <FormButtons>
        <FormCancel to={{ to: "/tickets" }} />
        <Button type="submit" disabled={saving}>
          {saving ? <Trans>Saving…</Trans> : <Trans>Confirm completion</Trans>}
        </Button>
      </FormButtons>
    </form>
  )
}

/** The Complete task popup; the page renders it while open and reloads the ticket on save. */
export function CompletePopup({ ticketId, onClose, onSaved }: { ticketId: string; onClose: () => void; onSaved: () => void }) {
  return (
    <FormPopup title={<Trans>Complete task</Trans>} onClose={onClose} onSaved={onSaved}>
      <CompleteForm ticketId={ticketId} />
    </FormPopup>
  )
}
