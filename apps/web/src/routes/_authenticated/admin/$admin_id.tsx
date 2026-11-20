import { useEffect, useState, type FormEvent } from "react"
import { createFileRoute, redirect, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert, Lock, RotateCw } from "lucide-react"
import type { User } from "@amlak/shared"
import { storedUser, useAuth } from "@/lib/auth"
import { apiRequest } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { LIMITS, tooLong } from "@/lib/limits"
import { LANGUAGE_NAMES } from "@/lib/i18n"
import { roleLabel } from "@/lib/nav"
import { useFormat } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Page } from "@/components/page"
import { Field, FormButtons, InfoRows, Panel, PanelTitle, TwoColumns } from "@/components/panel"
import { UserStatusChip } from "@/components/place-shared"
import { ConfirmDialog, LoadError } from "@/components/states"
import { toast } from "@/components/toast"
import { toE164 } from "@/components/worker-form"

export const Route = createFileRoute("/_authenticated/admin/$admin_id")({
  beforeLoad: () => {
    if (storedUser()?.role !== "ADMIN") throw redirect({ to: "/home" })
  },
  component: AdminUser,
})

function updateUser(token: string, id: string, input: { fullname?: string; phone?: string; status?: "ACTIVE" | "DEACTIVATED" }) {
  return apiRequest<User>(`/users/${id}`, token, { method: "PUT", body: JSON.stringify(input) })
}

/** One account: the details an admin can change, and deactivating or reactivating it. */
function AdminUser() {
  const { admin_id } = useParams({ from: "/_authenticated/admin/$admin_id" })
  const { accessToken, user: me } = useAuth()
  const { date } = useFormat()
  const [user, setUser] = useState<User | null>(null)
  const [failed, setFailed] = useState(false)
  const [fullname, setFullname] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState<{ fullname?: string; phone?: string }>({})
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    apiRequest<User>(`/users/${admin_id}`, accessToken)
      .then((found) => {
        setUser(found)
        setFullname(found.fullname)
        setPhone((found.phone ?? "").replace(/^\+966/, ""))
      })
      .catch(() => setFailed(true))
  }, [accessToken, admin_id])

  async function run(input: Parameters<typeof updateUser>[2], done: string) {
    if (!accessToken || !user) return false
    setBusy(true)
    setError("")
    try {
      const updated = await updateUser(accessToken, user.id, input)
      setUser({ ...user, ...updated })
      toast(done)
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const number = toE164(phone.trim())
    const next: typeof errors = {}
    if (!fullname.trim()) next.fullname = t`Enter the full name.`
    else next.fullname = tooLong(fullname, LIMITS.name)
    if (phone.trim() && !/^\+9665[013-9]\d{7}$/.test(number)) next.phone = t`Enter a Saudi mobile number that starts with 5.`
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    void run({ fullname: fullname.trim(), ...(phone.trim() ? { phone: number } : {}) }, t`The changes are saved.`)
  }

  const self = user?.id === me?.id

  return (
    <Page
      title={user?.fullname ?? (failed ? <Trans>User not found</Trans> : <Skeleton className="h-7 w-56" />)}
      phoneTitle={<Trans>User</Trans>}
      parent={{ label: <Trans>Users</Trans>, link: { to: "/admin" } }}
      bell={false}
      phoneEnd="none"
      tabs={false}
    >
      {failed ? (
        <LoadError title={<Trans>Could not load this user</Trans>} onRetry={() => window.location.reload()} />
      ) : user === null ? (
        <Skeleton className="h-96" />
      ) : (
        <TwoColumns
          main={
            <Panel labelledBy="details-title" className="gap-4">
              <PanelTitle id="details-title">
                <Trans>Details</Trans>
              </PanelTitle>
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <Field id="u-name" required label={<Trans>Full name</Trans>} error={errors.fullname}>
                  <Input id="u-name" maxLength={LIMITS.name} value={fullname} aria-invalid={errors.fullname ? true : undefined} onChange={(e) => setFullname(e.target.value)} />
                </Field>
                <Field id="u-email" label={<Trans>Email</Trans>}>
                  <Input id="u-email" dir="ltr" value={user.email} readOnly className="bg-secondary text-muted-foreground" />
                </Field>
                <Field id="u-phone" optional label={<Trans>Mobile number</Trans>} error={errors.phone}>
                  <div dir="ltr" className="flex gap-2">
                    <span className="box-border inline-flex h-11 flex-none items-center border border-border bg-secondary px-3 text-[15px]">+966</span>
                    <Input id="u-phone" type="tel" dir="ltr" value={phone} aria-invalid={errors.phone ? true : undefined} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </Field>
                {error && (
                  <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                    <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                    {error}
                  </p>
                )}
                <FormButtons>
                  <Button type="submit" disabled={busy}>
                    {busy ? <Trans>Saving…</Trans> : <Trans>Save changes</Trans>}
                  </Button>
                </FormButtons>
              </form>
            </Panel>
          }
          side={
            <>
              <Panel labelledBy="account-title" className="gap-2">
                <PanelTitle id="account-title">
                  <Trans>Account</Trans>
                </PanelTitle>
                <InfoRows
                  rows={[
                    { label: <Trans>Role</Trans>, value: roleLabel(user.role) },
                    { label: <Trans>Status</Trans>, value: <UserStatusChip status={user.status} /> },
                    { label: <Trans>Signed up</Trans>, value: date(user.created_at, { day: "numeric", month: "long", year: "numeric" }) },
                    { label: <Trans>Language</Trans>, value: LANGUAGE_NAMES[user.preferred_language] },
                  ]}
                />
              </Panel>
              {!self &&
                (user.status === "DEACTIVATED" ? (
                  <Panel labelledBy="reactivate-title">
                    <PanelTitle id="reactivate-title" small>
                      <Trans>Reactivate account</Trans>
                    </PanelTitle>
                    <span className="text-[13px] leading-[1.6] text-muted-foreground">
                      {user.email_verified_at ? (
                        <Trans>The user can sign in again right away.</Trans>
                      ) : (
                        <Trans>Only an account with a verified email can be reactivated.</Trans>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={busy || !user.email_verified_at}
                      onClick={() => void run({ status: "ACTIVE" }, t`Account reactivated.`)}
                    >
                      <RotateCw aria-hidden="true" />
                      <Trans>Reactivate account</Trans>
                    </Button>
                  </Panel>
                ) : (
                  <Panel labelledBy="deactivate-title">
                    <PanelTitle id="deactivate-title" small>
                      <Trans>Deactivate account</Trans>
                    </PanelTitle>
                    <span className="text-[13px] leading-[1.6] text-muted-foreground">
                      <Trans>
                        Signs the user out of every device right away. Deactivating a manager also stops their workers from signing in until it is reactivated.
                      </Trans>
                    </span>
                    <Button type="button" variant="destructive-soft" className="w-full" disabled={busy} onClick={() => setConfirming(true)}>
                      <Lock aria-hidden="true" />
                      <Trans>Deactivate account</Trans>
                    </Button>
                    <ConfirmDialog
                      open={confirming}
                      title={<Trans>Deactivate {user.fullname}’s account?</Trans>}
                      text={<Trans>They are signed out at once and cannot sign in until you reactivate the account.</Trans>}
                      confirm={<Trans>Deactivate account</Trans>}
                      busy={busy}
                      error={error}
                      onConfirm={async () => {
                        if (await run({ status: "DEACTIVATED" }, t`Account deactivated.`)) setConfirming(false)
                      }}
                      onClose={() => setConfirming(false)}
                    />
                  </Panel>
                ))}
            </>
          }
        />
      )}
    </Page>
  )
}
