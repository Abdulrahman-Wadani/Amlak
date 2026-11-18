import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert, Info, MapPin } from "lucide-react"
import type { Worker } from "@amlak/shared"
import { createWorker, deleteWorker, updateWorker } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { LIMITS, tooLong } from "@/lib/limits"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "cn"
import { WorkerStatusChip } from "@/components/place-shared"
import { ConfirmDialog } from "@/components/states"
import { Bullets, Field, FormButtons, Panel, PanelTitle, TwoColumns } from "@/components/panel"

const PREFIX = "+966"

/**
 * The number as the API wants it (E.164). A local number typed after the
 * +966 box drops its leading 0; a number that starts with + is kept as typed.
 */
export function toE164(typed: string, prefix = PREFIX): string {
  const compact = typed.replace(/[\s()-]/g, "")
  if (compact.startsWith("+")) return compact
  if (compact.startsWith("00")) return `+${compact.slice(2)}`
  return `${prefix}${compact.replace(/^0+/, "")}`
}

export const isE164 = (phone: string) => /^\+[1-9]\d{7,14}$/.test(phone)

type FieldKey = "name" | "email" | "phone"

/**
 * Invite worker (no worker) and the worker's own page (a worker): name,
 * email and mobile number, the account's status, and what a worker sees or
 * where they work.
 */
export function WorkerForm({
  token,
  worker,
  onSaved,
}: {
  token: string
  worker?: Worker
  onSaved?: (worker: Worker) => void
}) {
  const navigate = useNavigate()
  const editing = worker !== undefined
  const [name, setName] = useState(worker?.fullname ?? "")
  const [email, setEmail] = useState(worker?.email ?? "")
  // A new worker's number is typed after +966; an existing one is shown whole.
  const [phone, setPhone] = useState(worker?.phone ?? "")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState<"save" | "status" | "delete" | null>(null)
  const [confirming, setConfirming] = useState(false)

  const number = editing ? phone.trim() : toE164(phone.trim())

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Partial<Record<FieldKey, string>> = {}
    if (!name.trim()) next.name = t`Enter the worker's full name.`
    else next.name = tooLong(name, LIMITS.name)
    if (!editing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = t`Enter a valid email address.`
    if (!phone.trim()) next.phone = t`Enter the mobile number.`
    else if (!isE164(number)) next.phone = t`Enter a valid mobile number, e.g. 501234567.`
    setErrors(next)
    setSaved(false)
    if (Object.values(next).some(Boolean)) return

    setBusy("save")
    setFormError("")
    try {
      if (worker) {
        const updated = await updateWorker(token, worker.id, { fullname: name.trim(), phone: number })
        onSaved?.({ ...worker, ...updated })
        setSaved(true)
      } else {
        await createWorker(token, { fullname: name.trim(), email: email.trim(), phone: number })
        await navigate({ to: "/workers" })
      }
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function changeStatus(status: "ACTIVE" | "DEACTIVATED") {
    if (!worker) return
    setBusy("status")
    setFormError("")
    try {
      const updated = await updateWorker(token, worker.id, { status })
      onSaved?.({ ...worker, ...updated })
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!worker) return
    setBusy("delete")
    setFormError("")
    try {
      await deleteWorker(token, worker.id)
      await navigate({ to: "/workers" })
    } catch (err) {
      setFormError(errorMessage(err))
      setBusy(null)
    }
  }

  const invalid = (key: FieldKey, id: string) =>
    errors[key] ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {}

  return (
    <TwoColumns
      main={
        <Panel pad="lg">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Field id="wn" label={<Trans>Full name</Trans>} error={errors.name}>
              <Input id="wn" autoComplete="off" maxLength={LIMITS.name} value={name} onChange={(e) => setName(e.target.value)} {...invalid("name", "wn")} />
            </Field>
            <Field
              id="we"
              label={<Trans>Email</Trans>}
              error={errors.email}
              hint={editing ? <Trans>The email cannot be changed.</Trans> : undefined}
            >
              <Input
                id="we"
                type="email"
                maxLength={LIMITS.email}
                dir="ltr"
                autoComplete="off"
                readOnly={editing}
                className={editing ? "bg-secondary text-muted-foreground" : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...invalid("email", "we")}
              />
            </Field>
            <Field id="wp" label={<Trans>Mobile number</Trans>} error={errors.phone}>
              {editing ? (
                <Input id="wp" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} {...invalid("phone", "wp")} />
              ) : (
                <div dir="ltr" className="flex gap-2">
                  <span className="box-border inline-flex h-11 flex-none items-center border border-border bg-secondary px-3 text-[15px]">
                    {PREFIX}
                  </span>
                  <Input
                    id="wp"
                    type="tel"
                    dir="ltr"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    {...invalid("phone", "wp")}
                  />
                </div>
              )}
            </Field>

            {!editing && (
              <div className="flex items-start gap-2.5 border border-info-200 bg-info-50 px-3.5 py-3 text-sm leading-[1.6]">
                <Info aria-hidden="true" className="mt-0.5 size-4 flex-none text-info-900" strokeWidth={1.8} />
                <div className="flex flex-col gap-0.5">
                  <strong className="font-semibold text-info-900">
                    <Trans>We will send an invitation to the worker's email.</Trans>
                  </strong>
                  <span>
                    <Trans>
                      The worker chooses their own password from the invitation link, then you assign them to places
                      from each place page.
                    </Trans>
                  </span>
                </div>
              </div>
            )}

            {formError && (
              <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                {formError}
              </p>
            )}
            {saved && (
              <p role="status" className="m-0 text-[13px] text-good-700">
                <Trans>The changes are saved.</Trans>
              </p>
            )}

            <FormButtons>
              <Link to="/workers" className={cn(buttonVariants({ variant: "outline" }))}>
                <Trans>Cancel</Trans>
              </Link>
              <Button type="submit" disabled={busy !== null}>
                {busy === "save" ? (
                  <Trans>Saving…</Trans>
                ) : editing ? (
                  <Trans>Save changes</Trans>
                ) : (
                  <Trans>Send invitation</Trans>
                )}
              </Button>
            </FormButtons>
          </form>
        </Panel>
      }
      side={
        <>
          <Panel>
            <PanelTitle small>
              <Trans>Account status</Trans>
            </PanelTitle>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm leading-[1.6] text-muted-foreground">
                {!worker || worker.status === "INVITED" || worker.status === "PENDING_VERIFICATION" ? (
                  <Trans>Until the worker finishes setting up the account</Trans>
                ) : worker.status === "ACTIVE" ? (
                  <Trans>The worker can sign in.</Trans>
                ) : (
                  <Trans>The worker cannot sign in until you reactivate the account.</Trans>
                )}
              </span>
              <WorkerStatusChip status={worker?.status ?? "INVITED"} />
            </div>
            {worker && (
              <div className="flex flex-wrap gap-2.5 pt-1">
                {worker.status === "ACTIVE" && (
                  <Button type="button" variant="destructive" disabled={busy !== null} onClick={() => void changeStatus("DEACTIVATED")}>
                    {busy === "status" ? <Trans>Deactivating…</Trans> : <Trans>Deactivate</Trans>}
                  </Button>
                )}
                {worker.status === "DEACTIVATED" && (
                  <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void changeStatus("ACTIVE")}>
                    {busy === "status" ? <Trans>Reactivating…</Trans> : <Trans>Reactivate</Trans>}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy !== null}
                  onClick={() => {
                    setFormError("")
                    setConfirming(true)
                  }}
                >
                  <Trans>Delete worker</Trans>
                </Button>
                <ConfirmDialog
                  open={confirming}
                  title={<Trans>Delete {worker.fullname}’s account?</Trans>}
                  text={<Trans>Their assignments end and their past tickets stay in the records. This cannot be undone from the app.</Trans>}
                  confirm={busy === "delete" ? <Trans>Deleting…</Trans> : <Trans>Delete worker</Trans>}
                  busy={busy === "delete"}
                  error={formError}
                  onConfirm={() => void handleDelete()}
                  onClose={() => setConfirming(false)}
                />
              </div>
            )}
          </Panel>
          {worker ? (
            <Panel>
              <PanelTitle small>
                <Trans>Assigned places</Trans>
              </PanelTitle>
              {worker.assigned_places.length === 0 ? (
                <p className="m-0 text-sm text-muted-foreground">
                  <Trans>Not assigned to any place. Assign workers from each place page.</Trans>
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {worker.assigned_places.map((assignment) => (
                    <li key={assignment.place_id}>
                      <Link
                        to="/place/$place_id"
                        params={{ place_id: assignment.place_id }}
                        className="am-lift box-border flex min-h-11 items-center gap-2 border border-border bg-card px-3.5 py-2.5 font-semibold text-foreground no-underline"
                      >
                        <MapPin aria-hidden="true" className="size-4 flex-none text-muted-foreground" strokeWidth={1.8} />
                        {assignment.place_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : (
            <Panel>
              <PanelTitle small>
                <Trans>What a worker sees</Trans>
              </PanelTitle>
              <Bullets
                items={[
                  <Trans key="1">Only the places assigned to them and their assets.</Trans>,
                  <Trans key="2">Bookings at those places, where they check guests in and out.</Trans>,
                  <Trans key="3">Their tasks, their reports and the photos.</Trans>,
                  <Trans key="4">No expenses and no financial reports.</Trans>,
                ]}
              />
            </Panel>
          )}
        </>
      }
    />
  )
}
