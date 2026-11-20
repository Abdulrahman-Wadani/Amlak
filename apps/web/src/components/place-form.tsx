import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert, MapPin } from "lucide-react"
import type { CreatePlaceInput, Place, PlaceStatus } from "@amlak/shared"
import { createPlace, updatePlace } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { LIMITS, tooLarge, tooLong } from "@/lib/limits"
import { useFormat } from "@/lib/format"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "cn"
import LocationPicker, { type LocationData } from "@/components/location-picker"
import { LocationPermission } from "@/components/location-permission"
import { Notice } from "@/components/states"
import {
  Field,
  FieldNeed,
  FieldRow,
  FormButtons,
  NativeSelect,
  Panel,
  TwoColumns,
} from "@/components/panel"

// Stored as written here; TypeLabel translates them.
const PLACE_TYPES = ["Chalet", "Rest house", "Apartment", "Villa", "Room"] as const

function typeLabel(type: string): string {
  switch (type) {
    case "Chalet":
      return t`Chalet`
    case "Rest house":
      return t`Rest house`
    case "Apartment":
      return t`Apartment`
    case "Villa":
      return t`Villa`
    case "Room":
      return t`Room`
    default:
      return type
  }
}

function statusLabel(status: PlaceStatus): string {
  switch (status) {
    case "ACTIVE":
      return t`Active`
    case "UNDER_MAINTENANCE":
      return t`Under maintenance`
    case "INACTIVE":
      return t`Inactive`
  }
}

type Errors = Partial<Record<"name" | "type" | "city" | "address" | "description" | "budget", string>>

/**
 * Add place and Edit place. Places use Saudi riyals and Saudi time, the only
 * choices for now, so the form asks for neither.
 */
export function PlaceForm({ token, place }: { token: string; place?: Place }) {
  const navigate = useNavigate()
  const { lang } = useFormat()
  const editing = place !== undefined

  const [name, setName] = useState(place?.place_name ?? "")
  const [type, setType] = useState(place?.place_type ?? "")
  const [description, setDescription] = useState(place?.description ?? "")
  const [city, setCity] = useState(place?.city ?? "")
  const [address, setAddress] = useState(place?.address ?? "")
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    place?.latitude != null && place.longitude != null ? { latitude: place.latitude, longitude: place.longitude } : null,
  )
  const [budget, setBudget] = useState(place?.monthly_maintenance_budget?.toString() ?? "")
  const [status, setStatus] = useState<PlaceStatus>(place?.status ?? "ACTIVE")

  const [asking, setAsking] = useState(false)
  const [focus, setFocus] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState("")
  const [blocked, setBlocked] = useState(false)

  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)


  const types: string[] = PLACE_TYPES.includes(type as (typeof PLACE_TYPES)[number]) || !type ? [...PLACE_TYPES] : [type, ...PLACE_TYPES]

  function handleLocation(location: LocationData) {
    setCoords({ latitude: location.latitude, longitude: location.longitude })
    if (location.address) setAddress(location.address)
    if (location.city) setCity(location.city)
  }

  function locate() {
    setAsking(false)
    setLocateError("")
    setBlocked(false)
    if (!("geolocation" in navigator)) {
      setLocateError(t`This browser cannot share your location. Pick the place on the map.`)
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        const point = { latitude: position.coords.latitude, longitude: position.coords.longitude }
        setCoords(point)
        setFocus(point)
      },
      (failure) => {
        setLocating(false)
        if (failure.code === failure.PERMISSION_DENIED) setBlocked(true)
        else setLocateError(t`We could not get your location. Pick the place on the map.`)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Errors = {}
    if (!name.trim()) next.name = t`Enter the place name.`
    else next.name = tooLong(name, LIMITS.name)
    if (!type) next.type = t`Choose the place type.`
    if (!city.trim()) next.city = t`Enter the city.`
    else next.city = tooLong(city, LIMITS.short)
    next.address = tooLong(address, LIMITS.address)
    next.description = tooLong(description, LIMITS.text)
    const amount = budget.trim() === "" ? null : Number(budget.trim())
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      next.budget = t`Enter an amount of 0 or more, or leave it empty.`
    } else next.budget = tooLarge(amount)
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    const fields = {
      place_name: name.trim(),
      place_type: type,
      city: city.trim(),
      address: address.trim() || null,
      description: description.trim() || null,
      monthly_maintenance_budget: amount,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    }

    setSaving(true)
    setFormError("")
    try {
      if (place) {
        await updatePlace(token, place.id, { ...fields, status })
        await navigate({ to: "/place/$place_id", params: { place_id: place.id } })
      } else {
        const input: CreatePlaceInput = fields
        const created = await createPlace(token, input)
        await navigate({ to: "/place/$place_id", params: { place_id: created.id } })
      }
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <TwoColumns
      main={
        <Panel pad="lg">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Field id="pname" required label={<Trans>Place name</Trans>} error={errors.name}>
              <Input
                id="pname"
                maxLength={LIMITS.name}
                value={name}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "pname-error" : undefined}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field id="ptype" required label={<Trans>Place type</Trans>} error={errors.type}>
              <NativeSelect id="ptype" value={type} onChange={setType} invalid={Boolean(errors.type)}>
                <option value="" disabled>
                  {t`Choose the place type`}
                </option>
                {types.map((value) => (
                  <option key={value} value={value}>
                    {typeLabel(value)}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field id="pdesc" optional label={<Trans>Description</Trans>} error={errors.description}>
              <Textarea
                id="pdesc"
                rows={3}
                maxLength={LIMITS.text}
                value={description}
                aria-invalid={errors.description ? true : undefined}
                aria-describedby={errors.description ? "pdesc-error" : undefined}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <FieldRow>
              <Field id="pcity" required label={<Trans>City</Trans>} error={errors.city}>
                <Input
                  id="pcity"
                  maxLength={LIMITS.short}
                  value={city}
                  aria-invalid={errors.city ? true : undefined}
                  aria-describedby={errors.city ? "pcity-error" : undefined}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Field>
              <Field id="paddr" optional label={<Trans>Address</Trans>} error={errors.address}>
                <Input
                  id="paddr"
                  maxLength={LIMITS.address}
                  value={address}
                  aria-invalid={errors.address ? true : undefined}
                  aria-describedby={errors.address ? "paddr-error" : undefined}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
            </FieldRow>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">
                <Trans>Location on the map</Trans><FieldNeed optional />
              </span>
              <LocationPicker
                onLocationSelect={handleLocation}
                initialLocation={coords ?? undefined}
                focus={focus}
              />
              <div className="flex">
                <Button type="button" variant="outline" disabled={locating} onClick={() => setAsking(true)}>
                  <MapPin aria-hidden="true" />
                  {locating ? <Trans>Finding your location…</Trans> : <Trans>Use my current location</Trans>}
                </Button>
              </div>
              {blocked && (
                <div className="flex flex-col gap-2">
                  <Notice tone="warn" icon={<MapPin />} title={<Trans>The location is blocked in the browser.</Trans>} />
                  <ol className="m-0 flex flex-col gap-1.5 ps-5 text-sm">
                    <li>
                      <Trans>Tap the lock icon next to the site address.</Trans>
                    </li>
                    <li>
                      <Trans>Choose “Location”, then “Allow”.</Trans>
                    </li>
                    <li>
                      <Trans>Reload the page.</Trans>
                    </li>
                  </ol>
                </div>
              )}
              {locateError ? (
                <span role="alert" className="text-[13px] text-destructive">
                  {locateError}
                </span>
              ) : (
                <span className="text-[13px] text-muted-foreground">
                  <Trans>We ask for location only when you tap the button, and we never track workers.</Trans>
                </span>
              )}
            </div>

            <Field
              id="pbudget"
              optional
              label={<Trans>Monthly maintenance budget</Trans>}
              hint={<Trans>In Saudi riyals.</Trans>}
              error={errors.budget}
            >
              <Input
                id="pbudget"
                inputMode="decimal"
                dir="ltr"
                className={lang === "ar" ? "text-end" : undefined}
                value={budget}
                aria-invalid={errors.budget ? true : undefined}
                aria-describedby={errors.budget ? "pbudget-error" : "pbudget-hint"}
                onChange={(e) => setBudget(e.target.value)}
              />
            </Field>

            {editing && (
              <Field id="pstatus" required label={<Trans>Status</Trans>}>
                <NativeSelect id="pstatus" value={status} onChange={(value) => setStatus(value as PlaceStatus)}>
                  {(["ACTIVE", "UNDER_MAINTENANCE", "INACTIVE"] as const).map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}

            {formError && (
              <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                {formError}
              </p>
            )}

            <FormButtons>
              {place ? (
                <Link to="/place/$place_id" params={{ place_id: place.id }} className={cn(buttonVariants({ variant: "outline" }))}>
                  <Trans>Cancel</Trans>
                </Link>
              ) : (
                <Link to="/places" className={cn(buttonVariants({ variant: "outline" }))}>
                  <Trans>Cancel</Trans>
                </Link>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? <Trans>Saving…</Trans> : <Trans>Save place</Trans>}
              </Button>
            </FormButtons>
          </form>

          <LocationPermission open={asking} onAllow={locate} onClose={() => setAsking(false)} />
        </Panel>
      }
      side={null}
    />
  )
}
