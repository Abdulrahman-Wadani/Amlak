import { useEffect, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"
import type { Asset } from "@amlak/shared"

import { useAuth } from "@/lib/auth"
import { createTicket, getPlaceAssets } from "@/lib/api"
import type { TicketPriority } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import Form, { type FormValues } from "@/components/form"
import { Page } from "@/components/page"

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
    <Page
      title={<Trans>Report damage</Trans>}
      description={<Trans>Report new damage for maintenance</Trans>}
      parent={{ label: <Trans>Place</Trans>, link: { to: "/place/$place_id", params: { place_id } } }}
      tabs={false}
    >
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
          <p role="alert" className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {formError}
          </p>
        )}
    </Page>
  )
}