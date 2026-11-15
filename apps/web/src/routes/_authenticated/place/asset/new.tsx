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
        callable={createAsset}
        args={{token:accessToken, placeId:placeId}}
      />
    </div>
  </center>
  )
}
