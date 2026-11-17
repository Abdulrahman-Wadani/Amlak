import { useEffect, useState } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"
import type { Asset } from "@amlak/shared"

import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { createTicket, getPlaceAssets } from "@/lib/api"
import type { TicketPriority } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Form, { type FormValues } from "@/components/form"

export const Route = createFileRoute("/_authenticated/ticket/new")({
  component: AddTicket,
  validateSearch: (search: Record<string, unknown>) => ({
    place_id: typeof search.place_id === "string" ? search.place_id : "",
  }),
})

function AddTicket() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const { place_id } = Route.useSearch()

  const [assets, setAssets] = useState<Asset[]>([])
  const [formError, setFormError] = useState("")

  useEffect(() => {
    if (!accessToken || !place_id) return

    let alive = true

    getPlaceAssets(accessToken, place_id)
      .then((list) => {
        if (alive) setAssets(list)
      })
      .catch((error) => {
        console.error("Failed to load assets:", error)
        if (alive) setAssets([])
      })

    return () => {
      alive = false
    }
  }, [accessToken, place_id])

  async function handleSubmit(values: FormValues) {
    if (!accessToken) return
    const text = (name: string) =>
      typeof values[name] === "string" ? (values[name] as string).trim() : ""
    const photos = Array.isArray(values.photos) ? values.photos : []

    if (!place_id) {
      setFormError(t`Choose the place first`)
      return
    }
    if (photos.length > 5) {
      setFormError(t`You can add up to 5 photos`)
      return
    }

    setFormError("")
    try {
      await createTicket(accessToken, place_id, {
        asset_id: text("assetId") || undefined,
        priority: (text("priority") || undefined) as TicketPriority | undefined,
        description: text("description") || undefined,
        photos,
      })

      void navigate({ to: "/place/$place_id", params: { place_id } })
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  return (
    <div
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 720px; width: 100%",
      )}
    >
<Breadcrumb>
  <BreadcrumbList>
  <BreadcrumbItem>
      <BreadcrumbLink render={<a href="/" />}><Trans>Home</Trans></BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink render={<a href="/places" />}><Trans>Places</Trans></BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
            <BreadcrumbLink
        render={
          <Link
            to="/place/$place_id"
            params={{ place_id: place_id }}
          >
            <Trans>Place</Trans>
          </Link>
        }
      />
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
<center>
      <div style={S("display:flex; flex-direction:column; gap:6px")}>
        <h1 style={S("font-size:30px; font-weight:800; margin:0")}>
          <Trans>Report damage</Trans>
        </h1>

        <p style={S("font-size:14px; color:var(--muted-foreground); margin:0")}>
          <Trans>Report new damage for maintenance</Trans>
        </p>
      </div>
        <Form
  fields={[
    {
      name: "assetId",
      label: t`Asset`,
      type: "select",
      options: assets.map((asset) => ({
        value: asset.id,
        label: asset.name,
      })),
    },
    {
      name: "priority",
      label: t`Priority`,
      type: "select",
      required: true,
      defaultValue: "MEDIUM",
      options: [
        { value: "LOW", label: t`Low` },
        { value: "MEDIUM", label: t`Medium` },
        { value: "HIGH", label: t`High` },
        { value: "URGENT", label: t`Urgent` },
      ],
    },
    {
      name: "description",
      label: t`Description`,
      type: "text",
      required: true,
    },
    {
      name: "photos",
      label: t`Photos of the damage`,
      type: "file",
      accept: "image/*",
      multiple: true,
    },
  ]}
  onSubmit={handleSubmit}
/>
        {formError && (
          <p role="alert" className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900" style={S("margin-top: 12px")}>
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {formError}
          </p>
        )}

  </center>

    </div>
  )
}