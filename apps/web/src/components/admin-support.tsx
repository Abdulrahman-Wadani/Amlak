import { useEffect, useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Check, CircleAlert } from "lucide-react"
import type { SupportTicket, User } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { apiAllPages, getSupportTicket, resolveSupportTicket } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { useFormat } from "@/lib/format"
import { roleLabel } from "@/lib/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Page } from "@/components/page"
import { Field, FilterTabs, FormButtons, Panel, TwoColumns } from "@/components/panel"
import { StatusBadge } from "@/components/place-shared"
import { EmptyState, LoadError, LoadingList } from "@/components/states"
import { toast } from "@/components/toast"

type Filter = "OPEN" | "RESOLVED"

/** Support requests for the Admin: open and resolved, one request open with its reply. */
export function AdminSupport() {
  const { accessToken } = useAuth()
  const { date } = useFormat()
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null)
  const [people, setPeople] = useState<Record<string, User>>({})
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [filter, setFilter] = useState<Filter>("OPEN")
  const [selected, setSelected] = useState<string | null>(null)
  const [reply, setReply] = useState("")
  const [replyError, setReplyError] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    setFailed(false)
    getSupportTicket(accessToken)
      .then((list) => alive && setTickets(list.sort((a, b) => b.created_at.localeCompare(a.created_at))))
      .catch(() => alive && setFailed(true))
    apiAllPages<User>("/users", accessToken)
      .then((list) => alive && setPeople(Object.fromEntries(list.map((u) => [u.id, u]))))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [accessToken, reload])

  const shown = tickets?.filter((ticket) => ticket.status === filter) ?? []
  const current = shown.find((ticket) => ticket.id === selected) ?? shown[0] ?? null
  const count = (key: Filter) => tickets?.filter((ticket) => ticket.status === key).length ?? 0
  const who = (ticket: SupportTicket) => {
    const person = people[ticket.user_id]
    return person ? t`${person.fullname}, ${roleLabel(person.role)}` : ""
  }

  async function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !current) return
    if (!reply.trim()) {
      setReplyError(t`Write the reply.`)
      return
    }
    setReplyError("")
    setBusy(true)
    setError("")
    try {
      await resolveSupportTicket(accessToken, current.id, reply.trim())
      setReply("")
      setSelected(null)
      toast(t`Request resolved and the reply sent.`)
      setReload((n) => n + 1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const openCount = count("OPEN")
  return (
    <Page
      title={<Trans>Support requests</Trans>}
      description={tickets ? <Trans>{openCount} open.</Trans> : undefined}
      phoneStart="logo"
      bell={false}
      phoneEnd="none"
    >
      <FilterTabs
        label={t`Filter by status`}
        value={filter}
        onChange={(key) => {
          setFilter(key)
          setSelected(null)
        }}
        tabs={[
          { key: "OPEN", label: <Trans>Open</Trans>, count: openCount },
          { key: "RESOLVED", label: <Trans>Resolved</Trans>, count: count("RESOLVED") },
        ]}
      />
      {failed ? (
        <LoadError title={<Trans>Could not load support requests</Trans>} onRetry={() => setReload((n) => n + 1)} />
      ) : tickets === null ? (
        <LoadingList />
      ) : !current ? (
        <EmptyState
          title={filter === "OPEN" ? <Trans>No open requests</Trans> : <Trans>No resolved requests yet</Trans>}
          text={filter === "OPEN" ? <Trans>New requests from managers and workers appear here.</Trans> : undefined}
        />
      ) : (
        <TwoColumns
          main={
            <Panel labelledBy="request-title" className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col leading-[1.5]">
                  <h2 id="request-title" dir="auto" className="m-0 text-base font-semibold">
                    {current.subject}
                  </h2>
                  <span className="text-[13px] text-muted-foreground">
                    {[who(current), people[current.user_id]?.email].filter(Boolean).join(t`, `)}
                  </span>
                </div>
                <StatusBadge status={current.status} />
              </div>
              <p dir="auto" className="m-0 text-[15px] leading-[1.7] whitespace-pre-line">
                {current.description}
              </p>
              {current.status === "RESOLVED" ? (
                <p className="m-0 bg-secondary p-3.5 text-sm leading-[1.7]">
                  <strong className="font-semibold">
                    <Trans>Reply from the Amlak team:</Trans>
                  </strong>{" "}
                  <span dir="auto">{current.admin_response}</span>
                </p>
              ) : (
                <form onSubmit={resolve} noValidate className="flex flex-col gap-3">
                  <Field id="reply" label={<Trans>Reply</Trans>} error={replyError}>
                    <Textarea id="reply" rows={4} dir="auto" value={reply} aria-invalid={replyError ? true : undefined} onChange={(e) => setReply(e.target.value)} />
                  </Field>
                  {error && (
                    <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                      <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                      {error}
                    </p>
                  )}
                  <FormButtons>
                    <Button type="submit" disabled={busy}>
                      <Check aria-hidden="true" />
                      {busy ? <Trans>Sending…</Trans> : <Trans>Resolve and send reply</Trans>}
                    </Button>
                  </FormButtons>
                </form>
              )}
            </Panel>
          }
          side={
            <div className="flex flex-col gap-3">
              {shown.map((ticket) => {
                const on = ticket.id === current.id
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setSelected(ticket.id)
                      setReply("")
                      setReplyError("")
                    }}
                    className={`am-lift box-border flex min-w-0 cursor-pointer flex-col gap-1 border bg-card p-3.5 text-start shadow-sm ${on ? "border-primary outline-1 outline-primary" : "border-border"}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span dir="auto" className="min-w-0 font-semibold [overflow-wrap:anywhere]">
                        {ticket.subject}
                      </span>
                      <StatusBadge status={ticket.status} />
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {[who(ticket), date(ticket.created_at, { day: "numeric", month: "long" })].filter(Boolean).join(t`, `)}
                    </span>
                  </button>
                )
              })}
            </div>
          }
        />
      )}
    </Page>
  )
}
