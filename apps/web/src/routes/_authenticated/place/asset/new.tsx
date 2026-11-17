import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { CircleAlert } from "lucide-react"
import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { createAsset } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { assetInput } from "@/lib/validators"
import Form, { type FormValues } from "@/components/form"

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
  const [formError, setFormError] = useState("")
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  async function handleCreateAsset(values: FormValues) {
    if (!accessToken) return
    const place = place_id
    const result = assetInput.safeParse({
      name: values.name,
      type: values.type,
      status: values.status ?? "GOOD",
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
      await createAsset(accessToken, place, result.data)
      void navigate({ to: "/place/$place_id", params: { place_id: place } })
    } catch (err) {
      setFormError(errorMessage(err))
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
          { name: "name", label: t`Asset name`, type: "text" },
          { name: "type", label: t`Type`, type: "text" },
          { name: "status", label: t`Status`, type: "select", defaultValue: "GOOD", options: STATUSES.map((s) => ({ value: s, label: <StatusLabel status={s} /> })) },
          { name: "purchase_date", label: t`Purchase date`, type: "date" },
        ]}
        onSubmit={handleCreateAsset}
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
