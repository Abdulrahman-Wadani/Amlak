import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Camera, CircleAlert } from "lucide-react"
import type { Language, User } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getProfile, updateProfile } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { LIMITS, tooLong } from "@/lib/limits"
import { LANGUAGE_NAMES, useLanguage } from "@/lib/i18n"
import { roleLabel } from "@/lib/nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Page } from "@/components/page"
import { Field, FormButtons, Panel, PanelTitle, Segmented, TwoColumns } from "@/components/panel"
import { WorkerStatusChip } from "@/components/place-shared"
import { LoadError, LoadingList } from "@/components/states"
import { toast } from "@/components/toast"
import { ManageLinks, SecurityLinks } from "@/components/account-links"
import { toE164 } from "@/components/worker-form"

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
})

const local = (phone: string | null) => (phone ?? "").replace(/^\+966/, "")

/** Account: personal information and photo, the interface language, and security (support, sign out). */
function ProfilePage() {
  const { accessToken } = useAuth()
  const { lang, setLang } = useLanguage()
  const [profile, setProfile] = useState<User | null>(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [fullname, setFullname] = useState("")
  const [phone, setPhone] = useState("")
  const [picture, setPicture] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ fullname?: string; phone?: string }>({})
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => (picture ? URL.createObjectURL(picture) : null), [picture])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    setFailed(false)
    getProfile(accessToken)
      .then((data) => {
        if (!alive) return
        setProfile(data)
        setFullname(data.fullname)
        setPhone(local(data.phone))
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, reload])

  async function save(changes: { fullname?: string; phone?: string; language?: Language; picture?: File | null }) {
    if (!accessToken || !profile) return false
    setSaving(true)
    setError("")
    try {
      await updateProfile(accessToken, {
        fullname: changes.fullname ?? profile.fullname,
        phone: changes.phone ?? profile.phone,
        preferred_language: changes.language ?? profile.preferred_language,
        picture: changes.picture ?? null,
      })
      const fresh = await getProfile(accessToken)
      setProfile(fresh)
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const number = toE164(phone.trim())
    const next: typeof errors = {}
    if (!fullname.trim()) next.fullname = t`Enter your full name`
    else next.fullname = tooLong(fullname, LIMITS.name)
    if (phone.trim() && !/^\+9665[013-9]\d{7}$/.test(number)) next.phone = t`Enter a Saudi mobile number that starts with 5.`
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    if (await save({ fullname: fullname.trim(), phone: phone.trim() ? number : undefined })) toast(t`The changes are saved.`)
  }

  async function chooseLanguage(next: Language) {
    // The interface changes at once; the account keeps it for messages too.
    setLang(next)
    await save({ language: next })
  }

  if (failed) {
    return (
      <Page title={<Trans>Account</Trans>} phoneStart="none">
        <LoadError title={<Trans>Could not load your account</Trans>} onRetry={() => setReload((n) => n + 1)} />
        <SecurityLinks />
      </Page>
    )
  }

  const photo = preview ?? profile?.picture_url ?? null
  const initial = Array.from(profile?.fullname.trim() ?? "")[0] ?? ""

  return (
    <Page title={<Trans>Account</Trans>} description={<Trans>Your details, language and account security.</Trans>} phoneStart="none">
      {profile === null ? (
        <LoadingList />
      ) : (
        <TwoColumns
          main={
            <>
              <Panel labelledBy="personal-title" className="gap-4">
                <PanelTitle id="personal-title">
                  <Trans>Personal information</Trans>
                </PanelTitle>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex size-[72px] flex-none items-center justify-center overflow-hidden rounded-full bg-secondary text-[28px] font-bold text-primary">
                    {photo ? <img src={photo} alt={t`Your photo`} className="size-full object-cover" /> : <span aria-hidden="true">{initial}</span>}
                  </span>
                  {picture ? (
                    <div className="flex min-w-0 flex-col gap-2">
                      <span className="text-[13px] text-muted-foreground">
                        <Trans>This is a preview of the photo before saving.</Trans>
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          disabled={saving}
                          onClick={async () => {
                            if (await save({ picture })) {
                              setPicture(null)
                              toast(t`Photo saved.`)
                            }
                          }}
                        >
                          <Trans>Save photo</Trans>
                        </Button>
                        <Button type="button" variant="outline" disabled={saving} onClick={() => setPicture(null)}>
                          <Trans>Cancel</Trans>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-col gap-2">
                      <Button type="button" variant="outline" className="self-start" onClick={() => input.current?.click()}>
                        <Camera aria-hidden="true" />
                        <Trans>Change photo</Trans>
                      </Button>
                      <span className="text-[13px] text-muted-foreground">
                        <Trans>A square JPG or PNG photo.</Trans>
                      </span>
                    </div>
                  )}
                  <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      setPicture(e.target.files?.[0] ?? null)
                      e.target.value = ""
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
                  <span>
                    <span className="text-muted-foreground">
                      <Trans>Role</Trans>
                    </span>{" "}
                    <strong className="font-semibold">{roleLabel(profile.role)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground">
                      <Trans>Status</Trans>
                    </span>
                    <WorkerStatusChip status={profile.status} />
                  </span>
                </div>
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                  <Field id="p-name" required label={<Trans>Full name</Trans>} error={errors.fullname}>
                    <Input id="p-name" maxLength={LIMITS.name} autoComplete="name" value={fullname} aria-invalid={errors.fullname ? true : undefined} onChange={(e) => setFullname(e.target.value)} />
                  </Field>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="p-email" className="text-sm font-semibold">
                        <Trans>Email</Trans>
                      </label>
                      {profile.email_verified_at && (
                        <span className="inline-flex h-[26px] items-center gap-1.5 border border-good-200 bg-good-50 px-2.5 text-[13px] font-semibold text-good-700">
                          <span aria-hidden="true" className="size-[7px] bg-good" />
                          <Trans>Verified</Trans>
                        </span>
                      )}
                    </div>
                    <Input id="p-email" dir="ltr" value={profile.email} readOnly className="bg-secondary text-muted-foreground" aria-describedby="p-email-hint" />
                    <span id="p-email-hint" className="text-[13px] text-muted-foreground">
                      <Trans>To change your email, contact support.</Trans>
                    </span>
                  </div>
                  <Field id="p-phone" optional label={<Trans>Mobile number</Trans>} error={errors.phone}>
                    <div dir="ltr" className="flex gap-2">
                      <span className="box-border inline-flex h-11 flex-none items-center border border-border bg-secondary px-3 text-[15px]">+966</span>
                      <Input id="p-phone" type="tel" dir="ltr" value={phone} aria-invalid={errors.phone ? true : undefined} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </Field>
                  {error && (
                    <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                      <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                      {error}
                    </p>
                  )}
                  <FormButtons>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Trans>Saving…</Trans> : <Trans>Save changes</Trans>}
                    </Button>
                  </FormButtons>
                </form>
              </Panel>
              <ManageLinks />
            </>
          }
          side={
            <>
              <Panel labelledBy="language-title" className="gap-4">
                <PanelTitle id="language-title">
                  <Trans>Language</Trans>
                </PanelTitle>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">
                    <Trans>Interface and message language</Trans>
                  </span>
                  <Segmented<Language>
                    label={t`Interface and message language`}
                    value={lang}
                    onChange={(next) => void chooseLanguage(next)}
                    options={[
                      { key: "ar", label: <span lang="ar">{LANGUAGE_NAMES.ar}</span> },
                      { key: "en", label: <span lang="en">{LANGUAGE_NAMES.en}</span> },
                    ]}
                  />
                </div>
                <span className="text-[13px] text-muted-foreground">
                  <Trans>The language and page direction change as soon as you choose.</Trans>
                </span>
              </Panel>
              <SecurityLinks />
            </>
          }
        />
      )}
    </Page>
  )
}
