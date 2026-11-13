import { useEffect, useState, type SubmitEvent } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { CircleAlert } from "lucide-react"
import { cn } from "cn"
import type { Place } from "@amlak/shared"
import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { createAsset, getPlaces } from "@/lib/api"
import { assetInput } from "@/lib/validators"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute("/_authenticated/place/asset/new")({
  component: AddAsset,
  validateSearch: (search: Record<string, unknown>) => ({
    place_id: typeof search.place_id === "string" ? search.place_id : "",
  }),
})

const STATUSES = [
  "GOOD",
  "NEEDS_MAINTENANCE",
  "UNDER_MAINTENANCE",
  "OUT_OF_SERVICE",
] as const

type StatusKey = (typeof STATUSES)[number]
type FieldKey = "name" | "type" | "purchase_date" | "place"

function validationMessage(key: FieldKey): string {
  switch (key) {
    case "name":
      return t`Enter an asset name`
    case "type":
      return t`Enter a type`
    case "purchase_date":
      return t`The purchase date cannot be in the future.`
    case "place":
      return t`Choose a place`
  }
}

function StatusLabel({ status }: { status: string }) {
  switch (status) {
    case "GOOD":
      return <Trans>Good</Trans>
    case "NEEDS_MAINTENANCE":
      return <Trans>Needs maintenance</Trans>
    case "UNDER_MAINTENANCE":
      return <Trans>Under maintenance</Trans>
    default:
      return <Trans>Out of service</Trans>
  }
}

function AddAsset() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const { place_id } = Route.useSearch()
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placeId, setPlaceId] = useState(place_id)
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [status, setStatus] = useState<StatusKey>("GOOD")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((list) => alive && setPlaces(list))
      .catch(() => alive && setPlaces([]))
    return () => {
      alive = false
    }
  }, [accessToken])

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!accessToken) return
    const result = assetInput.safeParse({
      name,
      type,
      status,
      purchase_date: purchaseDate || undefined,
    })
    const map: Partial<Record<FieldKey, string>> = {}
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]) as FieldKey
        if (["name", "type", "purchase_date"].includes(key) && !map[key]) {
          map[key] = validationMessage(key)
        }
      }
    }
    if (!placeId) {
      map.place = validationMessage("place")
    }
    if (
      result.success &&
      result.data.purchase_date &&
      result.data.purchase_date > new Date()
    ) {
      map.purchase_date = validationMessage("purchase_date")
    }
    if (!result.success || Object.keys(map).length > 0) {
      setErrors(map)
      setFormError(
        Object.keys(map).length > 0 ? "" : t`Could not save the asset.`,
      )
      return
    }
    setErrors({})
    setFormError("")
    setLoading(true)
    try {
      await createAsset(accessToken, placeId, result.data)
      void navigate({ to: "/place/$place_id", params: { place_id: placeId } })
    } catch {
      setFormError(t`Could not save the asset.`)
    } finally {
      setLoading(false)
    }
  }

  const errorText =
    "flex items-center gap-1.5 text-[13px] leading-5 text-crit-900"

  return (
    <div
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 640px"
      )}
    >
      <h1 style={S("font-size: 30px; font-weight: 800; margin: 0")}>
        <Trans>Add asset</Trans>
      </h1>

      <form
        onSubmit={handleSubmit}
        noValidate
        style={S(
          "display: flex; flex-direction: column; gap: 16px; background: #fff; border: 1px solid var(--border); padding: 24px; box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.1)"
        )}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="place" className="text-sm font-semibold">
            <Trans>Place</Trans>
          </Label>
          <Select
            value={placeId}
            onValueChange={(v) => setPlaceId(String(v))}
          >
            <SelectTrigger id="place" style={S("width: 100%; height: 40px")}>
              <SelectValue placeholder={<Trans>Choose a place</Trans>}>
                {(value: string | null) =>
                  places?.find((p) => p.id === value)?.place_name ??
                  value ?? (
                    <Trans>Choose a place</Trans>
                  )
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(places ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.place_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.place && (
            <p className={errorText}>
              <CircleAlert size={14} />
              {errors.place}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="asset-name" className="text-sm font-semibold">
            <Trans>Asset name</Trans>
          </Label>
          <Input
            id="asset-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && (
            <p className={errorText}>
              <CircleAlert size={14} />
              {errors.name}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="asset-type" className="text-sm font-semibold">
              <Trans>Type</Trans>
            </Label>
            <Input
              id="asset-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-invalid={Boolean(errors.type)}
            />
            {errors.type && (
              <p className={errorText}>
                <CircleAlert size={14} />
                {errors.type}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="asset-status" className="text-sm font-semibold">
              <Trans>Status</Trans>
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(String(v) as StatusKey)}
            >
              <SelectTrigger
                id="asset-status"
                style={S("width: 100%; height: 40px")}
              >
                <SelectValue>
                  {(value: string | null) => <StatusLabel status={value ?? ""} />}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <StatusLabel status={s} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="purchase-date" className="text-sm font-semibold">
            <Trans>Purchase date</Trans>
          </Label>
          <Input
            id="purchase-date"
            type="date"
            max={today}
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            aria-invalid={Boolean(errors.purchase_date)}
          />
          {errors.purchase_date && (
            <p className={errorText}>
              <CircleAlert size={14} />
              {errors.purchase_date}
            </p>
          )}
        </div>

        {formError && (
          <p className={errorText}>
            <CircleAlert size={14} />
            {formError}
          </p>
        )}

        <div style={S("display: flex; gap: 10px; padding-top: 4px")}>
          {placeId ? (
            <Link
              to="/place/$place_id"
              params={{ place_id: placeId }}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Trans>Cancel</Trans>
            </Link>
          ) : (
            <Link
              to="/places"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Trans>Cancel</Trans>
            </Link>
          )}
          <Button type="submit" disabled={loading}>
            <Trans>Save asset</Trans>
          </Button>
        </div>
      </form>
    </div>
  )
}
