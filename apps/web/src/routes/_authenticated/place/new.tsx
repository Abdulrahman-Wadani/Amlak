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
import Form from "@/components/form"
import LocationPicker from "@/components/location-picker"

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
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<LocationData | null>(null)

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

  async function handleCreatePlace(
  token: string,
  values: Record<string, unknown>,
) {
  if (!location) {
    throw new Error("Please select a location")
  }

  await createPlace(token, {
    ...values,
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address || values.address,
    city: location.city || values.city,
  })
}

function handleLocationSelect(location: LocationData) {
  setLocation(location)

  const fields = {
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address,
    city: location.city,
  }

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.querySelector<HTMLInputElement>(
      `input[name="${name}"]`,
    )

    if (!input) return

    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set

    nativeSetter?.call(input, String(value ?? ""))

    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

  const errorText = "flex items-center gap-1.5 text-[13px] leading-5 text-crit-900"

  return (
  <div
    style={S(
      "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; width: 100%; box-sizing: border-box"
    )}
  >
    <h1 style={S("font-size: 30px; font-weight: 800; margin: 0")}>
      <Trans>Add place</Trans>
    </h1>

    <div
      style={S(
        "width: 100%; max-width: 1500px; margin: 0 auto; display: flex; flex-direction: row; align-items: flex-start; gap: 28px"
      )}
    >
      {/* Form */}
      <div
        style={S("flex: 1 1 35%; min-width: 0")}
      >
        <Form
          fields={[
            { name: "place_name", label: t`Place name`, type: "text" },
            {
              name: "place_type",
              label: t`Place type`,
              type: "text",
            },
            { name: "description", label: t`Description`, type: "text" },
            { name: "city", label: t`City`, type: "text" },
            { name: "address", label: t`Address`, type: "text" },
            { name: "latitude", label: t`Latitude`, type: "number" },
            { name: "longitude", label: t`Longitude`, type: "number" },
            {
              name: "monthly_maintenance_budget",
              label: t`Monthly maintenance budget`,
              type: "number",
            },
          ]}
          callable={handleCreatePlace}
          args={{ token: accessToken }}
        />
      </div>

      {/* Map */}
      <div
        style={S(
          "flex: 1 1 65%; min-width: 0; position: sticky; top: 24px"
        )}
      >
        <LocationPicker onLocationSelect={handleLocationSelect} />
      </div>
    </div>
  </div>
)
}
