import { useEffect, useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { plural, t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"
import type { Place, Schedule } from "@amlak/shared"
import {
  createMaintenanceSchedule,
  getPlaceWorkers,
  getScheduledMaintenancesForAsset,
  handleCancelSchedule,
  type IntervalUnit,
} from "@/lib/api"
import { todayIn } from "@/lib/dates"
import { errorMessage } from "@/lib/errors"
import { useFormat } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, FieldRow, FormButtons, NativeSelect, Panel, PanelTitle } from "@/components/panel"

function repeats(schedule: Schedule): string {
  const count = schedule.interval_count
  switch (schedule.interval_unit) {
    case "DAY":
      return plural(count, { one: "Every day", other: "Every # days" })
    case "WEEK":
      return plural(count, { one: "Every week", other: "Every # weeks" })
    case "MONTH":
      return plural(count, { one: "Every month", other: "Every # months" })
    case "YEAR":
      return plural(count, { one: "Every year", other: "Every # years" })
  }
}

function unitLabel(unit: IntervalUnit): string {
  switch (unit) {
    case "DAY":
      return t`Days`
    case "WEEK":
      return t`Weeks`
    case "MONTH":
      return t`Months`
    case "YEAR":
      return t`Years`
  }
}

type Person = { id: string; name: string }

/**
 * An asset's periodic maintenance: the schedules with Deactivate, and the
 * form to add one (Managers only).
 */
export function AssetSchedules({
  token,
  assetId,
  place,
  canManage,
}: {
  token: string
  assetId: string
  place: Place | null
  canManage: boolean
}) {
  const { date } = useFormat()
  const [schedules, setSchedules] = useState<Schedule[] | null>(null)
  const [version, setVersion] = useState(0)
  const [people, setPeople] = useState<Person[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    getScheduledMaintenancesForAsset(token, assetId)
      .then((list) => alive && setSchedules(list))
      .catch(() => alive && setSchedules([]))
    return () => {
      alive = false
    }
  }, [token, assetId, version])

  // Who can get the generated tickets: the place's ACTIVE workers, or its owner.
  useEffect(() => {
    if (!canManage || !place) return
    let alive = true
    getPlaceWorkers(token, place.id)
      .then((list) => {
        if (!alive) return
        setPeople([
          ...list
            .filter((item) => item.worker.status === "ACTIVE")
            .map((item) => ({ id: item.worker.id, name: item.worker.fullname })),
          { id: place.owner_id, name: t`Me` },
        ])
      })
      .catch(() => alive && setPeople([{ id: place.owner_id, name: t`Me` }]))
    return () => {
      alive = false
    }
  }, [token, place, canManage])

  async function deactivate(id: string) {
    setBusy(id)
    setError("")
    try {
      await handleCancelSchedule(token, id)
      setVersion((v) => v + 1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const nameOf = (id: string | null) => (id ? people.find((person) => person.id === id)?.name : undefined)

  return (
    <>
      <Panel labelledBy="schedules-title">
        <PanelTitle id="schedules-title">
          <Trans>Periodic maintenance</Trans>
        </PanelTitle>
        {error && (
          <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {error}
          </p>
        )}
        {schedules === null ? (
          <Skeleton className="h-24" />
        ) : schedules.length === 0 ? (
          <p className="m-0 border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Trans>This asset has no scheduled maintenance.</Trans>
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {schedules.map((schedule) => {
              const who = nameOf(schedule.default_assignee_id)
              const due = date(schedule.next_due_date, { day: "numeric", month: "long" })
              return (
                <div
                  key={schedule.id}
                  className="box-border flex min-w-0 flex-wrap items-center justify-between gap-3 border border-border bg-card p-3.5"
                >
                  <div className="flex min-w-0 flex-col leading-[1.6]">
                    <span className="font-semibold [overflow-wrap:anywhere]">{schedule.description}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {who ? t`${repeats(schedule)}, assigned to: ${who}` : repeats(schedule)}
                    </span>
                    <span className="text-[13px]">
                      <Trans>
                        Next due: <strong className="font-semibold">{due}</strong>
                      </Trans>
                    </span>
                  </div>
                  {canManage && (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={busy !== null}
                      aria-label={t`Deactivate ${schedule.description}`}
                      onClick={() => void deactivate(schedule.id)}
                    >
                      {busy === schedule.id ? <Trans>Deactivating…</Trans> : <Trans>Deactivate</Trans>}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {canManage && place && (
        <ScheduleForm
          token={token}
          assetId={assetId}
          today={todayIn(place.timezone)}
          people={people}
          onAdded={() => setVersion((v) => v + 1)}
        />
      )}
    </>
  )
}

type FieldKey = "description" | "count" | "due" | "lead"

function ScheduleForm({
  token,
  assetId,
  today,
  people,
  onAdded,
}: {
  token: string
  assetId: string
  today: string
  people: Person[]
  onAdded: () => void
}) {
  const [description, setDescription] = useState("")
  const [count, setCount] = useState("1")
  const [unit, setUnit] = useState<IntervalUnit>("MONTH")
  const [due, setDue] = useState("")
  const [lead, setLead] = useState("7")
  const [assignee, setAssignee] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)

  // The first person (a worker, or "Me" when the place has none) until one is chosen.
  const chosen = assignee || people[0]?.id || ""

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Partial<Record<FieldKey, string>> = {}
    const every = Number(count)
    const before = Number(lead)
    if (!description.trim()) next.description = t`Enter a description.`
    if (!Number.isInteger(every) || every < 1 || every > 365) next.count = t`Enter a whole number from 1 to 365.`
    if (!due) next.due = t`Choose the first due date.`
    if (!Number.isInteger(before) || before < 0 || before > 60) next.lead = t`Enter a whole number from 0 to 60.`
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    setFormError("")
    try {
      await createMaintenanceSchedule(token, assetId, {
        description: description.trim(),
        interval_count: every,
        interval_unit: unit,
        next_due_date: due,
        lead_days: before,
        default_assignee_id: chosen || undefined,
      })
      setDescription("")
      setDue("")
      onAdded()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const invalid = (key: FieldKey) =>
    errors[key] ? { "aria-invalid": true as const, "aria-describedby": `s-${key}-error` } : {}

  return (
    <Panel labelledBy="add-schedule" className="gap-4">
      <PanelTitle id="add-schedule">
        <Trans>Add a schedule</Trans>
      </PanelTitle>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field id="s-description" label={<Trans>Description</Trans>} error={errors.description}>
          <Input
            id="s-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            {...invalid("description")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="s-count" label={<Trans>Every</Trans>} error={errors.count}>
            <Input
              id="s-count"
              inputMode="numeric"
              dir="ltr"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              {...invalid("count")}
            />
          </Field>
          <Field id="s-unit" label={<Trans>Unit</Trans>}>
            <NativeSelect id="s-unit" value={unit} onChange={(value) => setUnit(value as IntervalUnit)}>
              {(["DAY", "WEEK", "MONTH", "YEAR"] as const).map((value) => (
                <option key={value} value={value}>
                  {unitLabel(value)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <FieldRow>
          <Field id="s-due" label={<Trans>First due date</Trans>} error={errors.due}>
            <Input
              id="s-due"
              type="date"
              dir="ltr"
              min={today}
              value={due}
              onChange={(e) => setDue(e.target.value)}
              {...invalid("due")}
            />
          </Field>
          <Field
            id="s-lead"
            label={<Trans>Create the ticket this many days before</Trans>}
            hint={<Trans>In days.</Trans>}
            error={errors.lead}
          >
            <Input
              id="s-lead"
              inputMode="numeric"
              dir="ltr"
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              {...invalid("lead")}
            />
          </Field>
        </FieldRow>
        <Field id="s-worker" label={<Trans>Default worker</Trans>}>
          <NativeSelect id="s-worker" value={chosen} onChange={setAssignee}>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {formError && (
          <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {formError}
          </p>
        )}
        <FormButtons>
          <Button type="submit" disabled={saving}>
            {saving ? <Trans>Saving…</Trans> : <Trans>Add schedule</Trans>}
          </Button>
        </FormButtons>
      </form>
    </Panel>
  )
}
