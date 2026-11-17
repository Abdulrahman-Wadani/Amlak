import { useEffect, useState, type SubmitEvent } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert, X } from "lucide-react"
import type { Place, Asset } from "@amlak/shared"

import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { createTicket, getPlaces, getPlaceAssets } from "@/lib/api"
import type { TicketPriority } from "@/lib/api"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Form from "@/components/form"


import { cn } from "cn"

export const Route = createFileRoute("/_authenticated/ticket/new")({
  component: AddTicket,
  validateSearch: (search: Record<string, unknown>) => ({
    place_id: typeof search.place_id === "string" ? search.place_id : "",
  }),
})

const PRIORITIES: TicketPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]

function AddTicket() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const { place_id } = Route.useSearch()

const [places, setPlaces] = useState<Place[]>([])
const [assets, setAssets] = useState<Asset[]>([])

  const [placeId, setPlaceId] = useState(place_id)
  const [assetId, setAssetId] = useState("")
  const [priority, setPriority] = useState<TicketPriority | "">("")
  const [description, setDescription] = useState("")
  const [photos, setPhotos] = useState<File[]>([])

  const [loading, setLoading] = useState(false)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [formError, setFormError] = useState("")
  const [photoError, setPhotoError] = useState("")

  const errorText =
    "flex items-center gap-1.5 text-[13px] leading-5 text-crit-900"

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    getPlaces(accessToken)
      .then((list) => {
        if (alive) setPlaces(list)
      })
      .catch(() => {
        if (alive) setPlaces([])
      })

    return () => {
      alive = false
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !placeId) {
      setAssets([])
      setAssetId("")
      return
    }

    let alive = true

    setLoadingAssets(true)
    setAssets([])
    setAssetId("")

    getPlaceAssets(accessToken, placeId)
      .then((list) => {
        if (alive) setAssets(list)
      })
      .catch((error) => {
        console.error("Failed to load assets:", error)
        if (alive) setAssets([])
      })
      .finally(() => {
        if (alive) setLoadingAssets(false)
      })

    return () => {
      alive = false
    }
  }, [accessToken, placeId])

  function handlePhotosChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selected = Array.from(e.target.files ?? [])

    if (selected.length > 5) {
      setPhotoError(t`You can add up to 5 photos`)
      setPhotos([])
      e.target.value = ""
      return
    }

    setPhotoError("")
    setPhotos(selected)
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index))
  }

  async function handleSubmit(
  token: string,
  values: Record<string, string | File[]>
) {
  const selectedPlaceId = values.placeId as string
  const selectedAssetId = values.assetId as string
  const selectedPriority = values.priority as TicketPriority
  const selectedDescription = values.description as string
  const selectedPhotos = (values.photos as File[]) || []

  if (!token) return

  setFormError("")
  setPhotoError("")

  if (!selectedPlaceId) {
    setFormError(t`Choose the place first`)
    return
  }

  if (selectedPhotos.length > 5) {
    setPhotoError(t`You can add up to 5 photos`)
    return
  }

  setLoading(true)

  try {
    await createTicket(token, selectedPlaceId, {
      asset_id: selectedAssetId || undefined,
      priority: selectedPriority || undefined,
      description: selectedDescription.trim() || undefined,
      photos: selectedPhotos,
    })

    void navigate({
      to: "/place/$place_id",
      params: { place_id: selectedPlaceId },
    })
  } catch (error) {
    console.error("Failed to create ticket:", error)

    setFormError(
      error instanceof Error
        ? error.message
        : t`Could not create the maintenance ticket`,
    )
  } finally {
    setLoading(false)
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
            {place_id}
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
      name: "placeId",
      label: t`Place`,
      type: "select",
      required: true,
      defaultValue: place_id,
      hidden:true,
    },
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
  args={{ accessToken }}
  callable={handleSubmit}
/>

  </center>

    </div>
  )
}