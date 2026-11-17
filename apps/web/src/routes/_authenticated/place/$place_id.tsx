
import { useEffect, useState } from "react"
import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import type { Asset, Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/http"
import {
  getPlace,
  getPlaceAssets,
  getWorkers,
  updatePlace,
} from "@/lib/api"
import { S } from "@/lib/dom-style"
import { buttonVariants, Button } from "@/components/ui/button"
import { cn } from "cn"
import {
  Building2,
  CalendarDays,
  MapPin,
  Plus,
  Wallet,
  Clock3,
  Pencil,
  Save,
  X,
  Trash2,
  Users,
  Wrench,
  AlertTriangle,
} from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PlaceBookings } from "@/components/place-bookings"
import { TicketsSection } from "@/components/tickets-section"
import {
  AssetStatusBadge,
  StatusBadge,
  TypeLabel,
} from "@/components/place-shared"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export const Route = createFileRoute("/_authenticated/place/$place_id")({
  component: PlaceDetailPage,
})

type PlaceUpdateInput = Parameters<typeof updatePlace>[2]
type Worker = Awaited<ReturnType<typeof getWorkers>>[number]

function isWorkerAssignedToPlace(worker: Worker, placeId: string) {
  const assignments = worker.assigned_places as
    | Array<string | { place_id?: string; id?: string }>
    | undefined

  return (
    assignments?.some((assignment) =>
      typeof assignment === "string"
        ? assignment === placeId
        : assignment.place_id === placeId || assignment.id === placeId
    ) ?? false
  )
}

function PlaceDetailPage() {
  const { place_id } = useParams({
    from: "/_authenticated/place/$place_id",
  })

  const { i18n } = useLingui()
  const { accessToken, user } = useAuth()
  // Editing, deleting and the assets and workers sections are for Managers.
  const isManager = user?.role === "MANAGER"
  const navigate = useNavigate()

  const [place, setPlace] = useState<Place | null>(null)
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [workers, setWorkers] = useState<Worker[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [activeSection, setActiveSection] = useState<"assets" | "workers" | "tickets" | "bookings" | null>(null)


  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [selectedWorkerId, setSelectedWorkerId] = useState("")
  const [addingWorker, setAddingWorker] = useState(false)
  const [workerError, setWorkerError] = useState("")
  const [workerSuccess, setWorkerSuccess] = useState("")

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<PlaceUpdateInput | null>(null)
  const [updateError, setUpdateError] = useState("")

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    getPlace(accessToken, place_id)
      .then((p) => alive && setPlace(p))
      .catch(() => alive && setFailed(true))

    getPlaceAssets(accessToken, place_id)
      .then((list) => alive && setAssets(list))
      .catch(() => alive && setAssets([]))

    // GET /workers is Manager-only; Workers do not see the workers section.
    if (isManager) {
      getWorkers(accessToken)
        .then((list) => alive && setWorkers(list))
        .catch((error) => {
          console.error("Failed to load workers:", error)
          if (alive) setWorkers([])
        })
    }


    return () => {
      alive = false
    }
  }, [accessToken, place_id, isManager])

  const money = new Intl.NumberFormat(
    i18n.locale === "ar" ? "ar" : "en"
  )

  const day = new Intl.DateTimeFormat(
    i18n.locale === "ar" ? "ar" : "en",
    { dateStyle: "medium" }
  )

function formatTicketDate(value: string | null | undefined) {
  if (!value) return "—"

  return day.format(
    new Date(value.length === 10 ? `${value}T00:00:00` : value)
  )
}

function getAssetForTicket(assetId: string | null) {
  if (!assetId || !assets) return null

  return assets.find((asset) => asset.id === assetId) ?? null
}
function getWorkerName(userId: string | null | undefined) {
  if (!userId || !workers) return "—"

  return workers.find((worker) => worker.id === userId)?.fullname ?? "—"
}


  function openEditForm() {
    if (!place) return

    setEditForm({
      place_name: place.place_name,
      place_type: place.place_type,
      city: place.city,
      address: place.address,
      description: place.description,
      monthly_maintenance_budget: place.monthly_maintenance_budget,
      latitude: place.latitude,
      longitude: place.longitude,
      currency: place.currency,
      timezone: place.timezone,
      status: place.status,
    })

    setUpdateError("")
    setEditing(true)
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!accessToken || !editForm) return

    try {
      setSaving(true)
      setUpdateError("")

      const updatedPlace = await updatePlace(
        accessToken,
        place_id,
        editForm
      )

      setPlace(updatedPlace)
      setEditing(false)
    } catch (error) {
      setUpdateError(
        error instanceof Error
          ? error.message
          : t`Could not update the place.`
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!accessToken || !place || deleting) return

    const confirmed = window.confirm(
      t`Delete the place "${place.place_name}"? This cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setDeleting(true)
      setDeleteError("")

      const response = await authFetch(`/places/${place_id}`, accessToken, {
        method: "DELETE",
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.message ?? `Delete failed (${response.status})`)
      }

      await navigate({ to: "/places" })
    } catch (error) {
      console.error("Delete place error:", error)
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete property",
      )
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddWorker(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!accessToken || !selectedWorkerId || addingWorker) return

    try {
      setAddingWorker(true)
      setWorkerError("")
      setWorkerSuccess("")

      const response = await authFetch(`/places/${place_id}/workers`, accessToken, {
        method: "POST",
        body: JSON.stringify({ worker_id: selectedWorkerId }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.message ?? `Assign failed (${response.status})`)
      }

      const refreshedWorkers = await getWorkers(accessToken)
      setWorkers(refreshedWorkers)
      setSelectedWorkerId("")
      setWorkerSuccess(t`The worker was added to the place.`)
    } catch (error) {
      console.error("Assign worker error:", error)
      setWorkerError(
        error instanceof Error ? error.message : "Failed to assign worker",
      )
    } finally {
      setAddingWorker(false)
    }
  }

  return (
    <center>
    <div
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 80%"
      )}
    >
      <div
        style={S(
          "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px"
        )}
      >
        <div
          style={S(
            "display: flex; flex-direction: column; gap: 6px; min-width: 0"
          )}
        >
          <div
            style={S(
              "display: flex; align-items: center; gap: 8px; color: var(--muted-foreground); font-size: 13px"
            )}
          >
            <Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink render={<a href="/" />}><Trans>Home</Trans></BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink render={<a href="/places" />}>
        <Trans>Places</Trans>
      </BreadcrumbLink>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>

          </div>

          <h1
            style={S(
              "font-size: 28px; font-weight: 800; margin: 0; line-height: 1.3"
            )}
          >
            {place?.place_name ??
              (failed ? (
                <Trans>Place not found</Trans>
              ) : (
                <Skeleton style={S("width: 220px; height: 28px")} />
              ))}
          </h1>
        </div>

        <div
          style={S(
            "display: flex; align-items: center; gap: 8px; flex-wrap: wrap"
          )}
        >
          {place && isManager && (
            <button
              type="button"
              id="update"
              onClick={openEditForm}
              className="am-btn"
              style={S(
                "height: 40px; padding: 0 16px; display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); background: var(--card)"
              )}
            >
              <Pencil size={16} />
              <Trans>Update place</Trans>
            </button>
          )}

          {place && isManager && (
            <button
              type="button"
              onClick={handleDelete}
              id="remove"
              disabled={deleting || saving}
              className="am-btn"
              style={S(
                "height: 40px; padding: 0 16px; display: flex; align-items: center; gap: 8px; border: 1px solid var(--destructive); color: var(--destructive); background: var(--card); opacity: deleting ? .6 : 1"
              )}
            >
              <Trash2 size={16} />
              {deleting ? t`Deleting…` : t`Delete place`}
            </button>
          )}

        </div>
      </div>

      {failed && (
        <Card style={S("padding: 18px; border: 1px solid var(--border)")}>
          <p
            style={S(
              "color: var(--muted-foreground); margin: 0; font-size: 14px"
            )}
          >
            <Trans>We could not load this property.</Trans>
          </p>
        </Card>
      )}

      {deleteError && (
        <p style={S("color: var(--destructive); font-size: 13px; margin: 0")}>
          {deleteError}
        </p>
      )}

      {!failed && (
        <>
          {editing && editForm && (
            <Card
              style={S(
                "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0"
              )}
            >
              <CardHeader
                style={S(
                  "padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: row; justify-content: space-between; align-items: center"
                )}
              >
                <CardTitle
                  style={S("font-size: 17px; font-weight: 750")}
                >
                  <Trans>Update property</Trans>
                </CardTitle>

                <button
                  type="button"
                  id="update"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  style={S(
                    "display: flex; align-items: center; justify-content: center; padding: 6px; border: 1px solid var(--border); background: var(--card)"
                  )}
                >
                  <X size={18} />
                </button>
              </CardHeader>

              <CardContent style={S("padding: 20px")}>
                <form
                  onSubmit={handleUpdate}
                  style={S(
                    "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px"
                  )}
                >
                  <EditField
                    label={t`Place name`}
                    value={editForm.place_name}
                    onChange={(value) =>
                      setEditForm({ ...editForm, place_name: value })
                    }
                  />

                  <EditField
                    label={t`Place type`}
                    value={editForm.place_type}
                    onChange={(value) =>
                      setEditForm({ ...editForm, place_type: value })
                    }
                  />

                  <EditField
                    label={t`City`}
                    value={editForm.city}
                    onChange={(value) =>
                      setEditForm({ ...editForm, city: value })
                    }
                  />

                  <EditField
                    label={t`Address`}
                    value={editForm.address ?? ""}
                    onChange={(value) =>
                      setEditForm({
                        ...editForm,
                        address: value || null,
                      })
                    }
                  />

                  <EditField
                    label={t`Description`}
                    value={editForm.description ?? ""}
                    onChange={(value) =>
                      setEditForm({
                        ...editForm,
                        description: value || null,
                      })
                    }
                  />

                  <EditField
                    label={t`Monthly budget`}
                    type="number"
                    value={String(editForm.monthly_maintenance_budget)}
                    onChange={(value) =>
                      setEditForm({
                        ...editForm,
                        monthly_maintenance_budget: Number(value),
                      })
                    }
                  />

                  <EditField
                    label={t`Latitude`}
                    type="number"
                    value={editForm.latitude?.toString() ?? ""}
                    onChange={(value) =>
                      setEditForm({
                        ...editForm,
                        latitude: value === "" ? null : Number(value),
                      })
                    }
                  />

                  <EditField
                    label={t`Longitude`}
                    type="number"
                    value={editForm.longitude?.toString() ?? ""}
                    onChange={(value) =>
                      setEditForm({
                        ...editForm,
                        longitude: value === "" ? null : Number(value),
                      })
                    }
                  />

                  <EditField
                    label={t`Currency`}
                    value={editForm.currency}
                    onChange={(value) =>
                      setEditForm({ ...editForm, currency: value })
                    }
                  />

                  <EditField
                    label={t`Time zone`}
                    value={editForm.timezone}
                    onChange={(value) =>
                      setEditForm({ ...editForm, timezone: value })
                    }
                  />

                  <label
                    style={S(
                      "display: flex; flex-direction: column; gap: 7px; font-size: 13px; font-weight: 600"
                    )}
                  >
                    <Trans>Status</Trans>

                    <select
                      value={String(editForm.status)}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          status: e.target.value as PlaceUpdateInput["status"],
                        })
                      }
                      style={S(
                        "height: 40px; padding: 0 10px; border: 1px solid var(--border); background: var(--card)"
                      )}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </label>

                  {updateError && (
                    <p
                      style={S(
                        "color: var(--destructive); font-size: 13px; grid-column: 1 / -1; margin: 0"
                      )}
                    >
                      {updateError}
                    </p>
                  )}

                  <div
                    style={S(
                      "display: flex; justify-content: flex-start; gap: 10px; grid-column: 1 / -1; margin-top: 8px"
                    )}
                  >
                    <button
                      type="submit"
                      disabled={saving}
                      className="am-btn am-solid"
                      style={S(
                        "height: 40px; padding: 0 18px; display: flex; align-items: center; gap: 8px"
                      )}
                    >
                      <Save size={16} />
                      {saving ? (
                        <Trans>Saving...</Trans>
                      ) : (
                        <Trans>Save changes</Trans>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setEditing(false)}
                      className="am-btn"
                      style={S(
                        "height: 40px; padding: 0 18px; border: 1px solid var(--border)"
                      )}
                    >
                      <Trans>Cancel</Trans>
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card
            className="am-lift"
            style={S(
              "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0"
            )}
          >
            <CardHeader
              style={S(
                "padding: 18px 20px; border-bottom: 1px solid var(--border); gap: 4px"
              )}
            >
              <CardTitle
                style={S("font-size: 17px; font-weight: 750")}
              >
                <Trans>Place information</Trans>
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {place === null ? (
                <div
                  style={S(
                    "display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px"
                  )}
                >
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      style={S("height: 68px")}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={S(
                    "display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px"
                  )}
                >
                  <InfoItem
                    label={<Trans>Property type</Trans>}
                    icon={<Building2 size={16} />}
                    value={<TypeLabel type={place.place_type} />}
                  />

                  <InfoItem
                    label={<Trans>City</Trans>}
                    icon={<MapPin size={16} />}
                    value={place.city}
                  />

                  <InfoItem
                    label={<Trans>Address</Trans>}
                    icon={<MapPin size={16} />}
                    value={place.address ?? <Trans>Not set</Trans>}
                  />

                  <InfoItem
                    label={<Trans>Monthly budget</Trans>}
                    icon={<Wallet size={16} />}
                    value={`${money.format(place.monthly_maintenance_budget)} ${place.currency}`}
                  />

                  <InfoItem
                    label={<Trans>Timezone</Trans>}
                    icon={<Clock3 size={16} />}
                    value={place.timezone}
                  />

                  <InfoItem
                    label={<Trans>Status</Trans>}
                    icon={<span />}
                    value={<StatusBadge status={String(place.status)} />}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div style={S("display: flex; gap: 10px; flex-wrap: wrap; align-items: center")}>
            {isManager && (
            <Button
              type="button"
              id="assets"
              variant={activeSection === "assets" ? "default" : "outline"}
              size="sm"
              className="am-btn"
              onClick={() => setActiveSection(activeSection === "assets" ? null : "assets")}
              style={S("height: 40px; padding: 0 16px; gap: 8px")}
            >
              <Building2 size={16} />
              <Trans>Assets</Trans>
            </Button>
            )}
            {isManager && (
            <Button
              type="button"
              variant={activeSection === "workers" ? "default" : "outline"}
              size="sm"
              id="worker"
              className="am-btn"
              onClick={() => setActiveSection(activeSection === "workers" ? null : "workers")}
              style={S("height: 40px; padding: 0 16px; gap: 8px")}
            >
              <Users size={16} />
              <Trans>Workers</Trans>
            </Button>
            )}
            <Button
              type="button"
              variant={activeSection === "tickets" ? "default" : "outline"}
              size="sm"
              className="am-btn"
              onClick={() => setActiveSection(activeSection === "tickets" ? null : "tickets")}
              style={S("height: 40px; padding: 0 16px; gap: 8px")}
            >
              <Wrench size={16} />
              <Trans>Maintenance tickets</Trans>
            </Button>
            <Button
              type="button"
              variant={activeSection === "bookings" ? "default" : "outline"}
              size="sm"
              className="am-btn"
              onClick={() => setActiveSection(activeSection === "bookings" ? null : "bookings")}
              style={S("height: 40px; padding: 0 16px; gap: 8px")}
            >
              <CalendarDays size={16} />
              <Trans>Bookings</Trans>
            </Button>
          </div>

          {activeSection === "bookings" && (
            <PlaceBookings placeId={place_id} />
          )}

          {activeSection === "assets" && (
          <Card
            className="am-lift"
            style={S(
              "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0"
            )}
          >
            <CardHeader
              style={S(
                "padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px"
              )}
            >
              <div
                style={S(
                  "display: flex; flex-direction: column; gap: 4px"
                )}
              >
                <CardTitle
                  style={S("font-size: 17px; font-weight: 750")}
                >
                  <Trans>Assets</Trans>
                  {assets !== null && (
                    <span
                      style={S(
                        "margin-inline-start: 8px; font-size: 12px; font-weight: 600; color: var(--muted-foreground); border: 1px solid var(--border); padding: 2px 8px"
                      )}
                    >
                      {assets.length}
                    </span>
                  )}
                </CardTitle>
              </div>

              <CardAction>
                <Link
                  to="/place/asset/new"
                  search={{ place_id }}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "am-btn"
                  )}
                  style={S(
                    "height: 38px; padding: 0 12px; gap: 6px; white-space: nowrap"
                  )}
                >
                  <Plus size={16} />
                  <Trans>Add asset</Trans>
                </Link>
              </CardAction>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {assets === null ? (
                <div
                  style={S(
                    "display: flex; flex-direction: column; gap: 10px"
                  )}
                >
                  <Skeleton style={S("height: 68px")} />
                  <Skeleton style={S("height: 68px")} />
                </div>
              ) : assets.length === 0 ? (
                <div
                  style={S(
                    "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 32px 16px; border: 1px dashed var(--border); text-align: center"
                  )}
                >
                  <Building2
                    size={28}
                    style={S("color: var(--muted-foreground)")}
                  />
                  <p
                    style={S(
                      "font-size: 14px; font-weight: 650; margin: 0"
                    )}
                  >
                    <Trans>No assets yet.</Trans>
                  </p>
                  <p
                    style={S(
                      "font-size: 13px; color: var(--muted-foreground); margin: 0"
                    )}
                  >
                    <Trans>
                      Add an asset to start tracking this property.
                    </Trans>
                  </p>
                </div>
              ) : (
                <div
                  style={S(
                    "display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px"
                  )}
                >
                  {assets.map((a) => (
                    <Link
                      key={a.id}
                      to="/place/asset/$asset_id"
                      params={{ asset_id: a.id }}
                      className="am-lift"
                      style={S(
                        "display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; border: 1px solid var(--border); padding: 14px; background: var(--card)"
                      )}
                    >
                      <div
                        style={S(
                          "display: flex; flex-direction: column; gap: 5px; min-width: 0"
                        )}
                      >
                        <span
                          style={S(
                            "font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                          )}
                        >
                          {a.name}
                        </span>

                        <span
                          style={S(
                            "color: var(--muted-foreground); font-size: 12px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap"
                          )}
                        >
                          <span>{a.type}</span>

                          {a.purchase_date && (
                            <>
                              <span>·</span>
                              <CalendarDays size={13} />
                              <span>
                                {day.format(new Date(a.purchase_date))}
                              </span>
                            </>
                          )}
                        </span>
                      </div>

                      <div style={S("flex-shrink: 0")}>
                        <AssetStatusBadge status={a.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          )}

          {activeSection === "workers" && (
          <Card
            className="am-lift"
            style={S(
              "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0"
            )}
          >
            <CardHeader
  style={S(
    "padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px"
  )}
>
  <CardTitle style={S("font-size: 17px; font-weight: 750")}>
    <Users size={17} style={S("display: inline; vertical-align: middle; margin-inline-end: 7px")} />
    <Trans>Workers</Trans>
    {workers !== null && (
      <span style={S("margin-inline-start: 8px; font-size: 12px; font-weight: 600; color: var(--muted-foreground); border: 1px solid var(--border); padding: 2px 8px")}>
        {workers.filter((worker) => isWorkerAssignedToPlace(worker, place_id)).length}
      </span>
    )}
  </CardTitle>

  <Button
    type="button"
    variant="outline"
    size="sm"
    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "am-btn")}
    style={S("height: 38px; padding: 0 12px; gap: 6px; white-space: nowrap")}
    onClick={handleAddWorker}
  >
    <Plus size={16} />
    <Trans>Add worker</Trans>
  </Button>
</CardHeader>

            <CardContent style={S("padding: 20px; display: flex; flex-direction: column; gap: 18px")}>
              {workers === null ? (
                <div style={S("display: flex; flex-direction: column; gap: 10px")}>
                  <Skeleton style={S("height: 64px")} />
                  <Skeleton style={S("height: 64px")} />
                </div>
              ) : (
                <>
                  {workers.filter((worker) => isWorkerAssignedToPlace(worker, place_id)).length === 0 ? (
                    <div
                      style={S(
                        "display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 16px; border: 1px dashed var(--border); text-align: center"
                      )}
                    >
                      <Users size={26} style={S("color: var(--muted-foreground)")} />
                      <p style={S("font-size: 14px; font-weight: 650; margin: 0")}><Trans>No workers are assigned to this place.</Trans></p>
                    </div>
                  ) : (
                    <div
                      style={S(
                        "display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px"
                      )}
                    >
                      {workers
                        .filter((worker) => isWorkerAssignedToPlace(worker, place_id))
                        .map((worker) => (
                          <div
                            key={worker.id}
                            style={S(
                              "display: flex; flex-direction: column; gap: 6px; min-width: 0; border: 1px solid var(--border); padding: 14px; background: var(--card)"
                            )}
                          >
                            <span style={S("font-size: 14px; font-weight: 700")}>
                              {worker.fullname}
                            </span>
                            <span style={S("font-size: 12px; color: var(--muted-foreground); overflow-wrap: anywhere")}>
                              ID: {worker.id}
                            </span>
                            {worker.phone && (
                              <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
                                {worker.phone}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  <div style={S("border-top: 1px solid var(--border); padding-top: 18px")}>
                    <h3 style={S("font-size: 14px; font-weight: 700; margin: 0 0 12px")}><Trans>Add worker</Trans></h3>
                    <form
  id="add-worker-form"
  onSubmit={handleAddWorker}
  style={S("display: flex; align-items: end; gap: 10px; flex-wrap: wrap")}
>
                      <label style={S("display: flex; flex-direction: column; gap: 7px; flex: 1; min-width: 220px; font-size: 13px; font-weight: 600")}>
                        <span><Trans>Choose a worker (name and ID)</Trans></span>
                        <select
                          value={selectedWorkerId}
                          onChange={(e) => {
                            setSelectedWorkerId(e.target.value)
                            setWorkerError("")
                            setWorkerSuccess("")
                          }}
                          disabled={addingWorker}
                          required
                          style={S("height: 40px; padding: 0 10px; border: 1px solid var(--border); background: var(--card); min-width: 0")}
                        >
                          <option value=""><Trans>Choose a worker</Trans></option>
                          {workers
                            .filter((worker) => !isWorkerAssignedToPlace(worker, place_id))
                            .map((worker) => (
                              <option key={worker.id} value={worker.id}>
                                {worker.fullname} — {worker.id}
                              </option>
                            ))}
                        </select>
                      </label>
                    </form>
                    {workerError && (
                      <p style={S("color: var(--destructive); font-size: 13px; margin: 10px 0 0")}>{workerError}</p>
                    )}
                    {workerSuccess && (
                      <p style={S("color: var(--primary); font-size: 13px; margin: 10px 0 0")}>{workerSuccess}</p>
                    )}
                    {workers.filter((worker) => !isWorkerAssignedToPlace(worker, place_id)).length === 0 && (
                      <p style={S("color: var(--muted-foreground); font-size: 12px; margin: 10px 0 0")}><Trans>All your workers are already assigned to this place.</Trans></p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          )}

          {activeSection === "tickets" && accessToken && (
            <TicketsSection
              token={accessToken}
              placeId={place_id}
              assets={assets}
              title={<Trans>Maintenance tickets</Trans>}
              emptyOpen={<Trans>This place has no open tickets.</Trans>}
              emptyAll={<Trans>This place has no maintenance tickets.</Trans>}
              showAddTicket
            />
          )}

        </>
      )}
    </div>
    </center>
  )
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label
      style={S(
        "display: flex; flex-direction: column; gap: 7px; font-size: 13px; font-weight: 600"
      )}
    >
      <span>{label}</span>

      <input
        type={type}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={S(
          "height: 40px; padding: 0 10px; border: 1px solid var(--border); background: var(--card); min-width: 0"
        )}
      />
    </label>
  )
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label: React.ReactNode
  value: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <div
      style={S(
        "display: flex; flex-direction: column; gap: 9px; min-width: 0; padding: 14px; border: 1px solid var(--border); background: var(--card)"
      )}
    >
      <div
        style={S(
          "display: flex; align-items: center; gap: 7px; color: var(--muted-foreground); font-size: 12px; font-weight: 600"
        )}
      >
        {icon}
        <span>{label}</span>
      </div>

      <div
        style={S(
          "font-size: 14px; font-weight: 650; min-width: 0; overflow-wrap: anywhere"
        )}
      >
        {value}
      </div>
    </div>
  )
}