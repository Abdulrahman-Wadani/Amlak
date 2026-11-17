import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"

import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import {
  getPlace,
  getPlaces,
  getPlaceAssets,
  getPlaceWorkers,
  createMaintenanceSchedule,
} from "@/lib/api"

import type { IntervalUnit } from "@/lib/api"
import type { Place, Asset } from "@amlak/shared"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Form from "@/components/form"

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

  const [places, setPlaces] = useState<Place[]>([])
  const [assets, setAssets] = useState<Asset[]>([])

  const [selectedPlace, setSelectedPlace] = useState(place_id)
  const [selectedAsset, setSelectedAsset] = useState(asset_id)

  const [description, setDescription] = useState("")
  const [intervalCount, setIntervalCount] = useState("1")
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>("MONTH")
  const [nextDueDate, setNextDueDate] = useState("")
  const [leadDays, setLeadDays] = useState("7")
  const [defaultAssigneeId, setDefaultAssigneeId] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
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

  useEffect(() => {
    if (!accessToken) return

    const loadPlaces = async () => {
      try {
        const data = await getPlaces(accessToken)
        setPlaces(data)

        if (place_id) {
          setSelectedPlace(place_id)
        } else if (data.length > 0) {
          setSelectedPlace(data[0].id)
        }
      } catch {
        setError(t`Failed to load places`)
      }
    }

    loadPlaces()
  }, [accessToken, place_id])

  useEffect(() => {
    if (!accessToken || !selectedPlace) {
      setAssets([])
      setSelectedAsset("")
      return
    }

    const loadAssets = async () => {
      try {
        const data = await getPlaceAssets(accessToken, selectedPlace)
        setAssets(data)

        if (asset_id && data.some((asset) => asset.id === asset_id)) {
          setSelectedAsset(asset_id)
        } else if (data.length > 0) {
          setSelectedAsset(data[0].id)
        } else {
          setSelectedAsset("")
        }
      } catch {
        setError(t`Failed to load assets`)
      }
    }

    loadAssets()
  }, [accessToken, selectedPlace, asset_id])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!selectedPlace) {
      newErrors.place_id = t`Please select a place`
    }

    if (!selectedAsset) {
      newErrors.asset_id = t`Please select an asset`
    }

    if (!description.trim()) {
      newErrors.description = t`Description is required`
    }

    const count = Number(intervalCount)

    if (!intervalCount || !Number.isInteger(count) || count < 1) {
      newErrors.interval_count = t`Enter a valid interval`
    }

    const lead = Number(leadDays)

    if (!leadDays || !Number.isInteger(lead) || lead < 0) {
      newErrors.lead_days = t`Enter a valid number of days`
    }

    if (!nextDueDate) {
      newErrors.next_due_date = t`Next due date is required`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (
  _args: Record<string, unknown>,
  values: Record<string, string>,
) => {
  if (!accessToken) {
    setError(t`You must be logged in`)
    return
  }

  const {
    asset_id,
    description,
    interval_count,
    interval_unit,
    next_due_date,
    lead_days,
    default_assignee_id,
  } = values

  if (!asset_id || !description.trim() || !next_due_date) {
    setError(t`Please fill in all required fields`)
    return
  }

  const count = Number(interval_count)
  const lead = Number(lead_days)

  if (
    !Number.isInteger(count) ||
    count < 1 ||
    !Number.isInteger(lead) ||
    lead < 0
  ) {
    setError(t`Please enter valid interval and lead days values`)
    return
  }

  try {
    setLoading(true)
    setError("")

    await createMaintenanceSchedule(accessToken, asset_id, {
      description: description.trim(),
      interval_count: count,
      interval_unit: interval_unit as IntervalUnit,
      next_due_date,
      lead_days: lead,
      default_assignee_id:
        default_assignee_id && default_assignee_id !== NO_ASSIGNEE
          ? default_assignee_id
          : undefined,
    })

    navigate({
      to: "/place/asset/$asset_id",
      params: { asset_id },
    })
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : t`Failed to create maintenance schedule`,
    )
  } finally {
    setLoading(false)
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
      name: "asset_id",
      label: t`Asset`,
      type: "select",
      required: true,
      defaultValue: asset_id,
      hidden: true
    },
    {
      name: "place_id",
      label: t`Asset`,
      type: "select",
      required: true,
      defaultValue: place_id,
      hidden: true
    },
    {
      name: "description",
      label: t`description`,
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
  args={{ accessToken }}
  callable={handleSubmit}
/>
    </div>
    </center>
  )
}