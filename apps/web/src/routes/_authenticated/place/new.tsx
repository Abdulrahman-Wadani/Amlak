import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { CircleAlert } from "lucide-react"
import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import type { CreatePlaceInput } from "@amlak/shared"
import { createPlace } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import Form, { type FormValues } from "@/components/form"
import LocationPicker, { type LocationData } from "@/components/location-picker"

export const Route = createFileRoute("/_authenticated/place/new")({
  component: AddPlace,
})

function AddPlace() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState("")
  const [location, setLocation] = useState<LocationData | null>(null)

  async function handleCreatePlace(values: FormValues) {
    if (!accessToken) return
    // Picking on the map also fills the latitude and longitude fields; they
    // can be typed by hand too. Coordinates are optional: without both, the
    // place is saved without them.
    const typed = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : undefined
    const latitude = location?.latitude ?? typed(values.latitude)
    const longitude = location?.longitude ?? typed(values.longitude)
    const text = (value: unknown) =>
      typeof value === "string" && value.trim() ? value.trim() : undefined

    const input: CreatePlaceInput = {
      place_name: text(values.place_name) ?? "",
      place_type: text(values.place_type) ?? "",
      city: location?.city || (text(values.city) ?? ""),
      address: location?.address || text(values.address),
      description: text(values.description),
      monthly_maintenance_budget: typed(values.monthly_maintenance_budget),
      ...(latitude !== undefined && longitude !== undefined
        ? { latitude, longitude }
        : {}),
    }

    setFormError("")
    try {
      await createPlace(accessToken, input)
      void navigate({ to: "/places" })
    } catch (err) {
      setFormError(errorMessage(err))
    }
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
          onSubmit={handleCreatePlace}
        />
        {formError && (
          <p role="alert" className={errorText} style={S("margin-top: 12px")}>
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {formError}
          </p>
        )}
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
