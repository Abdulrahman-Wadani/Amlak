import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"

import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { getPlace, getPlaceWorkers, createMaintenanceSchedule } from "@/lib/api"
import type { IntervalUnit } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import Form, { type FormValues } from "@/components/form"

export const Route = createFileRoute(
  "/_authenticated/place/asset/maintenance/new"
)({
  validateSearch: (search: Record<string, unknown>) => ({
    place_id: (search.place_id as string) || "",
    asset_id: (search.asset_id as string) || "",
  }),
  component: NewMaintenancePage,
})

// A function, not a constant: t must run after Lingui has a locale, so a
// direct load of this page does not crash.
function intervalUnits(): { value: IntervalUnit; label: string }[] {
  return [
    { value: "DAY", label: t`Day` },
    { value: "WEEK", label: t`Week` },
    { value: "MONTH", label: t`Month` },
    { value: "YEAR", label: t`Year` },
  ]
}

// Base UI's Select cannot hold an empty value, so "no default assignee" has
// its own value and is sent as undefined.
const NO_ASSIGNEE = "none"

function NewMaintenancePage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const { place_id, asset_id } = Route.useSearch()

  const [error, setError] = useState("")
  const [assigneeOptions, setAssigneeOptions] = useState<
    { value: string; label: string }[]
  >([])

  // A default assignee must be the place's owner or one of its ACTIVE workers.
  useEffect(() => {
    if (!accessToken || !place_id) return

    let alive = true

    Promise.all([
      getPlace(accessToken, place_id),
      getPlaceWorkers(accessToken, place_id),
    ])
      .then(([place, placeWorkers]) => {
        if (!alive) return

        setAssigneeOptions([
          { value: place.owner_id, label: t`You (owner)` },
          ...placeWorkers
            .filter((placeWorker) => placeWorker.worker.status === "ACTIVE")
            .map((placeWorker) => ({
              value: placeWorker.worker.id,
              label: placeWorker.worker.fullname,
            })),
        ])
      })
      .catch((err) => {
        console.warn("Could not load the place's workers:", err)
      })

    return () => {
      alive = false
    }
  }, [accessToken, place_id])

  const handleSubmit = async (values: FormValues) => {
    if (!accessToken) return
    const text = (name: string) =>
      typeof values[name] === "string" ? (values[name] as string).trim() : ""
    const count = values.interval_count
    const lead = values.lead_days
    const description = text("description")
    const nextDueDate = text("next_due_date")
    const assignee = text("default_assignee_id")

    if (!asset_id || !description || !nextDueDate) {
      setError(t`Please fill in all required fields`)
      return
    }
    if (
      typeof count !== "number" ||
      !Number.isInteger(count) ||
      count < 1 ||
      typeof lead !== "number" ||
      !Number.isInteger(lead) ||
      lead < 0
    ) {
      setError(t`Please enter valid interval and lead days values`)
      return
    }

    setError("")
    try {
      await createMaintenanceSchedule(accessToken, asset_id, {
        description,
        interval_count: count,
        interval_unit: (text("interval_unit") || "MONTH") as IntervalUnit,
        next_due_date: nextDueDate,
        lead_days: lead,
        default_assignee_id: assignee && assignee !== NO_ASSIGNEE ? assignee : undefined,
      })
      void navigate({ to: "/place/asset/$asset_id", params: { asset_id } })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <center>
    <div style={S("padding: 40px 48px 56px; width: 100%; box-sizing: border-box")}>
      <div style={S("margin-bottom: 28px")}>
        <h1 style={S("font-size: 28px; font-weight: 700; margin: 0 0 8px")}>
          <Trans>New Scheduled Maintenance</Trans>
        </h1>

        <p style={S("color: var(--muted-foreground); margin: 0")}>
          <Trans>Create a recurring maintenance schedule for an asset.</Trans>
        </p>
      </div>

      <Form
  fields={[
    {
      name: "description",
      label: t`Description`,
      type: "text",
      required: true,
    },
    {
      name: "interval_count",
      label: t`Repeat Every`,
      type: "number",
      required: true,
      defaultValue: "1",
    },
    {
      name: "interval_unit",
      label: t`Interval Unit`,
      type: "select",
      required: true,
      defaultValue: "MONTH",
      options: intervalUnits().map((unit) => ({
        value: unit.value,
        label: unit.label,
      })),
    },
    {
      name: "next_due_date",
      label: t`Next Due Date`,
      type: "date",
      required: true,
    },
    {
      name: "lead_days",
      label: t`Reminder Before Due Date (Days)`,
      type: "number",
      required: true,
      defaultValue: "7",
    },
    {
      name: "default_assignee_id",
      label: t`Default assignee (optional)`,
      type: "select",
      defaultValue: NO_ASSIGNEE,
      options: [
        { value: NO_ASSIGNEE, label: t`No default assignee` },
        ...assigneeOptions,
      ],
    },
  ]}
  onSubmit={handleSubmit}
/>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900" style={S("margin-top: 12px")}>
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
    </center>
  )
}