
import { useEffect, useState } from "react"
import {
  createFileRoute,
  useParams,
} from "@tanstack/react-router"
import {
  CalendarDays,
  Clock3,
  Wallet,
  CheckCircle,
  XCircle,
  UserRoundCog,
  CheckCheck,
  X,
  Paperclip,
  Building2,
  Users,
  Wrench,
} from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"

import { useAuth } from "@/lib/auth"
import { errorMessage } from "@/lib/errors"
import {
  approveTicket,
  rejectTicket,
  reassignTicket,
  completeTicket,
  getTicketById,
  getAssetById,
  getPlace,
  getPlaceWorkers,
} from "@/lib/api"
import type { Asset, Place, PlaceWorker } from "@amlak/shared"


import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Page } from "@/components/page"
import { numberFormat } from "@/lib/format"
import { formatDate } from "@/lib/format"

export const Route = createFileRoute(
  "/_authenticated/ticket/$ticket_id",
)({
  component: TicketDetailPage,
})

type TicketAttachment = {
  id: string
  attachment_type: string
  file_url: string
  uploaded_by: string
  created_at: string
  updated_at: string
}

type Ticket = {
  id: string
  place_id: string
  asset_id: string
  periodic_maintenance_id: string | null
  ticket_type: string
  priority: string
  status: string
  description: string
  reporter_id: string
  assignee_id: string | null
  due_date: string | null
  is_overdue: boolean
  estimated_cost: number | null
  actual_cost: number | null
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  completed_at: string | null
  completion_notes: string | null
  created_at: string
  updated_at: string
  attachments?: TicketAttachment[]
}

type ActionType =
  | "approve"
  | "reject"
  | "reassign"
  | "complete"
  | null

function TicketDetailPage() {
  const { ticket_id } = useParams({
    from: "/_authenticated/ticket/$ticket_id",
  })

  const { accessToken, user } = useAuth()
  const { i18n } = useLingui()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [asset, setAsset] = useState<Asset | null>(null)
  // Loaded for Managers only: GET /places/{placeId}/workers is Manager-only.
  const [place, setPlace] = useState<Place | null>(null)
  const [placeWorkers, setPlaceWorkers] = useState<PlaceWorker[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [action, setAction] = useState<ActionType>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [assigneeId, setAssigneeId] = useState("")

  const [dueDate, setDueDate] = useState("")
  const [estimatedCost, setEstimatedCost] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [actualCost, setActualCost] = useState("")
  const [completionNotes, setCompletionNotes] = useState("")
  const [photos, setPhotos] = useState<File[]>([])

  const S = (value: string): React.CSSProperties =>
    Object.fromEntries(
      value.split(";").filter(Boolean).map((item) => {
        const [key, ...rest] = item.split(":")
        return [
          key.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
          rest.join(":").trim(),
        ]
      }),
    )

  // Show / hide sections using DOM
  function toggleSection(id: string) {
  const element = document.getElementById(id)
  if (!element) return

  const isHidden = element.style.display === "none"
  element.style.display = isHidden ? "block" : "none"
}

  useEffect(() => {
    let alive = true

    async function loadData() {
      if (!accessToken) return

      try {
        setLoading(true)
        setError(null)

        const ticketData = await getTicketById(accessToken, ticket_id)

        const selectedTicket = (
          Array.isArray(ticketData) ? ticketData[0] : ticketData
        ) as Ticket

        if (!selectedTicket) {
          throw new Error("Ticket not found")
        }

        if (!alive) return

        setTicket(selectedTicket)
        if (selectedTicket.asset_id) {
          try {
            const assetData = await getAssetById(
              accessToken,
              selectedTicket.asset_id,
            )

            if (alive) setAsset(assetData)
          } catch (assetError) {
            console.error("Failed to load asset:", assetError)
            if (alive) setAsset(null)
          }
        } else if (alive) {
          setAsset(null)
        }

        if (user?.role === "MANAGER") {
          try {
            const [placeData, workersData] = await Promise.all([
              getPlace(accessToken, selectedTicket.place_id),
              getPlaceWorkers(accessToken, selectedTicket.place_id),
            ])

            if (alive) {
              setPlace(placeData)
              setPlaceWorkers(workersData)
            }
          } catch (peopleError) {
            console.warn("Could not load the place's workers:", peopleError)
          }
        }
      } catch (err) {
        console.error("Failed to load ticket:", err)

        if (alive) {
          setError(
            errorMessage(err),
          )
        }
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadData()

    return () => {
      alive = false
    }
  }, [accessToken, ticket_id, user?.role])

  const loadTicketDetails = async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      setError(null)

      const ticketData = await getTicketById(accessToken, ticket_id)

      const selectedTicket = (
        Array.isArray(ticketData) ? ticketData[0] : ticketData
      ) as Ticket

      if (!selectedTicket) {
        throw new Error("Ticket not found")
      }

      setTicket(selectedTicket)

      if (selectedTicket.asset_id) {
        try {
          const assetData = await getAssetById(
            accessToken,
            selectedTicket.asset_id,
          )

          setAsset(assetData)
        } catch (assetError) {
          console.error("Failed to load asset:", assetError)
          setAsset(null)
        }
      } else {
        setAsset(null)
      }

    } catch (err) {
      console.error("Failed to load ticket:", err)

      setError(
        errorMessage(err),
      )
    } finally {
      setLoading(false)
    }
  }

  const resetActionForm = () => {
    setAction(null)
    setActionError(null)
    setAssigneeId("")
    setDueDate("")
    setEstimatedCost("")
    setRejectionReason("")
    setActualCost("")
    setCompletionNotes("")
    setPhotos([])

    document.querySelectorAll(".am-btn").forEach((btn) => {
      ;(btn as HTMLElement).style.display = ""
    })
  }

  const handleApprove = async () => {
    if (!accessToken || !assigneeId || !dueDate) return

    try {
      setActionLoading(true)
      setActionError(null)

      await approveTicket(accessToken, ticket_id, {
        assignee_id: assigneeId,
        due_date: dueDate,
        // Optional in the API: send it only when filled.
        ...(estimatedCost.trim() === ""
          ? {}
          : { estimated_cost: Number(estimatedCost) }),
      })

      resetActionForm()
      await loadTicketDetails()
    } catch (err) {
      setActionError(
        errorMessage(err),
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!accessToken || !rejectionReason.trim()) return

    try {
      setActionLoading(true)
      setActionError(null)

      await rejectTicket(accessToken, ticket_id, {
        reason: rejectionReason,
      })

      resetActionForm()
      await loadTicketDetails()
    } catch (err) {
      setActionError(
        errorMessage(err),
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleReassign = async () => {
    if (!accessToken || !assigneeId || !dueDate) return

    try {
      setActionLoading(true)
      setActionError(null)

      await reassignTicket(accessToken, ticket_id, {
        assignee_id: assigneeId,
        due_date: dueDate,
      })

      resetActionForm()
      await loadTicketDetails()
    } catch (err) {
      setActionError(
        errorMessage(err),
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplete = async () => {
    if (
      !accessToken ||
      actualCost === "" ||
      Number(actualCost) < 0 ||
      photos.length < 1 ||
      photos.length > 5
    ) {
      return
    }

    try {
      setActionLoading(true)
      setActionError(null)

      await completeTicket(accessToken, ticket_id, {
        actual_cost: Number(actualCost),
        completion_notes: completionNotes,
        photos,
      })

      resetActionForm()
      await loadTicketDetails()
    } catch (err) {
      setActionError(
        errorMessage(err),
      )
    } finally {
      setActionLoading(false)
    }
  }

  const openAction = (nextAction: ActionType) => {
    setAction(nextAction)
    setActionError(null)

    document.querySelectorAll(".am-btn").forEach((btn) => {
      ;(btn as HTMLElement).style.display = "none"
    })
  }

  const date = (value: string | null | undefined) => {
    if (!value) return "—"

    // A date without a time (due_date) is shown as a date only.
    if (value.length === 10) {
      return formatDate(value, i18n.locale, { dateStyle: "medium" })
    }

    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) return value

    return formatDate(parsed, i18n.locale, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  }

  const money = (value: number | null) => {
    if (value === null || value === undefined) return "—"

    return numberFormat(i18n.locale, {
      style: "currency",
      currency: place?.currency ?? "SAR",
    }).format(Number(value))
  }

  const statusLabels: Record<string, string> = {
    PENDING_REVIEW: t`Waiting for review`,
    PENDING: t`Pending`,
    APPROVED: t`Approved`,
    REJECTED: t`Rejected`,
    IN_PROGRESS: t`In progress`,
    COMPLETED: t`Completed`,
    CANCELLED: t`Cancelled`,
  }

  const priorityLabels: Record<string, string> = {
    LOW: t`Low`,
    MEDIUM: t`Medium`,
    HIGH: t`High`,
    URGENT: t`Urgent`,
  }

  const typeLabels: Record<string, string> = {
    CORRECTIVE: t`Corrective maintenance`,
    PREVENTIVE: t`Preventive maintenance`,
  }

  const attachmentTypeLabels: Record<string, string> = {
    DAMAGE: t`Damage photos`,
    BEFORE: t`Before photos`,
    AFTER: t`After photos`,
    COMPLETION: t`Completion photos`,
  }

  const statusColors: Record<string, string> = {
    PENDING_REVIEW: "#d97706",
    PENDING: "#d97706",
    APPROVED: "#2563eb",
    REJECTED: "#dc2626",
    IN_PROGRESS: "#7c3aed",
    COMPLETED: "#16a34a",
    CANCELLED: "#6b7280",
  }

  const InfoItem = ({
    label,
    value,
  }: {
    label: string
    value: React.ReactNode
  }) => (
    <div
      style={S(
        "display:flex; flex-direction:column; gap:6px; min-width:0",
      )}
    >
      <span style={S("font-size:12px; color:var(--muted-foreground)")}>
        {label}
      </span>

      <strong style={S("font-size:14px; overflow-wrap:anywhere")}>
        {value || "—"}
      </strong>
    </div>
  )

  const Section = ({
    title,
    icon,
    children,
  }: {
    title: string
    icon?: React.ReactNode
    children: React.ReactNode
  }) => (
    <section
      style={S(
        "padding:20px; border:1px solid var(--border); background:var(--card); display:flex; flex-direction:column; gap:20px",
      )}
    >
      <div style={S("display:flex; align-items:center; gap:9px")}>
        {icon}

        <h2 style={S("font-size:16px; font-weight:700; margin:0")}>
          {title}
        </h2>
      </div>

      {children}
    </section>
  )

  const Grid = ({ children }: { children: React.ReactNode }) => (
    <div
      style={S(
        "display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:20px",
      )}
    >
      {children}
    </div>
  )

  const fieldStyle = S(
    "width:100%; min-height:40px; padding:9px 12px; border:1px solid var(--border); background:var(--background); color:var(--foreground)",
  )

  const labelStyle = S(
    "display:block; font-size:13px; font-weight:600; margin-bottom:7px",
  )

  const today = new Date().toISOString().slice(0, 10)

  const parent = {
    label: user?.role === "WORKER" ? <Trans>My tasks</Trans> : <Trans>Maintenance tickets</Trans>,
    link: { to: "/tickets" },
  } as const

  if (loading) {
    return (
      <Page title={<Trans>Maintenance ticket</Trans>} parent={parent}>
        <p style={S("margin:0; color:var(--muted-foreground)")}>
          <Trans>Loading the ticket…</Trans>
        </p>
      </Page>
    )
  }

  if (error || !ticket) {
    return (
      <Page title={<Trans>Maintenance ticket</Trans>} parent={parent}>
        <p role="alert" style={S("margin:0; color:var(--destructive)")}>
          {error || t`Ticket not found`}
        </p>
      </Page>
    )
  }

  // The API lets only the place's Manager review and reassign, and only the
  // assignee complete; offer only the buttons that can work.
  const isPlaceManager =
    user?.role === "MANAGER" && !!place && place.owner_id === user.id
  const isAssignee = !!ticket.assignee_id && ticket.assignee_id === user?.id
  const canReview = isPlaceManager && ticket.status === "PENDING_REVIEW"
  const canReassign = isPlaceManager && ticket.status === "APPROVED"
  const canComplete = isAssignee && ticket.status === "APPROVED"
  const hasActions = canReview || canReassign || canComplete

  const workerNames = new Map(
    placeWorkers.map((placeWorker) => [
      placeWorker.worker.id,
      placeWorker.worker.fullname,
    ]),
  )
  const personName = (id: string | null | undefined) => {
    if (!id) return "—"
    if (id === user?.id) return t`You`
    return workerNames.get(id) ?? t`Another team member`
  }

  // Who can take the work: the place's owner and its ACTIVE workers.
  const assigneeOptions = place
    ? [
        { id: place.owner_id, label: t`You (owner)` },
        ...placeWorkers
          .filter((placeWorker) => placeWorker.worker.status === "ACTIVE")
          .map((placeWorker) => ({
            id: placeWorker.worker.id,
            label: placeWorker.worker.fullname,
          })),
      ]
    : []

  return (
    <Page
      title={<Trans>Maintenance ticket</Trans>}
      description={ticket.description || t`Maintenance ticket`}
      parent={parent}
      phoneTitle={<Trans>Maintenance ticket</Trans>}
      phoneSubtitle={ticket.description || undefined}
      // The review screen has its own buttons at the bottom; no tabs there.
      tabs={!canReview}
      actions={
        <span
          style={{
            padding: "7px 14px",
            color: statusColors[ticket.status] || "var(--foreground)",
            background: `${statusColors[ticket.status] || "#6b7280"}18`,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {statusLabels[ticket.status] || ticket.status}
        </span>
      }
    >
      {/* First section: always visible */}
      <Section title={t`Ticket information`}>
        <Grid>
          <InfoItem
            label={t`Maintenance type`}
            value={typeLabels[ticket.ticket_type] || ticket.ticket_type}
          />

          <InfoItem
            label={t`Priority`}
            value={priorityLabels[ticket.priority] || ticket.priority}
          />

          <InfoItem
            label={t`Status`}
            value={statusLabels[ticket.status] || ticket.status}
          />

          <InfoItem
            label={t`Due date`}
            value={date(ticket.due_date)}
          />

          <InfoItem
            label={t`Overdue?`}
            value={
              ticket.is_overdue ? (
                <span style={S("color:#dc2626")}><Trans>Overdue</Trans></span>
              ) : (
                t`Not overdue`
              )
            }
          />

          <InfoItem
            label={t`Created`}
            value={date(ticket.created_at)}
          />

          <InfoItem
            label={t`Last updated`}
            value={date(ticket.updated_at)}
          />
        </Grid>

        <div
          style={S(
            "border-top:1px solid var(--border); padding-top:16px",
          )}
        >
          <InfoItem label={t`Description`} value={ticket.description} />
        </div>
      </Section>

      <div style={S("display: flex; gap: 10px; flex-wrap: wrap; align-items: center")}>
  {[
    { id: "asset-section", title: t`Asset`, icon: <Building2 size={16} /> },
    { id: "cost-section", title: t`Costs`, icon: <Wallet size={16} /> },
    { id: "review-section", title: t`Review`, icon: <CheckCircle size={16} /> },
    { id: "completion-section", title: t`Completion`, icon: <CheckCheck size={16} /> },
    { id: "people-section", title: t`People`, icon: <Users size={16} /> },
    { id: "timeline-section", title: t`Timeline`, icon: <Clock3 size={16} /> },
    { id: "actions-section", title: t`Actions`, icon: <Wrench size={16} /> },
    { id: "attachments-section", title: t`Attachments`, icon: <Paperclip size={16} /> },
  ]
    .filter((section) => section.id !== "actions-section" || hasActions)
    .map((section) => (
    <Button
  key={section.id}
  type="button"
  variant="outline"
  size="sm"
  className="am-btn"
  onClick={() => toggleSection(section.id)}
  style={S(
    "height: 40px; padding: 0 16px; gap: 8px; background: transparent; border: 1px solid var(--border); color: var(--foreground)"
  )}
>
  {section.icon}
  {section.title}
</Button>
  ))}
</div>

      {/* Asset */}
      <div id="asset-section" style={{ display: "none" }}>
        <Section title={t`Asset`}>
          {asset ? (
            <Grid>
              <InfoItem label={t`Asset name`} value={asset.name} />
              <InfoItem label={t`Asset type`} value={asset.type} />
              <InfoItem label={t`Asset status`} value={asset.status} />
            </Grid>
          ) : (
            <p
              style={S(
                "font-size:13px; color:var(--muted-foreground); margin:0",
              )}
            >
              <Trans>This ticket has no asset.</Trans>
            </p>
          )}
        </Section>
      </div>

      {/* Costs */}
      <div id="cost-section" style={{ display: "none" }}>
        <Section title={t`Costs`} icon={<Wallet size={18} />}>
          <Grid>
            <InfoItem
              label={t`Estimated cost`}
              value={money(ticket.estimated_cost)}
            />

            <InfoItem
              label={t`Actual cost`}
              value={money(ticket.actual_cost)}
            />
          </Grid>
        </Section>
      </div>

      {/* Review */}
      <div id="review-section" style={{ display: "none" }}>
        <Section title={t`Review`}>
          <Grid>
            <InfoItem
              label={t`Reviewed by`}
              value={
                ticket.reviewed_by ? personName(ticket.reviewed_by) : null
              }
            />

            <InfoItem
              label={t`Reviewed on`}
              value={date(ticket.reviewed_at)}
            />
          </Grid>

          {ticket.rejection_reason && (
            <div
              style={S(
                "padding:14px; background:#dc262610; display:flex; flex-direction:column; gap:7px",
              )}
            >
              <strong style={S("font-size:13px; color:#dc2626")}>
                <Trans>Reason for rejection</Trans>
              </strong>

              <p style={S("font-size:14px; margin:0")}>
                {ticket.rejection_reason}
              </p>
            </div>
          )}
        </Section>
      </div>

      {/* Completion */}
      <div id="completion-section" style={{ display: "none" }}>
        <Section
          title={t`Completion`}
          icon={<CalendarDays size={18} />}
        >
          <Grid>
            <InfoItem
              label={t`Completed on`}
              value={date(ticket.completed_at)}
            />

            <InfoItem
              label={t`Completion notes`}
              value={ticket.completion_notes}
            />
          </Grid>
        </Section>
      </div>

      {/* People */}
      <div id="people-section" style={{ display: "none" }}>
        <Section title={t`People`}>
          <Grid>
            <InfoItem
              label={t`Reported by`}
              value={personName(ticket.reporter_id)}
            />
            <InfoItem
              label={t`Assignee`}
              value={ticket.assignee_id ? personName(ticket.assignee_id) : null}
            />
          </Grid>
        </Section>
      </div>

      {/* Timeline */}
      <div id="timeline-section" style={{ display: "none" }}>
        <Section title={t`Timeline`} icon={<Clock3 size={18} />}>
          <Grid>
            <InfoItem
              label={t`Created`}
              value={date(ticket.created_at)}
            />

            <InfoItem
              label={t`Last updated`}
              value={date(ticket.updated_at)}
            />

            <InfoItem
              label={t`Reviewed on`}
              value={date(ticket.reviewed_at)}
            />

            <InfoItem
              label={t`Completed on`}
              value={date(ticket.completed_at)}
            />
          </Grid>
        </Section>
      </div>

      {/* Actions */}
      <div id="actions-section" style={{ display: "none" }}>
        <Card
          className="am-lift"
          style={S(
            "padding:0; border:1px solid var(--border); overflow:hidden; gap:0",
          )}
        >
          <CardHeader
            style={S(
              "padding:20px; border-bottom:1px solid var(--border); text-align:center",
            )}
          >
            <CardTitle
              style={S(
                "font-size:17px; font-weight:750; width:100%; text-align:center",
              )}
            >
              <Trans>Actions</Trans>
            </CardTitle>
          </CardHeader>

          <div
            style={S(
              "display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:12px; padding:24px 20px",
            )}
          >
            {canReview && (
              <>
                <Button
                  variant="default"
                  className="am-btn"
                  onClick={() => openAction("approve")}
                  style={S("height:42px; padding:0 20px; gap:8px")}
                >
                  <CheckCircle size={17} />
                  <Trans>Approve ticket</Trans>
                </Button>

                <Button
                  variant="outline"
                  className="am-btn"
                  onClick={() => openAction("reject")}
                  style={S(
                    "height:42px; padding:0 20px; gap:8px; color:var(--destructive); border-color:var(--destructive)",
                  )}
                >
                  <XCircle size={17} />
                  <Trans>Reject ticket</Trans>
                </Button>
              </>
            )}

            {canReassign && (
              <Button
                variant="outline"
                className="am-btn"
                onClick={() => openAction("reassign")}
                style={S("height:42px; padding:0 20px; gap:8px")}
              >
                <UserRoundCog size={17} />
                <Trans>Reassign</Trans>
              </Button>
            )}

            {canComplete && (
              <>
                <Button
                  variant="outline"
                  className="am-btn"
                  onClick={() => openAction("complete")}
                  style={S(
                    "height:42px; padding:0 20px; gap:8px; color:var(--chart-2); border-color:var(--chart-2)",
                  )}
                >
                  <CheckCheck size={17} />
                  <Trans>Complete ticket</Trans>
                </Button>
              </>
            )}
          </div>

          {action && (
            <div
              style={S(
                "margin:0 20px 20px; padding:18px; border:1px solid var(--border); display:flex; flex-direction:column; gap:16px",
              )}
            >
              <div
                style={S(
                  "display:flex; align-items:center; justify-content:space-between; gap:12px",
                )}
              >
                <strong style={S("font-size:15px")}>
                  {action === "approve" && t`Approve ticket`}
                  {action === "reject" && t`Reject ticket`}
                  {action === "reassign" && t`Reassign`}
                  {action === "complete" && t`Complete ticket`}
                </strong>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetActionForm}
                  disabled={actionLoading}
                  aria-label={t`Close`}
                >
                  <X size={17} />
                </Button>
              </div>

              {(action === "approve" || action === "reassign") && (
                <div>
                  <label htmlFor="ticket-assignee" style={labelStyle}>
                    {t`Assignee`}
                  </label>

                  <select
                    id="ticket-assignee"
                    value={assigneeId}
                    onChange={(event) => setAssigneeId(event.target.value)}
                    style={fieldStyle}
                  >
                    <option value="">{t`Choose who does the work`}</option>
                    {assigneeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(action === "approve" || action === "reassign") && (
                <div>
                  <label style={labelStyle}><Trans>Due date</Trans></label>

                  <input
                    type="date"
                    min={today}
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    style={fieldStyle}
                  />
                </div>
              )}

              {action === "approve" && (
                <div>
                  <label style={labelStyle}>{t`Estimated cost (optional)`}</label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={estimatedCost}
                    onChange={(event) =>
                      setEstimatedCost(event.target.value)
                    }
                    placeholder="0.00"
                    style={fieldStyle}
                  />
                </div>
              )}

              {action === "reject" && (
                <div>
                  <label style={labelStyle}><Trans>Reason for rejection</Trans></label>

                  <textarea
                    value={rejectionReason}
                    onChange={(event) =>
                      setRejectionReason(event.target.value)
                    }
                    placeholder={t`Why is this ticket rejected?`}
                    rows={4}
                    style={{ ...fieldStyle, resize: "vertical" }}
                  />
                </div>
              )}

              {action === "complete" && (
                <>
                  <div>
                    <label style={labelStyle}><Trans>Actual cost</Trans></label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={actualCost}
                      onChange={(event) =>
                        setActualCost(event.target.value)
                      }
                      placeholder="0.00"
                      style={fieldStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <Trans>Completion notes (optional)</Trans>
                    </label>

                    <textarea
                      value={completionNotes}
                      onChange={(event) =>
                        setCompletionNotes(event.target.value)
                      }
                      placeholder={t`Add completion notes`}
                      rows={3}
                      style={{ ...fieldStyle, resize: "vertical" }}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <Trans>Completion photos (1 to 5)</Trans>
                    </label>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        setPhotos(
                          Array.from(event.target.files ?? []).slice(0, 5),
                        )
                      }}
                      style={fieldStyle}
                    />

                    <p
                      style={S(
                        "font-size:12px; color:var(--muted-foreground); margin:6px 0 0",
                      )}
                    >
                      <Trans>{photos.length} of 5 photos chosen</Trans>
                    </p>
                  </div>
                </>
              )}

              {actionError && (
                <p
                  style={S(
                    "margin:0; color:var(--destructive); font-size:13px",
                  )}
                >
                  {actionError}
                </p>
              )}

              <div style={S("display:flex; flex-wrap:wrap; gap:10px")}>
                {action === "approve" && (
                  <Button
                    onClick={handleApprove}
                    disabled={
                      actionLoading ||
                      !assigneeId.trim() ||
                      !dueDate ||
                      Number(estimatedCost) < 0
                    }
                  >
                    {actionLoading
                      ? t`Working…`
                      : t`Confirm approval`}
                  </Button>
                )}

                {action === "reject" && (
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={actionLoading || !rejectionReason.trim()}
                  >
                    {actionLoading
                      ? t`Working…`
                      : t`Confirm rejection`}
                  </Button>
                )}

                {action === "reassign" && (
                  <Button
                    onClick={handleReassign}
                    disabled={
                      actionLoading ||
                      !assigneeId.trim() ||
                      !dueDate
                    }
                  >
                    {actionLoading
                      ? t`Working…`
                      : t`Confirm reassignment`}
                  </Button>
                )}

                {action === "complete" && (
                  <Button
                    onClick={handleComplete}
                    disabled={
                      actionLoading ||
                      actualCost === "" ||
                      Number(actualCost) < 0 ||
                      photos.length < 1
                    }
                  >
                    {actionLoading
                      ? t`Working…`
                      : t`Confirm completion`}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={resetActionForm}
                  disabled={actionLoading}
                >
                  <Trans>Cancel</Trans>
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Attachments - Last section */}
      <div id="attachments-section" style={{ display: "none" }}>
        <Section title={t`Attachments`} icon={<Paperclip size={18} />}>
          {ticket.attachments && ticket.attachments.length > 0 ? (
            <>
              <p
                style={S(
                  "font-size:13px; color:var(--muted-foreground); margin:0",
                )}
              >
                <Trans>Attachments: {ticket.attachments.length}</Trans>
              </p>

              <div
                style={S(
                  "display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:18px",
                )}
              >
                {ticket.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    style={S(
                      "min-width:0; border:1px solid var(--border); overflow:hidden; display:flex; flex-direction:column; background:var(--background)",
                    )}
                  >
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t`Open the full-size photo`}
                      style={S(
                        "display:block; width:100%; height:200px; background:var(--muted); overflow:hidden",
                      )}
                    >
                      <img
                        src={attachment.file_url}
                        alt={
                          attachmentTypeLabels[attachment.attachment_type] ||
                          attachment.attachment_type
                        }
                        loading="lazy"
                        style={S(
                          "width:100%; height:100%; object-fit:cover; display:block",
                        )}
                      />
                    </a>

                    <div
                      style={S(
                        "padding:12px; display:flex; flex-direction:column; gap:8px",
                      )}
                    >
                      <strong style={S("font-size:14px")}>
                        {attachmentTypeLabels[attachment.attachment_type] ||
                          attachment.attachment_type}
                      </strong>

                      <span
                        style={S(
                          "font-size:12px; color:var(--muted-foreground)",
                        )}
                      >
                        <Trans>Uploaded: {date(attachment.created_at)}</Trans>
                      </span>

                      <span
                        style={S(
                          "font-size:11px; color:var(--muted-foreground); overflow-wrap:anywhere",
                        )}
                      >
                        {attachment.attachment_type}
                      </span>

                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={S(
                          "font-size:13px; color:var(--primary); text-decoration:underline",
                        )}
                      >
                        <Trans>View full size</Trans>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p
              style={S(
                "font-size:13px; color:var(--muted-foreground); margin:0",
              )}
            >
              <Trans>This ticket has no attachments.</Trans>
            </p>
          )}
        </Section>
      </div>
    </Page>
  )
}
