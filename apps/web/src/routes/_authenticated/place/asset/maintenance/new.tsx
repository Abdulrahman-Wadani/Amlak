import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"

import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import {
  getPlaces,
  getPlaceAssets,
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

export const Route = createFileRoute(
  "/_authenticated/place/asset/maintenance/new"
)({
  validateSearch: (search: Record<string, unknown>) => ({
    place_id: (search.place_id as string) || "",
    asset_id: (search.asset_id as string) || "",
  }),
  component: NewMaintenancePage,
})

const INTERVAL_UNITS: { value: IntervalUnit; label: string }[] = [
  { value: "DAY", label: t`Day` },
  { value: "WEEK", label: t`Week` },
  { value: "MONTH", label: t`Month` },
  { value: "YEAR", label: t`Year` },
]

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!validate() || !accessToken) return

    try {
      setLoading(true)

      await createMaintenanceSchedule(accessToken, selectedAsset, {
        description: description.trim(),
        interval_count: Number(intervalCount),
        interval_unit: intervalUnit,
        next_due_date: nextDueDate,
        lead_days: Number(leadDays),
        ...(defaultAssigneeId.trim()
          ? { default_assignee_id: defaultAssigneeId.trim() }
          : {}),
      })

      navigate({
        to: "/place/asset/$asset_id",
        params: { asset_id: selectedAsset },
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t`Failed to create maintenance schedule`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S("padding: 40px 48px 56px; width: 100%; box-sizing: border-box")}>
      <div style={S("margin-bottom: 28px")}>
        <h1 style={S("font-size: 28px; font-weight: 700; margin: 0 0 8px")}>
          <Trans>New Scheduled Maintenance</Trans>
        </h1>

        <p style={S("color: var(--muted-foreground); margin: 0")}>
          <Trans>Create a recurring maintenance schedule for an asset.</Trans>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={S(
          "width: 100%; min-width: 0; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 22px; box-sizing: border-box"
        )}
      >
        {error && (
          <div
            style={S(
              "display: flex; align-items: center; gap: 8px; padding: 12px; border-radius: 8px; background: var(--destructive-background); color: var(--destructive); font-size: 14px"
            )}
          >
            <CircleAlert size={18} />
            {error}
          </div>
        )}

        <div style={S("display: flex; flex-direction: column; gap: 8px")}>
          <Label>
            <Trans>Place</Trans>
          </Label>

          <Select
            value={selectedPlace}
            onValueChange={(value) => {
              setSelectedPlace(value)
              setSelectedAsset("")
              setErrors((prev) => ({ ...prev, place_id: "" }))
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t`Select a place`} />
            </SelectTrigger>

            <SelectContent>
              {places.map((place) => (
                <SelectItem key={place.id} value={place.id}>
                  {place.place_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {errors.place_id && (
            <p style={S("color: var(--destructive); font-size: 13px; margin: 0")}>
              {errors.place_id}
            </p>
          )}
        </div>

        <div style={S("display: flex; flex-direction: column; gap: 8px")}>
          <Label>
            <Trans>Asset</Trans>
          </Label>

          <Select
            value={selectedAsset}
            onValueChange={(value) => {
              setSelectedAsset(value)
              setErrors((prev) => ({ ...prev, asset_id: "" }))
            }}
            disabled={!selectedPlace || assets.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={t`Select an asset`} />
            </SelectTrigger>

            <SelectContent>
              {assets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {errors.asset_id && (
            <p style={S("color: var(--destructive); font-size: 13px; margin: 0")}>
              {errors.asset_id}
            </p>
          )}
        </div>

        <div style={S("display: flex; flex-direction: column; gap: 8px")}>
          <Label>
            <Trans>Description</Trans>
          </Label>

          <Textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              setErrors((prev) => ({ ...prev, description: "" }))
            }}
            placeholder={t`Enter maintenance description`}
            rows={4}
          />

          {errors.description && (
            <p style={S("color: var(--destructive); font-size: 13px; margin: 0")}>
              {errors.description}
            </p>
          )}
        </div>

        <div
          style={S(
            "display: flex; gap: 16px; flex-wrap: wrap"
          )}
        >
          <div style={S("flex: 1 1 180px; display: flex; flex-direction: column; gap: 8px")}>
            <Label>
              <Trans>Repeat Every</Trans>
            </Label>

            <Input
              type="number"
              min="1"
              value={intervalCount}
              onChange={(event) => {
                setIntervalCount(event.target.value)
                setErrors((prev) => ({ ...prev, interval_count: "" }))
              }}
            />

            {errors.interval_count && (
              <p style={S("color: var(--destructive); font-size: 13px; margin: 0")}>
                {errors.interval_count}
              </p>
            )}
          </div>

          <div style={S("flex: 1 1 180px; display: flex; flex-direction: column; gap: 8px")}>
            <Label>
              <Trans>Interval Unit</Trans>
            </Label>

            <Select
              value={intervalUnit}
              onValueChange={(value) => setIntervalUnit(value as IntervalUnit)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {INTERVAL_UNITS.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div style={S("display: flex; flex-direction: column; gap: 8px")}>
          <Label>
            <Trans>Next Due Date</Trans>
          </Label>

          <Input
            type="date"
            value={nextDueDate}
            onChange={(event) => {
              setNextDueDate(event.target.value)
              setErrors((prev) => ({ ...prev, next_due_date: "" }))
            }}
          />

          {errors.next_due_date && (
            <p style={S("color: var(--destructive); font-size: 13px; margin: 0")}>
              {errors.next_due_date}
            </p>
          )}
        </div>

        <div style={S("display: flex; flex-direction: column; gap: 8px")}>
          <Label>
            <Trans>Reminder Before Due Date (Days)</Trans>
          </Label>

          <Input
            type="number"
            min="0"
            value={leadDays}
            onChange={(event) => {
              setLeadDays(event.target.value)
              setErrors((prev) => ({ ...prev, lead_days: "" }))
            }}
          />

          {errors.lead_days && (
            <p style={S("color: var(--destructive); font-size: 13px; margin: 0")}>
              {errors.lead_days}
            </p>
          )}
        </div>

        <div style={S("display: flex; flex-direction: column; gap: 8px")}>
          <Label>
            <Trans>Default Assignee ID</Trans>
          </Label>

          <Input
            value={defaultAssigneeId}
            onChange={(event) => setDefaultAssigneeId(event.target.value)}
            placeholder={t`Optional`}
          />
        </div>

        <div
          style={S(
            "display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; border-top: 1px solid var(--border)"
          )}
        >
          <Button type="button" variant="outline" asChild>
            <Link to="/places">
              <Trans>Cancel</Trans>
            </Link>
          </Button>

          <Button type="submit" disabled={loading}>
            {loading ? <Trans>Creating...</Trans> : <Trans>Create Schedule</Trans>}
          </Button>
        </div>
      </form>
    </div>
  )
}