import { useState, type FormEvent } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { plural, t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"
import { storedUser, useAuth } from "@/lib/auth"
import { sendAnnouncement } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { LIMITS, tooLong } from "@/lib/limits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Page } from "@/components/page"
import { Field, FieldNeed, FormButtons, Panel, PanelTitle, Segmented, TwoColumns } from "@/components/panel"
import { toast } from "@/components/toast"

export const Route = createFileRoute("/_authenticated/announcements")({
  beforeLoad: () => {
    if (storedUser()?.role !== "ADMIN") throw redirect({ to: "/home" })
  },
  component: Announcements,
})

type Audience = "EVERYONE" | "MANAGER" | "WORKER"
type FieldKey = "titleEn" | "messageEn" | "titleAr" | "messageAr"

/**
 * A new announcement, delivered as an in-app notification. Each user reads
 * it in their own language, so it is written in both.
 */
function Announcements() {
  const { accessToken } = useAuth()
  const [audience, setAudience] = useState<Audience>("EVERYONE")
  const [titleEn, setTitleEn] = useState("")
  const [messageEn, setMessageEn] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [messageAr, setMessageAr] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const next: Partial<Record<FieldKey, string>> = {}
    next.titleEn = titleEn.trim() ? tooLong(titleEn, LIMITS.title) : t`Write the title in English.`
    next.messageEn = messageEn.trim() ? tooLong(messageEn, LIMITS.message) : t`Write the text in English.`
    next.titleAr = titleAr.trim() ? tooLong(titleAr, LIMITS.title) : t`Write the title in Arabic.`
    next.messageAr = messageAr.trim() ? tooLong(messageAr, LIMITS.message) : t`Write the text in Arabic.`
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setSending(true)
    setError("")
    try {
      const text = {
        title_en: titleEn.trim(),
        message_en: messageEn.trim(),
        title_ar: titleAr.trim(),
        message_ar: messageAr.trim(),
      }
      // "Everyone" is the managers and the workers: one request per role.
      const roles = audience === "EVERYONE" ? (["MANAGER", "WORKER"] as const) : [audience]
      let count = 0
      for (const role of roles) count += (await sendAnnouncement(accessToken, { role, ...text })).recipient_count
      toast(plural(count, { 0: "Sent to no one: no active users.", one: "Sent to one user.", other: "Sent to # users." }))
      setTitleEn("")
      setMessageEn("")
      setTitleAr("")
      setMessageAr("")
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const invalid = (key: FieldKey, id: string) =>
    errors[key] ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {}

  return (
    <Page
      title={<Trans>Announcements</Trans>}
      description={<Trans>Arrives as an in-app notification.</Trans>}
      phoneStart="logo"
      bell={false}
      phoneEnd="none"
    >
      <TwoColumns
        main={
          <Panel labelledBy="new-announcement" className="gap-4">
            <PanelTitle id="new-announcement">
              <Trans>New announcement</Trans>
            </PanelTitle>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">
                  <Trans>Send to</Trans><FieldNeed required />
                </span>
                <div className="[&>div]:grid-cols-3">
                  <Segmented
                    label={t`Send to`}
                    value={audience}
                    onChange={setAudience}
                    options={[
                      { key: "EVERYONE", label: <Trans>Everyone</Trans> },
                      { key: "MANAGER", label: <Trans>Managers</Trans> },
                      { key: "WORKER", label: <Trans>Workers</Trans> },
                    ]}
                  />
                </div>
              </div>
              <Field id="a-title-en" required label={<Trans>Title in English</Trans>} error={errors.titleEn}>
                <Input id="a-title-en" maxLength={LIMITS.title} lang="en" dir="ltr" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} {...invalid("titleEn", "a-title-en")} />
              </Field>
              <Field id="a-text-en" required label={<Trans>Text in English</Trans>} error={errors.messageEn}>
                <Textarea id="a-text-en" maxLength={LIMITS.message} lang="en" dir="ltr" rows={3} value={messageEn} onChange={(e) => setMessageEn(e.target.value)} {...invalid("messageEn", "a-text-en")} />
              </Field>
              <Field id="a-title-ar" required label={<Trans>Title in Arabic</Trans>} error={errors.titleAr}>
                <Input id="a-title-ar" maxLength={LIMITS.title} lang="ar" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} {...invalid("titleAr", "a-title-ar")} />
              </Field>
              <Field id="a-text-ar" required label={<Trans>Text in Arabic</Trans>} error={errors.messageAr}>
                <Textarea id="a-text-ar" maxLength={LIMITS.message} lang="ar" dir="rtl" rows={3} value={messageAr} onChange={(e) => setMessageAr(e.target.value)} {...invalid("messageAr", "a-text-ar")} />
              </Field>
              {error && (
                <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                  <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                  {error}
                </p>
              )}
              <FormButtons>
                <Button type="submit" disabled={sending}>
                  {sending ? <Trans>Sending…</Trans> : <Trans>Send announcement</Trans>}
                </Button>
              </FormButtons>
            </form>
          </Panel>
        }
      />
    </Page>
  )
}
