
import { useEffect, useState, type ReactNode } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { LANGUAGE_NAMES } from "@/lib/i18n"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import {
  Check,
  CircleAlert,
  Mail,
  Phone,
  Save,
  UserRound,
  Shield,
} from "lucide-react"

import { useAuth } from "@/lib/auth"
import { getUserById, updateUser, type UserResponse } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { errorMessage } from "@/lib/errors"
import { Button } from "@/components/ui/button"
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
  "/_authenticated/admin/$admin_id",
)({
  component: UserDetailPage,
})

function UserDetailPage() {
  const { admin_id } = Route.useParams()
  const { i18n } = useLingui()
  const { accessToken } = useAuth()

  const [user, setUser] = useState<UserResponse | null>(null)
  const [failed, setFailed] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [fullname, setFullname] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<UserResponse["role"]>("WORKER")
  const [status, setStatus] =
    useState<UserResponse["status"]>("ACTIVE")
  const [preferredLanguage, setPreferredLanguage] =
    useState<UserResponse["preferred_language"]>("ar")

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    getUserById(accessToken, admin_id)
      .then((data) => {
        if (!alive) return

        setUser(data)
        setFullname(data.fullname ?? "")
        setPhone(data.phone ?? "")
        setRole(data.role)
        setStatus(data.status)
        setPreferredLanguage(data.preferred_language)
      })
      .catch((error) => {
        console.error("Get user API error:", error)
        if (alive) setFailed(true)
      })

    return () => {
      alive = false
    }
  }, [accessToken, admin_id])

  async function handleUpdate() {
    if (!accessToken || !user || saving) return

    setSaving(true)
    setSaveError("")
    setSaveSuccess(false)

    try {
      const updatedUser = await updateUser(accessToken, user.id, {
        fullname: fullname.trim(),
        phone: phone.trim() || null,
        role,
        status,
        preferred_language: preferredLanguage,
      })

      setUser(updatedUser)
      setFullname(updatedUser.fullname ?? "")
      setPhone(updatedUser.phone ?? "")
      setRole(updatedUser.role)
      setStatus(updatedUser.status)
      setPreferredLanguage(updatedUser.preferred_language)

      setSaveSuccess(true)
    } catch (error) {
      console.error("Update user error:", error)
      setSaveError(
        errorMessage(error),
      )
    } finally {
      setSaving(false)
    }
  }

  const formattedDate = (date: string | Date) =>
    new Date(date).toLocaleDateString(i18n.locale)

  return (
    <Page
      title={
        user?.fullname ??
        (failed ? <Trans>User not found</Trans> : <Skeleton style={S("width: 220px; height: 30px")} />)
      }
      phoneTitle={<Trans>User details</Trans>}
      parent={{ label: <Trans>Users</Trans>, link: { to: "/admin" } }}
    >
      {/* Error */}
      {failed && (
        <div
          style={S(`
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            padding: 16px;
            border: 1px solid var(--border);
            background: #fff;
            color: var(--muted-foreground);
            font-size: 13px;
            text-align: center;
          `)}
        >
          <CircleAlert size={18} />
          <Trans>We could not load this user.</Trans>
        </div>
      )}

      {!failed && (
        <>
          {/* User Overview */}
          <div
            style={S(`
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 12px;
              width: 100%;
              padding: 24px 20px;
              background: #fff;
              border: 1px solid var(--border);
              box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08);
              text-align: center;
            `)}
          >
            <div
              style={S(`
                width: 54px;
                height: 54px;
                display: grid;
                place-items: center;
                background: var(--muted);
                border: 1px solid var(--border);
              `)}
            >
              <UserRound size={25} />
            </div>

            <div
              style={S(`
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                min-width: 0;
                max-width: 100%;
              `)}
            >
              <div
                style={S(`
                  font-size: 18px;
                  font-weight: 750;
                  overflow-wrap: anywhere;
                `)}
              >
                {user?.fullname ?? (
                  <Skeleton
                    style={S(`
                      height: 20px;
                      width: 160px;
                      margin: 0 auto;
                    `)}
                  />
                )}
              </div>

              <div
                dir="ltr"
                style={S(`
                  text-align: center;
                  font-size: 13px;
                  color: var(--muted-foreground);
                `)}
              >
                {user?.email}
              </div>
            </div>

            {user && <StatusBadge status={user.status} />}
          </div>

          {/* User Information */}
          <Card
            className="am-lift"
            style={S(`
              width: 100%;
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
                display: flex;
                justify-content: center;
                padding: 18px 20px;
                border-bottom: 1px solid var(--border);
              `)}
            >
              <CardTitle
                style={S(`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 9px;
                  width: 100%;
                  font-size: 16px;
                  font-weight: 750;
                  text-align: center;
                `)}
              >
                <UserRound size={18} />
                <Trans>User information</Trans>
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {user === null ? (
                <div
                  style={S(`
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                  `)}
                >
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
                        value={user.email}
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

                  <FormField label={t`Role`} htmlFor="role">
                    <select
                      id="role"
                      value={role}
                      onChange={(e) =>
                        setRole(e.target.value as UserResponse["role"])
                      }
                      className="am-input w-full rounded-md border px-3 py-2"
                      style={S(`
                        height: 40px;
                        background: #fff;
                      `)}
                    >
                      <option value="ADMIN"><Trans>Admin</Trans></option>
                      <option value="MANAGER"><Trans>Owner / Manager</Trans></option>
                      <option value="WORKER"><Trans>Worker</Trans></option>
                    </select>
                  </FormField>

                  <FormField label={t`Account status`} htmlFor="status">
                    <select
                      id="status"
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as UserResponse["status"])
                      }
                      className="am-input w-full rounded-md border px-3 py-2"
                      style={S(`
                        height: 40px;
                        background: #fff;
                      `)}
                    >
                      <option value="ACTIVE"><Trans>Active</Trans></option>
                      <option value="DEACTIVATED"><Trans>Deactivated</Trans></option>
                    </select>
                  </FormField>

                  <FormField
                    label={t`Preferred language`}
                    htmlFor="preferred_language"
                  >
                    <select
                      id="preferred_language"
                      value={preferredLanguage}
                      onChange={(e) =>
                        setPreferredLanguage(
                          e.target.value as UserResponse["preferred_language"],
                        )
                      }
                      className="am-input w-full rounded-md border px-3 py-2"
                      style={S(`
                        height: 40px;
                        background: #fff;
                      `)}
                    >
                      <option value="ar">{LANGUAGE_NAMES.ar}</option>
                      <option value="en">{LANGUAGE_NAMES.en}</option>
                    </select>
                  </FormField>

                  <InfoField
                    label={t`Email confirmed`}
                    value={
                      user.email_verified_at
                        ? formattedDate(user.email_verified_at)
                        : t`Not confirmed`
                    }
                  />

                  <InfoField
                    label={t`Account created`}
                    value={formattedDate(user.created_at)}
                  />

                  <InfoField
                    label={t`User ID`}
                    value={user.id}
                  />

                  <InfoField
                    label={t`Manager ID`}
                    value={user.manager_id ?? t`None`}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card
            className="am-lift"
            style={S(`
              width: 100%;
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
                display: flex;
                justify-content: center;
                padding: 18px 20px;
                border-bottom: 1px solid var(--border);
              `)}
            >
              <CardTitle
                style={S(`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 9px;
                  width: 100%;
                  font-size: 16px;
                  font-weight: 750;
                  text-align: center;
                `)}
              >
                <Shield size={18} />
                <Trans>Account information</Trans>
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {user === null ? (
                <Skeleton style={S("height: 60px")} />
              ) : (
                <div
                  style={S(`
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 18px;
                  `)}
                >
                  <InfoField
                    label={t`Last updated`}
                    value={formattedDate(user.updated_at)}
                  />

                  <InfoField
                    label={t`Email verification`}
                    value={
                      user.email_verified_at
                        ? t`Verified`
                        : t`Not verified`
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div
            style={S(`
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 12px;
              width: 100%;
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
                  justify-content: center;
                  gap: 7px;
                  margin: 0;
                  color: var(--destructive);
                  font-size: 13px;
                  text-align: center;
                `)}
              >
                <CircleAlert size={16} />
                {saveError}
              </p>
            )}

            {saveSuccess && (
              <p
                role="status"
                style={S(`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 7px;
                  margin: 0;
                  color: var(--muted-foreground);
                  font-size: 13px;
                  text-align: center;
                `)}
              >
                <Check size={16} />
                <Trans>The user was updated.</Trans>
              </p>
            )}

            <div
              style={S(`
                display: flex;
                align-items: center;
                justify-content: center;
                flex-wrap: wrap;
                gap: 10px;
                width: 100%;
              `)}
            >
              <Button
                onClick={handleUpdate}
                disabled={!user || saving}
                className="am-btn am-solid"
                style={S(`
                  min-width: 150px;
                  height: 42px;
                  gap: 8px;
                `)}
              >
                <Save size={16} />
                {saving ? t`Saving…` : t`Save changes`}
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
    <div
      style={S(`
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: center;
      `)}
    >
      <Label
        htmlFor={htmlFor}
        style={S(`
          font-size: 12px;
          font-weight: 650;
          color: var(--muted-foreground);
          text-align: center;
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
    <div
      style={S(`
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: center;
      `)}
    >
      <span
        style={S(`
          font-size: 12px;
          font-weight: 650;
          color: var(--muted-foreground);
          text-align: center;
        `)}
      >
        {label}
      </span>

      <div
        style={S(`
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border: 1px solid var(--border);
          background: var(--muted);
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          overflow-wrap: anywhere;
        `)}
      >
        {value}
      </div>
    </div>
  )
}
