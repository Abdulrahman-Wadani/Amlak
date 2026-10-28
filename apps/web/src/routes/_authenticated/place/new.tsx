import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState, type SubmitEvent } from "react"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { CircleAlert, MapPin } from "lucide-react"
import { cn } from "cn"
import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { createPlace, PlaceNameTakenError } from "@/lib/api"
import { placeInput } from "@/lib/validators"
import { TypeLabel } from "@/components/place-shared"
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
import { Textarea } from "@/components/ui/textarea"

export const Route = createFileRoute("/_authenticated/place/new")({
  component: AddPlace,
})

const TYPES = ["Chalet", "Rest house", "Apartment", "Villa"]

type FieldKey =
  | "place_name"
  | "place_type"
  | "city"
  | "monthly_maintenance_budget"

function validationMessage(key: FieldKey): string {
  switch (key) {
    case "place_name":
      return t`Enter a place name`
    case "place_type":
      return t`Choose a place type`
    case "city":
      return t`Enter a city`
    case "monthly_maintenance_budget":
      return t`Enter an amount`
  }
}

const FIELD_KEYS: FieldKey[] = [
  "place_name",
  "place_type",
  "city",
  "monthly_maintenance_budget",
]

const FIGURE_LABELS = [
  { key: "assets", label: <Trans>Assets</Trans> },
  { key: "tickets", label: <Trans>Open tickets</Trans> },
  { key: "workers", label: <Trans>Workers</Trans> },
]

function AddPlace() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [placeName, setPlaceName] = useState("")
  const [placeType, setPlaceType] = useState<string>("Chalet")
  const [description, setDescription] = useState("")
  const [city, setCity] = useState("")
  const [address, setAddress] = useState("")
  const [budget, setBudget] = useState("")
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [geoError, setGeoError] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)

  function useMyLocation() {
    setGeoError("")
    if (!("geolocation" in navigator)) {
      setGeoError(t`Could not get your location.`)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError(t`Could not get your location.`),
    )
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!accessToken) return
    const result = placeInput.safeParse({
      place_name: placeName,
      place_type: placeType,
      city,
      address: address.trim() || undefined,
      description: description.trim() || undefined,
      monthly_maintenance_budget: budget.trim() ? Number(budget) : undefined,
      latitude: coords?.lat,
      longitude: coords?.lng,
      currency: "SAR",
      timezone: "Asia/Riyadh",
    })
    if (!result.success) {
      const map: Partial<Record<FieldKey, string>> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]) as FieldKey
        if (FIELD_KEYS.includes(key) && !map[key]) map[key] = validationMessage(key)
      }
      setErrors(map)
      if (Object.keys(map).length === 0) setFormError(t`Could not save the place.`)
      return
    }
    setErrors({})
    setFormError("")
    setLoading(true)
    try {
      await createPlace(accessToken, result.data)
      void navigate({ to: "/places" })
    } catch (err) {
      if (err instanceof PlaceNameTakenError) {
        setErrors({ place_name: t`That place name is already taken.` })
      } else {
        setFormError(t`Could not save the place.`)
      }
    } finally {
      setLoading(false)
    }
  }

  const errorText = "flex items-center gap-1.5 text-[13px] leading-5 text-crit-900"

  return (
    <div
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px"
      )}
    >
      <h1 style={S("font-size: 30px; font-weight: 800; margin: 0")}>
        <Trans>Add place</Trans>
      </h1>

      <div style={S("display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start")}>
        <form
          onSubmit={handleSubmit}
          noValidate
          style={S(
            "flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 16px; background: #fff; border: 1px solid var(--border); padding: 24px; box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.1)"
          )}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="place-name" className="text-sm font-semibold">
              <Trans>Place name</Trans>
            </Label>
            <Input
              id="place-name"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              aria-invalid={Boolean(errors.place_name)}
            />
            {errors.place_name && (
              <p className={errorText}>
                <CircleAlert size={14} />
                {errors.place_name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="place-type" className="text-sm font-semibold">
              <Trans>Place type</Trans>
            </Label>
            <Select value={placeType} onValueChange={(v) => setPlaceType(String(v))}>
              <SelectTrigger
                id="place-type"
                style={S("width: 100%; height: 40px")}
              >
                <SelectValue>{(value: string | null) => <TypeLabel type={value ?? ""} />}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <TypeLabel type={type} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.place_type && (
              <p className={errorText}>
                <CircleAlert size={14} />
                {errors.place_type}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              <Trans>Description</Trans>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t`A three-bedroom chalet with a private pool.`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="city" className="text-sm font-semibold">
                <Trans>City</Trans>
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-invalid={Boolean(errors.city)}
              />
              {errors.city && (
                <p className={errorText}>
                  <CircleAlert size={14} />
                  {errors.city}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address" className="text-sm font-semibold">
                <Trans>Address</Trans>
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">
              <Trans>Location on the map</Trans>
            </span>
            <div
              style={S(
                "display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px dashed var(--border); background: var(--muted); padding: 14px 16px"
              )}
            >
              {coords ? (
                <span className="font-mono tabular-nums" style={S("font-size: 14px")}>
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
              ) : (
                <span style={S("color: var(--muted-foreground); font-size: 14px")}>
                  <Trans>Map to pick the location</Trans>
                </span>
              )}
              {coords ? (
                <button
                  type="button"
                  onClick={() => setCoords(null)}
                  style={S(
                    "background: none; border: 0; padding: 0; color: var(--muted-foreground); font-size: 13px; cursor: pointer; text-decoration: underline"
                  )}
                >
                  <Trans>Remove location</Trans>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={useMyLocation}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <MapPin
                    aria-hidden="true"
                    style={S("width: 16px; height: 16px; display: block; flex: none")}
                  />
                  <Trans>Use my current location</Trans>
                </button>
              )}
            </div>
            {geoError && (
              <p className={errorText}>
                <CircleAlert size={14} />
                {geoError}
              </p>
            )}
            <p style={S("color: var(--muted-foreground); font-size: 13px; margin: 0")}>
              <Trans>
                We ask for location only when you tap the button, and we never track
                workers.
              </Trans>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency" className="text-sm font-semibold">
                <Trans>Currency</Trans>
              </Label>
              <Input id="currency" value={t`Saudi riyal (SAR)`} disabled />
              <p style={S("color: var(--muted-foreground); font-size: 13px; margin: 0")}>
                <Trans>Set when the place is created and cannot change.</Trans>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="timezone" className="text-sm font-semibold">
                <Trans>Time zone</Trans>
              </Label>
              <Input id="timezone" value="Asia/Riyadh" disabled />
              <p style={S("color: var(--muted-foreground); font-size: 13px; margin: 0")}>
                <Trans>Set when the place is created and cannot change.</Trans>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="budget" className="text-sm font-semibold">
              <Trans>Monthly maintenance budget</Trans>
            </Label>
            <Input
              id="budget"
              inputMode="decimal"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              aria-invalid={Boolean(errors.monthly_maintenance_budget)}
            />
            {errors.monthly_maintenance_budget ? (
              <p className={errorText}>
                <CircleAlert size={14} />
                {errors.monthly_maintenance_budget}
              </p>
            ) : (
              <p style={S("color: var(--muted-foreground); font-size: 13px; margin: 0")}>
                <Trans>Optional. In Saudi riyals.</Trans>
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
            <Link
              to="/places"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Trans>Cancel</Trans>
            </Link>
            <Button type="submit" disabled={loading}>
              <Trans>Save place</Trans>
            </Button>
          </div>
        </form>

        <div
          style={S(
            "flex: 1 1 300px; min-width: 280px; display: flex; flex-direction: column; gap: 24px"
          )}
        >
          <section
            style={S(
              "display: flex; flex-direction: column; gap: 14px; background: #fff; border: 1px solid var(--border); padding: 20px"
            )}
          >
            <h2 style={S("font-size: 16px; font-weight: 700; margin: 0")}>
              <Trans>How it will look in your list</Trans>
            </h2>
            <div
              style={S(
                "display: flex; flex-direction: column; gap: 16px; border: 1px solid var(--border); padding: 16px"
              )}
            >
              <div style={S("display: flex; flex-direction: column; gap: 4px; min-width: 0")}>
                <span style={S("font-size: 18px; font-weight: 700")}>
                  {placeName.trim() || "\u2014"}
                </span>
                <span
                  style={S(
                    "display: flex; align-items: center; gap: 4px; color: var(--muted-foreground); font-size: 14px"
                  )}
                >
                  <MapPin
                    aria-hidden="true"
                    style={S("width: 16px; height: 16px; display: block; flex: none")}
                  />
                  <TypeLabel type={placeType} />, {city.trim() || "\u2014"}
                </span>
              </div>
              <div
                style={S(
                  "display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; border-top: 1px solid var(--border); padding-top: 12px"
                )}
              >
                {FIGURE_LABELS.map((f) => (
                  <div key={f.key} style={S("display: flex; flex-direction: column; line-height: 1.4")}>
                    <span style={S("font-size: 13px; color: var(--muted-foreground)")}>
                      {f.label}
                    </span>
                    <span className="font-mono tabular-nums" style={S("font-weight: 600")}>
                      0
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            style={S(
              "display: flex; flex-direction: column; gap: 12px; background: #fff; border: 1px solid var(--border); padding: 20px"
            )}
          >
            <h2 style={S("font-size: 16px; font-weight: 700; margin: 0")}>
              <Trans>Before saving</Trans>
            </h2>
            <ul
              style={S(
                "display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none"
              )}
            >
              <li style={S("font-size: 14px; line-height: 1.5; color: var(--muted-foreground)")}>
                <Trans>
                  Currency and time zone are set when the place is created and do not
                  change after.
                </Trans>
              </li>
              <li style={S("font-size: 14px; line-height: 1.5; color: var(--muted-foreground)")}>
                <Trans>You add assets and assign workers from the place page once it is saved.</Trans>
              </li>
              <li style={S("font-size: 14px; line-height: 1.5; color: var(--muted-foreground)")}>
                <Trans>The monthly budget is visible to you only; workers never see it.</Trans>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
