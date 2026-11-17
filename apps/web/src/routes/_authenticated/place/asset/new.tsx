import { useEffect, useState } from "react"
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
import Form from "@/components/form"


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
  const [status, setStatus] = useState<StatusKey>("GOOD")
  const [formError, setFormError] = useState("")
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

  // The form below sends (token, placeId, values).
  async function handleCreateAsset(
    token: string,
    place: string,
    values: Record<string, unknown>,
  ) {
    const result = assetInput.safeParse({
      name: values.name,
      type: values.type,
      status: values.status ?? status,
      purchase_date: values.purchase_date || undefined,
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
    if (!place) {
      map.place = validationMessage("place")
    }
    // Both are YYYY-MM-DD strings, which compare correctly as text.
    if (
      result.success &&
      result.data.purchase_date &&
      result.data.purchase_date > today
    ) {
      map.purchase_date = validationMessage("purchase_date")
    }
    if (!result.success || Object.keys(map).length > 0) {
      setFormError(
        Object.keys(map).length > 0
          ? Object.values(map).join(" ")
          : t`Could not save the asset.`,
      )
      return
    }
    setFormError("")
    try {
      await createAsset(token, place, result.data)
      void navigate({ to: "/place/$place_id", params: { place_id: place } })
    } catch {
      setFormError(t`Could not save the asset.`)
    }
  }

  const errorText =
    "flex items-center gap-1.5 text-[13px] leading-5 text-crit-900"

  return (
    <center>
    <div
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 640px"
      )}
    >
      <h1 style={S("font-size: 30px; font-weight: 800; margin: 0")}>
        <Trans>Add asset</Trans>
      </h1>
      <Form
        fields={[
          { name: "placeId", label: t`Place`, type: "select", defaultValue: placeId,hidden:true},
          { name: "name", label: t`Asset name`, type: "text" },
          { name: "type", label: t`Type`, type: "text" },
          { name: "status", label: t`Status`, type: "select", options: STATUSES.map((s) => ({ value: s, label: <StatusLabel status={s} /> })) },
          { name: "purchase_date", label: t`Purchase date`, type: "date" },
        ]}
        callable={handleCreateAsset}
        args={{token:accessToken, placeId:placeId}}
      />
      {formError && (
        <p role="alert" className={errorText}>
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {formError}
        </p>
      )}
    </div>
  </center>
  )
}
