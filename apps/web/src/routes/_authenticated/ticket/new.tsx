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

const priorityLabels: Record<TicketPriority, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "عاجلة",
}

function AddTicket() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const { place_id } = Route.useSearch()

  const [places, setPlaces] = useState<Place[] | null>(null)
  const [assets, setAssets] = useState<Asset[] | null>(null)

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
    setAssets(null)
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
      setPhotoError("يمكنك إضافة 5 صور كحد أقصى")
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

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!accessToken) return

    setFormError("")
    setPhotoError("")

    if (!placeId) {
      setFormError("اختر العقار أولاً")
      return
    }

    if (photos.length > 5) {
      setPhotoError("يمكنك إضافة 5 صور كحد أقصى")
      return
    }

    setLoading(true)

    try {
      await createTicket(accessToken, placeId, {
        asset_id: assetId || undefined,
        priority: priority || undefined,
        description: description.trim() || undefined,
        photos,
      })

      void navigate({
        to: "/place/$place_id",
        params: { place_id: placeId },
      })
    } catch (error) {
      console.error("Failed to create ticket:", error)

      setFormError(
        error instanceof Error
          ? error.message
          : "تعذر إنشاء تذكرة الصيانة",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      dir="rtl"
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 720px; width: 100%",
      )}
    >
<Breadcrumb>
  <BreadcrumbList>
  <BreadcrumbItem>
      <BreadcrumbLink render={<a href="/" />}>الرئيسية</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink render={<a href="/places" />}>العقارات</BreadcrumbLink>
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

      <div style={S("display:flex; flex-direction:column; gap:6px")}>
        <h1 style={S("font-size:30px; font-weight:800; margin:0")}>
          <Trans>رفع تذكرة صيانة</Trans>
        </h1>

        <p style={S("font-size:14px; color:var(--muted-foreground); margin:0")}>
          تسجيل بلاغ صيانة جديد
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        style={S(
          "display:flex; flex-direction:column; gap:20px; background:var(--card); border:1px solid var(--border); padding:24px; box-shadow:2px 2px 0 rgba(27,36,48,0.1)",
        )}
      >
        {/* Place */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="place" className="text-sm font-semibold">
            <Trans>Place</Trans>
          </Label>

          <Select
            value={placeId}
            onValueChange={(value) => setPlaceId(String(value))}
          >
            <SelectTrigger id="place" style={S("width:100%; height:40px")}>
              <SelectValue placeholder="اختر العقار">
                {(value: string | null) =>
                  places?.find((p) => p.id === value)?.place_name ??
                  "اختر العقار"
                }
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {(places ?? []).map((place) => (
                <SelectItem key={place.id} value={place.id}>
                  {place.place_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Asset */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="asset" className="text-sm font-semibold">
            الأصل المرتبط بالتذكرة
          </Label>

          <Select
            value={assetId}
            onValueChange={(value) => setAssetId(String(value))}
            disabled={!placeId || loadingAssets || !assets?.length}
          >
            <SelectTrigger id="asset" style={S("width:100%; height:40px")}>
              <SelectValue placeholder="اختر الأصل (اختياري)">
                {(value: string | null) =>
                  assets?.find((asset) => asset.id === value)?.name ??
                  "اختر الأصل (اختياري)"
                }
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {(assets ?? []).map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loadingAssets && (
            <p className="text-xs text-muted-foreground">
              جاري تحميل الأصول...
            </p>
          )}

          {placeId && !loadingAssets && assets?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              لا توجد أصول مسجلة لهذا العقار
            </p>
          )}
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="priority" className="text-sm font-semibold">
            الأولوية
          </Label>

          <Select
            value={priority}
            onValueChange={(value) =>
              setPriority(value as TicketPriority)
            }
          >
            <SelectTrigger id="priority" style={S("width:100%; height:40px")}>
              <SelectValue placeholder="اختر الأولوية (اختياري)">
                {(value: string | null) =>
                  value
                    ? priorityLabels[value as TicketPriority]
                    : "اختر الأولوية (اختياري)"
                }
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {PRIORITIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {priorityLabels[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="description" className="text-sm font-semibold">
            وصف المشكلة
          </Label>

          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="اشرح المشكلة أو العطل..."
            rows={5}
            className="resize-y"
          />
        </div>

        {/* Photos */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="photos" className="text-sm font-semibold">
            صور الضرر
          </Label>

          <Input
            id="photos"
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotosChange}
          />

          <p className="text-xs text-muted-foreground">
            يمكنك إرفاق حتى 5 صور.
          </p>

          {photoError && (
            <p className={errorText}>
              <CircleAlert size={14} />
              {photoError}
            </p>
          )}

          {photos.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {photos.map((photo, index) => (
                <div
                  key={`${photo.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-md border p-2"
                >
                  <span className="text-sm truncate">
                    {photo.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove photo"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {formError && (
          <p className={errorText}>
            <CircleAlert size={14} />
            {formError}
          </p>
        )}

        <div style={S("display:flex; gap:10px; padding-top:4px")}>
          <Link
            to={placeId ? "/place/$place_id" : "/places"}
            params={placeId ? { place_id: placeId } : undefined}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Trans>Cancel</Trans>
          </Link>

          <Button type="submit" disabled={loading || !placeId}>
            {loading ? "جاري الإرسال..." : "إنشاء التذكرة"}
          </Button>
        </div>
      </form>
    </div>
  )
}