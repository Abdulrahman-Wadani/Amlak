
import { useEffect, useState, type ReactNode } from "react"
import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import type { Worker } from "@amlak/shared"
import {
  Check,
  CircleAlert,
  Mail,
  MapPin,
  Phone,
  Save,
  Trash2,
  UserRound,
} from "lucide-react"

import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/http"
import { getWorkerById } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { Button } from "@/components/ui/button"
import { apiError, errorMessage } from "@/lib/errors"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { StatusBadge } from "@/components/place-shared"
import { Page } from "@/components/page"

export const Route = createFileRoute(
  "/_authenticated/worker/$worker_id",
)({
  component: WorkerDetailPage,
})

function WorkerDetailPage() {
  const { worker_id } = Route.useParams()
  const navigate = useNavigate()
  const { i18n } = useLingui()
  const { accessToken } = useAuth()

  const [worker, setWorker] = useState<Worker | null>(null)
  const [failed, setFailed] = useState(false)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [saveError, setSaveError] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [fullname, setFullname] = useState("")
  const [phone, setPhone] = useState("")
  const [status, setStatus] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    getWorkerById(accessToken, worker_id)
      .then((data) => {
        if (!alive) return

        setWorker(data)
        setFullname(data.fullname ?? "")
        setPhone(data.phone ?? "")
        setStatus(data.status)
        setEmail(data.email)
      })
      .catch((error) => {
        console.error("Get worker API error:", error)
        if (alive) setFailed(true)
      })

    return () => {
      alive = false
    }
  }, [accessToken, worker_id])

  // Update worker
  async function handleUpdate() {
    if (!accessToken || !worker) return

    setSaving(true)
    setSaveError("")
    setSaveSuccess(false)

    const payload = {
      fullname,
      phone: phone || null,
      status,
      email,
      preferred_language: "ar",
    }

    try {
      const response = await authFetch(`/workers/${worker.id}`, accessToken, {
        method: "PUT",
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw apiError(response.status, result)
      }

      setWorker((previous) =>
        previous
          ? {
              ...previous,
              fullname,
              phone,
              status: status as Worker["status"],
            }
          : previous,
      )

      setSaveSuccess(true)
    } catch (error) {
      console.error("Update worker error:", error)
      setSaveError(
        errorMessage(error),
      )
    } finally {
      setSaving(false)
    }
  }

  // Delete worker
  async function handleDelete() {
    if (!accessToken || !worker || deleting) return

    const confirmed = window.confirm(
      t`Delete the worker "${worker.fullname}"? This cannot be undone.`,
    )

    if (!confirmed) return

    setDeleting(true)
    setDeleteError("")
    setSaveError("")

    try {
      const response = await authFetch(`/workers/${worker.id}`, accessToken, {
        method: "DELETE",
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw apiError(response.status, result)
      }

      await navigate({ to: "/workers" })
    } catch (error) {
      console.error("Delete worker error:", error)
      setDeleteError(
        errorMessage(error),
      )
    } finally {
      setDeleting(false)
    }
  }

  const formattedDate = (date: string | Date) =>
    new Date(date).toLocaleDateString(i18n.locale)

  return (
    <Page
      title={
        worker?.fullname ??
        (failed ? <Trans>Worker not found</Trans> : <Skeleton style={S("width: 220px; height: 30px")} />)
      }
      phoneTitle={<Trans>Worker</Trans>}
      parent={{ label: <Trans>Workers</Trans>, link: { to: "/workers" } }}
    >
      {/* Error */}
      {failed && (
        <div
          style={S(`
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 16px;
            border: 1px solid var(--border);
            background: #fff;
            color: var(--muted-foreground);
            font-size: 13px;
          `)}
        >
          <CircleAlert size={18} />
          <Trans>We could not load this worker.</Trans>
        </div>
      )}

      {!failed && (
        <>
          {/* Worker Overview */}
          <div
            style={S(`
              display: flex;
              align-items: center;
              gap: 16px;
              flex-wrap: wrap;
              padding: 20px;
              background: #fff;
              border: 1px solid var(--border);
              box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08);
            `)}
          >
            <div
              style={S(`
                width: 54px;
                height: 54px;
                display: grid;
                place-items: center;
                flex: none;
                background: var(--muted);
                border: 1px solid var(--border);
              `)}
            >
              <UserRound size={25} />
            </div>

            <div style={S("flex: 1; min-width: 0")}>
              <div
                style={S(`
                  font-size: 18px;
                  font-weight: 750;
                  overflow: hidden;
                  text-overflow: ellipsis;
                `)}
              >
                {worker?.fullname ?? (
                  <Skeleton style={S("height: 20px; width: 160px")} />
                )}
              </div>

              <div
                dir="ltr"
                style={S(`
                  text-align: match-parent;
                  margin-top: 5px;
                  font-size: 13px;
                  color: var(--muted-foreground);
                `)}
              >
                {worker?.email}
              </div>
            </div>

            {worker && <StatusBadge status={worker.status} />}
          </div>

          {/* Worker Information */}
          <Card
            className="am-lift"
            style={S(`
              padding: 0;
              border: 1px solid var(--border);
              border-radius: 0;
              box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08);
              background: #fff;
              gap: 0;
            `)}
          >
            <CardHeader
              style={S(`
                padding: 18px 20px;
                border-bottom: 1px solid var(--border);
              `)}
            >
              <CardTitle
                style={S(`
                  display: flex;
                  align-items: center;
                  gap: 9px;
                  font-size: 16px;
                  font-weight: 750;
                `)}
              >
                <UserRound size={18} />
                <Trans>Worker information</Trans>
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {worker === null ? (
                <div style={S("display: flex; flex-direction: column; gap: 14px")}>
                  <Skeleton style={S("height: 42px")} />
                  <Skeleton style={S("height: 42px")} />
                  <Skeleton style={S("height: 42px")} />
                </div>
              ) : (
                <div
                  style={S(`
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 18px;
                  `)}
                >
                  <FormField label={t`Full name`} htmlFor="fullname">
                    <Input
                      id="fullname"
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      className="am-input"
                    />
                  </FormField>

                  <FormField label={t`Email`} htmlFor="email">
                    <div style={S("position: relative")}>
                      <Mail
                        size={16}
                        style={S(`
                          position: absolute;
                          top: 13px;
                          inset-inline-start: 12px;
                          color: var(--muted-foreground);
                        `)}
                      />
                      <Input
                        id="email"
                        value={email}
                        disabled
                        dir="ltr"
                        className="am-input"
                        style={S(`
                          padding-inline-start: 36px;
                          text-align: match-parent;
                          opacity: 0.75;
                        `)}
                      />
                    </div>
                  </FormField>

                  <FormField label={t`Phone number`} htmlFor="phone">
                    <div style={S("position: relative")}>
                      <Phone
                        size={16}
                        style={S(`
                          position: absolute;
                          top: 13px;
                          inset-inline-start: 12px;
                          color: var(--muted-foreground);
                        `)}
                      />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        dir="ltr"
                        className="am-input"
                        style={S(`
                          padding-inline-start: 36px;
                          text-align: match-parent;
                        `)}
                      />
                    </div>
                  </FormField>

                  <FormField label={t`Worker status`} htmlFor="status">
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="am-input w-full rounded-md border px-3 py-2"
                      style={S(`
                        height: 40px;
                        background: #fff;
                      `)}
                    >
                      {status !== "ACTIVE" &&
                        status !== "DEACTIVATED" && (
                          <option value={status} disabled>
                            {status}
                          </option>
                        )}
                      <option value="ACTIVE"><Trans>Active</Trans></option>
                      <option value="DEACTIVATED"><Trans>Deactivated</Trans></option>
                    </select>
                  </FormField>

                  <InfoField
                    label={t`Preferred language`}
                    value={worker.preferred_language}
                  />

                  <InfoField
                    label={t`Email confirmed`}
                    value={
                      worker.email_verified_at
                        ? formattedDate(worker.email_verified_at)
                        : t`Not confirmed`
                    }
                  />

                  <InfoField
                    label={t`Joined`}
                    value={formattedDate(worker.created_at)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Places */}
          <Card
            className="am-lift"
            style={S(`
              padding: 0;
              border: 1px solid var(--border);
              border-radius: 0;
              box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08);
              background: #fff;
              gap: 0;
            `)}
          >
            <CardHeader
              style={S(`
                padding: 18px 20px;
                border-bottom: 1px solid var(--border);
              `)}
            >
              <CardTitle
                style={S(`
                  display: flex;
                  align-items: center;
                  gap: 9px;
                  font-size: 16px;
                  font-weight: 750;
                `)}
              >
                <MapPin size={18} />
                <Trans>Assigned places</Trans>

                {worker && (
                  <span
                    style={S(`
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      min-width: 24px;
                      height: 22px;
                      padding: 0 6px;
                      margin-inline-start: 4px;
                      background: var(--muted);
                      color: var(--muted-foreground);
                      font-size: 11px;
                      font-weight: 700;
                    `)}
                  >
                    {worker.assigned_places?.length ?? 0}
                  </span>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {worker === null ? (
                <Skeleton style={S("height: 60px")} />
              ) : worker.assigned_places?.length ? (
                <div
                  style={S(`
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 10px;
                  `)}
                >
                  {worker.assigned_places.map((place) => (
                    <div
                      key={place.place_id}
                      style={S(`
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        min-width: 0;
                        padding: 13px;
                        border: 1px solid var(--border);
                        background: #fff;
                      `)}
                    >
                      <div
                        style={S(`
                          width: 34px;
                          height: 34px;
                          display: grid;
                          place-items: center;
                          flex: none;
                          background: var(--muted);
                        `)}
                      >
                        <MapPin
                          size={16}
                          style={S("color: var(--muted-foreground)")}
                        />
                      </div>

                      <span
                        style={S(`
                          font-size: 13px;
                          font-weight: 650;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                        `)}
                      >
                        {place.place_name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={S(`
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 28px 16px;
                    border: 1px dashed var(--border);
                    color: var(--muted-foreground);
                    text-align: center;
                  `)}
                >
                  <MapPin size={24} />
                  <p style={S("margin: 0; font-size: 13px")}>
                    <Trans>This worker has no assigned places.</Trans>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div
            style={S(`
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
              padding: 16px 18px;
              border: 1px solid var(--border);
              background: #fff;
            `)}
          >
            {saveError && (
              <p
                role="alert"
                style={S(`
                  display: flex;
                  align-items: center;
                  gap: 7px;
                  margin: 0;
                  color: var(--destructive);
                  font-size: 13px;
                `)}
              >
                <CircleAlert size={16} />
                {saveError}
              </p>
            )}

            {deleteError && (
              <p
                role="alert"
                style={S(`
                  display: flex;
                  align-items: center;
                  gap: 7px;
                  margin: 0;
                  color: var(--destructive);
                  font-size: 13px;
                `)}
              >
                <CircleAlert size={16} />
                {deleteError}
              </p>
            )}

            {saveSuccess && (
              <p
                role="status"
                style={S(`
                  display: flex;
                  align-items: center;
                  gap: 7px;
                  margin: 0;
                  color: var(--muted-foreground);
                  font-size: 13px;
                `)}
              >
                <Check size={16} />
                <Trans>The worker was updated.</Trans>
              </p>
            )}

            <div
              style={S(`
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
                width: 100%;
              `)}
            >
              <Button
                onClick={handleUpdate}
                disabled={!worker || saving || deleting}
                className="am-btn am-solid"
                style={S(`
                  min-width: 130px;
                  height: 42px;
                  gap: 8px;
                `)}
              >
                <Save size={16} />
                {saving ? t`Saving…` : t`Save changes`}
              </Button>

              <Button
                onClick={handleDelete}
                disabled={!worker || saving || deleting}
                variant="destructive"
                style={S(`
                  min-width: 130px;
                  height: 42px;
                  gap: 8px;
                `)}
              >
                <Trash2 size={16} />
                {deleting ? t`Deleting…` : t`Delete worker`}
              </Button>
            </div>
          </div>
        </>
      )}
    </Page>
  )
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div style={S("display: flex; flex-direction: column; gap: 8px")}>
      <Label
        htmlFor={htmlFor}
        style={S(`
          font-size: 12px;
          font-weight: 650;
          color: var(--muted-foreground);
        `)}
      >
        {label}
      </Label>
      {children}
    </div>
  )
}

function InfoField({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div style={S("display: flex; flex-direction: column; gap: 8px")}>
      <span
        style={S(`
          font-size: 12px;
          font-weight: 650;
          color: var(--muted-foreground);
        `)}
      >
        {label}
      </span>

      <div
        style={S(`
          min-height: 40px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          border: 1px solid var(--border);
          background: var(--muted);
          font-size: 13px;
          font-weight: 600;
        `)}
      >
        {value}
      </div>
    </div>
  )
}
