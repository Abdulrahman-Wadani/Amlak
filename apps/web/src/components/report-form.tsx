import { useEffect, useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"
import type { Asset, Place } from "@amlak/shared"
import { todayIn } from "@/lib/dates"
import { useAuth } from "@/lib/auth"
import {
  createTicket,
  getPlaceAssets,
  getPlaces,
  getPlaceWorkers,
  type TicketPriority,
} from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { LIMITS, tooLarge, tooLong } from "@/lib/limits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RepairDayNotice, useRepairDay } from "@/components/repair-day"
import { FormCancel, FormPopup, useFormPopup } from "@/components/form-popup"
import {
  Field,
  FieldNeed,
  FieldRow,
  FormButtons,
  NativeSelect,
  Panel,
  PhoneActionBar,
  Segmented,
  TwoColumns,
} from "@/components/panel"
import { PhotoPicker } from "@/components/photo-picker"

type FieldKey = "place" | "description" | "photos" | "cost" | "due"

/**
 * Report damage, shown in a popup: the place (chosen here, or given by the
 * place page), the asset, photos, what happened and how urgent. The report
 * goes to the place manager for review. The place's manager also chooses
 * who does it and by when (the review's fields), and the ticket is approved
 * as it is added.
 */
export function ReportForm({ placeId: startPlace }: { placeId?: string }) {
  const { accessToken, user } = useAuth()
  const popup = useFormPopup()
  const search = { place_id: startPlace }

  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placeId, setPlaceId] = useState(search.place_id ?? "")
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetId, setAssetId] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [sending, setSending] = useState(false)
  // The review's fields, for the place's manager.
  const [people, setPeople] = useState<{ id: string; name: string }[]>([])
  const [assignee, setAssignee] = useState("")
  const [due, setDue] = useState("")
  const [cost, setCost] = useState("")

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((list) => {
        if (!alive) return
        setPlaces(list)
        // One place: nothing to choose.
        if (!search.place_id && list.length === 1) setPlaceId(list[0].id)
      })
      .catch(() => alive && setPlaces([]))
    return () => {
      alive = false
    }
  }, [accessToken, search.place_id])

  const place = places?.find((p) => p.id === placeId)
  const approves = Boolean(place && user && place.owner_id === user.id)
  const chosen = assignee || people[0]?.id || ""
  const repair = useRepairDay(accessToken, approves, placeId, due)

  useEffect(() => {
    setAssetId("")
    setAssets([])
    setAssignee("")
    setPeople([])
    if (!accessToken || !placeId) return
    let alive = true
    getPlaceAssets(accessToken, placeId)
      .then((list) => alive && setAssets(list))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [accessToken, placeId])

  // Who can take the ticket: the place's active workers, then the manager.
  useEffect(() => {
    if (!accessToken || !approves || !place) return
    let alive = true
    getPlaceWorkers(accessToken, place.id)
      .catch(() => [])
      .then((list) => {
        if (!alive) return
        setPeople([
          ...list.filter((item) => item.worker.status === "ACTIVE").map((item) => ({ id: item.worker.id, name: item.worker.fullname })),
          { id: place.owner_id, name: t`Me` },
        ])
      })
    return () => {
      alive = false
    }
  }, [accessToken, approves, place])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const next: Partial<Record<FieldKey, string>> = {}
    if (!placeId) next.place = t`Choose the place.`
    if (photos.length === 0) next.photos = t`Add at least one photo of the damage.`
    if (!description.trim()) next.description = t`Write what happened.`
    else next.description = tooLong(description, LIMITS.longText)
    if (approves) {
      if (!due) next.due = t`Choose the due date.`
      if (cost.trim() && !/^\d+(\.\d{1,2})?$/.test(cost.trim())) next.cost = t`Enter an amount of 0 or more, or leave it empty.`
      else next.cost = tooLarge(cost)
    }
    setErrors(next)
    if (Object.values(next).some(Boolean) || (approves && (!chosen || repair.staying))) return

    setSending(true)
    setFormError("")
    try {
      await createTicket(accessToken, placeId, {
        asset_id: assetId || undefined,
        priority,
        description: description.trim(),
        photos,
        ...(approves ? { assignee_id: chosen, due_date: due, estimated_cost: cost.trim() || undefined } : {}),
      })
      popup?.saved()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const send = (
    <Button type="submit" form="report-form" disabled={sending}>
      {sending ? <Trans>Sending…</Trans> : approves ? <Trans>Add and approve ticket</Trans> : <Trans>Send report</Trans>}
    </Button>
  )

  return (
    <TwoColumns
      main={
        <Panel pad="lg">
          <form
            id="report-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-5"
          >
            <Field
              id="r-place"
              required
              label={<Trans>Place</Trans>}
              error={errors.place}
            >
              <NativeSelect
                id="r-place"
                value={placeId}
                onChange={setPlaceId}
                invalid={Boolean(errors.place)}
              >
                <option value="" disabled>
                  {places === null ? t`Loading…` : t`Choose the place`}
                </option>
                {places?.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.place_name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field
              id="r-asset"
              optional
              label={<Trans>Asset</Trans>}
              hint={
                <Trans>
                  Choose “No specific asset” if the problem is general.
                </Trans>
              }
            >
              <NativeSelect
                id="r-asset"
                value={assetId}
                onChange={setAssetId}
                disabled={!placeId}
              >
                <option value="">{t`No specific asset`}</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">
                <Trans>Photos</Trans><FieldNeed required />
              </span>
              <PhotoPicker
                photos={photos}
                onChange={setPhotos}
                error={errors.photos}
                label={<Trans>Take a photo</Trans>}
                hint={<Trans>Add photos that show the damage.</Trans>}
              />
            </div>

            <Field
              id="r-desc"
              required
              label={<Trans>What happened?</Trans>}
              error={errors.description}
            >
              <Textarea
                id="r-desc"
                maxLength={LIMITS.longText}
                rows={3}
                dir="auto"
                value={description}
                aria-invalid={errors.description ? true : undefined}
                aria-describedby={
                  errors.description ? "r-desc-error" : undefined
                }
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">
                <Trans>Priority</Trans><FieldNeed required />
              </span>
              <Segmented
                label={t`Priority`}
                value={priority}
                onChange={setPriority}
                options={[
                  { key: "LOW", label: <Trans>Low</Trans> },
                  { key: "MEDIUM", label: <Trans>Medium</Trans> },
                  { key: "HIGH", label: <Trans>High</Trans> },
                  { key: "URGENT", label: <Trans>Urgent</Trans> },
                ]}
              />
            </div>

            {approves && (
              <>
                <FieldRow>
                  <Field id="r-assignee" required label={<Trans>Assign to</Trans>}>
                    <NativeSelect id="r-assignee" value={chosen} onChange={setAssignee}>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field id="r-due" required label={<Trans>Due date</Trans>} error={errors.due}>
                    <Input
                      id="r-due"
                      type="date"
                      dir="ltr"
                      min={place ? todayIn(place.timezone) : undefined}
                      value={due}
                      aria-invalid={errors.due ? true : undefined}
                      aria-describedby={errors.due ? "r-due-error" : undefined}
                      onChange={(e) => setDue(e.target.value)}
                    />
                  </Field>
                </FieldRow>
                <RepairDayNotice {...repair} />
                <Field id="r-cost" optional label={<Trans>Estimated cost</Trans>} hint={<Trans>In Saudi riyals.</Trans>} error={errors.cost}>
                  <Input
                    id="r-cost"
                    inputMode="decimal"
                    dir="ltr"
                    value={cost}
                    aria-invalid={errors.cost ? true : undefined}
                    aria-describedby={errors.cost ? "r-cost-error" : "r-cost-hint"}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </Field>
              </>
            )}

            {formError && (
              <p
                role="alert"
                className="m-0 flex items-center gap-1.5 text-[13px] text-destructive"
              >
                <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                {formError}
              </p>
            )}

            <div className="hidden desk:block">
              <FormButtons>
                <FormCancel to={{ to: "/tickets" }} />
                {send}
              </FormButtons>
            </div>
          </form>
          <PhoneActionBar>{send}</PhoneActionBar>
        </Panel>
      }
    />
  )
}

/** The Report damage popup; the page renders it while open and refreshes its list on save. */
export function ReportPopup({
  placeId,
  onClose,
  onSaved,
}: {
  placeId?: string
  onClose: () => void
  onSaved: () => void
}) {
  // A manager's ticket is approved as it is added.
  const manager = useAuth().user?.role === "MANAGER"
  return (
    <FormPopup title={manager ? <Trans>Add maintenance ticket</Trans> : <Trans>Report damage</Trans>} onClose={onClose} onSaved={onSaved}>
      <ReportForm placeId={placeId} />
    </FormPopup>
  )
}
