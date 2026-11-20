import { useEffect, useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert, Plus } from "lucide-react"
import type { SupportTicket } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { createSupportTicket, getSupportTicket } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { LIMITS, tooLong } from "@/lib/limits"
import { useFormat } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Page } from "@/components/page"
import { Field, FormButtons, Panel, PanelTitle } from "@/components/panel"
import { FormCancel, FormPopup, useFormPopup } from "@/components/form-popup"
import { StatusBadge } from "@/components/place-shared"
import { EmptyState, LoadError, LoadingList } from "@/components/states"
import { toast } from "@/components/toast"

/** Support for Managers and Workers: their requests with the team's replies, and New request in a popup. */
export function UserSupport() {
  const { accessToken } = useAuth()
  const { date } = useFormat()
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    setFailed(false)
    getSupportTicket(accessToken)
      .then((list) => alive && setTickets(list.sort((a, b) => b.created_at.localeCompare(a.created_at))))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, reload])

  return (
    <Page
      title={<Trans>Support</Trans>}
      description={<Trans>Your request goes to the Amlak team and the reply appears here.</Trans>}
      phoneStart="back"
      phoneBack={{ to: "/profile" }}
      phoneEnd="none"
      actions={
        <Button type="button" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" />
          <Trans>New support request</Trans>
        </Button>
      }
    >
      {adding && accessToken && (
        <FormPopup
          title={<Trans>New support request</Trans>}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            setReload((n) => n + 1)
          }}
        >
          <SupportRequestForm token={accessToken} />
        </FormPopup>
      )}
      {failed ? (
        <LoadError title={<Trans>Could not load your requests</Trans>} onRetry={() => setReload((n) => n + 1)} />
      ) : tickets === null ? (
        <LoadingList />
      ) : (
        <Panel labelledBy="my-requests">
          <PanelTitle id="my-requests">
            <Trans>My requests</Trans>
          </PanelTitle>
          {tickets.length === 0 ? (
            <EmptyState card={false} title={<Trans>No requests yet</Trans>} text={<Trans>Requests you send appear here with the team’s reply.</Trans>} />
          ) : (
            <div className="flex flex-col gap-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="box-border flex min-w-0 flex-col gap-3 border border-border bg-card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-col leading-[1.5]">
                      <span dir="auto" className="font-semibold [overflow-wrap:anywhere]">
                        {ticket.subject}
                      </span>
                      <span className="text-[13px] text-muted-foreground">{date(ticket.created_at, { day: "numeric", month: "long" })}</span>
                    </span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  {ticket.admin_response && (
                    <p className="m-0 bg-secondary p-3.5 text-sm leading-[1.7]">
                      <strong className="font-semibold">
                        <Trans>Reply from the Amlak team:</Trans>
                      </strong>{" "}
                      <span dir="auto">{ticket.admin_response}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </Page>
  )
}

/** A new support request: a subject and the details. */
function SupportRequestForm({ token }: { token: string }) {
  const popup = useFormPopup()
  const [subject, setSubject] = useState("")
  const [details, setDetails] = useState("")
  const [errors, setErrors] = useState<{ subject?: string; details?: string }>({})
  const [formError, setFormError] = useState("")
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: typeof errors = {}
    if (!subject.trim()) next.subject = t`Write a subject.`
    else next.subject = tooLong(subject, LIMITS.title)
    if (!details.trim()) next.details = t`Write the details.`
    else next.details = tooLong(details, LIMITS.message)
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setSending(true)
    setFormError("")
    try {
      await createSupportTicket(token, { subject: subject.trim(), description: details.trim() })
      toast(t`Request sent to the Amlak team.`)
      popup?.saved()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field id="s-subject" required label={<Trans>Subject</Trans>} error={errors.subject}>
        <Input id="s-subject" dir="auto" maxLength={LIMITS.title} value={subject} aria-invalid={errors.subject ? true : undefined} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field id="s-details" required label={<Trans>Details</Trans>} error={errors.details}>
        <Textarea id="s-details" rows={4} dir="auto" maxLength={LIMITS.message} value={details} aria-invalid={errors.details ? true : undefined} onChange={(e) => setDetails(e.target.value)} />
      </Field>
      {formError && (
        <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {formError}
        </p>
      )}
      <FormButtons>
        <FormCancel to={{ to: "/support" }} />
        <Button type="submit" disabled={sending}>
          {sending ? <Trans>Sending…</Trans> : <Trans>Send request</Trans>}
        </Button>
      </FormButtons>
    </form>
  )
}
