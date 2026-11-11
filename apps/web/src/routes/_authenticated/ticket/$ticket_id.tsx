import { useEffect, useState } from "react"
import {
  createFileRoute,
  useParams,
  Link,
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
} from "lucide-react"
import { Trans } from "@lingui/react/macro"

import { useAuth } from "@/lib/auth"
import { approveTicket,
  rejectTicket,
  reassignTicket,
  completeTicket,
getTicketById, getAssetById, getWorkerById } from "@/lib/api"
import type { Asset } from "@amlak/shared"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute(
  "/_authenticated/ticket/$ticket_id",
)({
  component: TicketDetailPage,
})

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
}

type ActionType = "approve" | "reject" | "reassign" | "complete" | null

function TicketDetailPage() {
  const { ticket_id } = useParams({
    from: "/_authenticated/ticket/$ticket_id",
  })
  const { accessToken } = useAuth()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [reporterName, setReporterName] = useState<string | null>(null)
  const [assigneeName, setAssigneeName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [action, setAction] = useState<ActionType>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [assigneeId] = useState(() => {
    if (typeof window === "undefined") return ""
    try {
      const authUser = sessionStorage.getItem("authUser")
      return authUser ? JSON.parse(authUser).id ?? "" : ""
    } catch {
      return ""
    }
  })
  const [dueDate, setDueDate] = useState("")
  const [estimatedCost, setEstimatedCost] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [actualCost, setActualCost] = useState("")
  const [completionNotes, setCompletionNotes] = useState("")
  const [photos, setPhotos] = useState<File[]>([])

  const API_URL = import.meta.env.VITE_API_URL

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

  const loadTicketDetails = async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      setError(null)

      const ticketData = await getTicketById(accessToken, ticket_id)
      const selectedTicket = (
        Array.isArray(ticketData) ? ticketData[0] : ticketData
      ) as Ticket

      if (!selectedTicket) throw new Error("Ticket not found")
      setTicket(selectedTicket)

      if (selectedTicket.asset_id) {
        try {
          const assetData = await getAssetById(accessToken, selectedTicket.asset_id)
          setAsset(assetData)
        } catch (assetError) {
          console.error("Failed to load asset:", assetError)
          setAsset(null)
        }
      } else {
        setAsset(null)
      }

      // Worker names are supplementary; lookup failures must not block ticket details.
      setReporterName(selectedTicket.reporter_id)
      setAssigneeName(selectedTicket.assignee_id || null)

      try {
        const reporter = await getWorkerById(accessToken, selectedTicket.reporter_id)
        setReporterName(reporter.fullname)
      } catch (workerError) {
        console.warn("Could not load reporter as a worker:", workerError)
      }

      if (selectedTicket.assignee_id) {
        try {
          const assignee = await getWorkerById(accessToken, selectedTicket.assignee_id)
          setAssigneeName(assignee.fullname)
        } catch (workerError) {
          console.warn("Could not load assignee as a worker:", workerError)
        }
      }
    } catch (err) {
      console.error("Failed to load ticket:", err)
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل التذكرة",
      )
    } finally {
      setLoading(false)
    }
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

        if (!selectedTicket) throw new Error("Ticket not found")
        if (!alive) return

        setTicket(selectedTicket)
        setReporterName(selectedTicket.reporter_id)
        setAssigneeName(selectedTicket.assignee_id || null)

        if (selectedTicket.asset_id) {
          try {
            const assetData = await getAssetById(accessToken, selectedTicket.asset_id)
            if (alive) setAsset(assetData)
          } catch (assetError) {
            console.error("Failed to load asset:", assetError)
            if (alive) setAsset(null)
          }
        } else if (alive) {
          setAsset(null)
        }

        // A missing Worker record should never prevent the ticket page from loading.
        try {
          const reporter = await getWorkerById(accessToken, selectedTicket.reporter_id)
          if (alive) setReporterName(reporter.fullname)
        } catch (workerError) {
          console.warn("Could not load reporter as a worker:", workerError)
        }

        if (selectedTicket.assignee_id) {
          try {
            const assignee = await getWorkerById(accessToken, selectedTicket.assignee_id)
            if (alive) setAssigneeName(assignee.fullname)
          } catch (workerError) {
            console.warn("Could not load assignee as a worker:", workerError)
          }
        }
      } catch (err) {
        console.error("Failed to load ticket:", err)
        if (alive) {
          setError(
            err instanceof Error ? err.message : "حدث خطأ أثناء تحميل التذكرة",
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
  }, [accessToken, ticket_id])

  const resetActionForm = () => {
    setAction(null)
    setActionError(null)
    setDueDate("")
    setEstimatedCost("")
    setRejectionReason("")
    setActualCost("")
    setCompletionNotes("")
    setPhotos([])
  }

  const sendAction = async (
    endpoint: string,
    body: Record<string, unknown> | FormData,
  ) => {
    if (!accessToken) throw new Error("انتهت الجلسة، سجل الدخول مرة أخرى")

    const isFormData = body instanceof FormData
    const response = await fetch(
      `${API_URL}/tickets/${ticket_id}/${endpoint}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
        },
        body: isFormData ? body : JSON.stringify(body),
      },
    )

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        result?.message ||
          result?.error ||
          `تعذر تنفيذ العملية (${response.status})`,
      )
    }

    return result
  }

  // POST /tickets/:ticketId/approve
  const handleApprove = async () => {
    if (!assigneeId || !dueDate || estimatedCost === "") return

    try {
      setActionLoading(true)
      setActionError(null)

      await approveTicket(accessToken, ticket_id, {
  assignee_id: assigneeId,
  due_date: dueDate,
  estimated_cost: Number(estimatedCost),
});

      resetActionForm()
      await loadTicketDetails()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "تعذر قبول التذكرة",
      )
    } finally {
      setActionLoading(false)
    }
  }

  // POST /tickets/:ticketId/reject
  const handleReject = async () => {
    if (!rejectionReason.trim()) return

    try {
      setActionLoading(true)
      setActionError(null)

      await rejectTicket(accessToken, ticket_id, {
  reason: rejectionReason,
});

      resetActionForm()
      await loadTicketDetails()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "تعذر رفض التذكرة",
      )
    } finally {
      setActionLoading(false)
    }
  }

  // POST /tickets/:ticketId/reassign
  const handleReassign = async () => {
    if (!assigneeId || !dueDate) return

    try {
      setActionLoading(true)
      setActionError(null)

      await reassignTicket(accessToken, ticket_id, {
  assignee_id: assigneeId,
  due_date: dueDate,
});

      resetActionForm()
      await loadTicketDetails()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "تعذر إعادة تعيين المكلف",
      )
    } finally {
      setActionLoading(false)
    }
  }

  // POST /tickets/:ticketId/complete
  const handleComplete = async () => {
    if (
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

      const formData = new FormData()
      formData.append("actual_cost", actualCost)
      if (completionNotes.trim()) {
        formData.append("completion_notes", completionNotes.trim())
      }
      photos.forEach((photo) => formData.append("photos", photo))

      await completeTicket(accessToken, ticket_id, {
  actual_cost: Number(actualCost),
  completion_notes: completionNotes,
  photos,
});

      resetActionForm()
      await loadTicketDetails()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "تعذر إكمال التذكرة",
      )
    } finally {
      setActionLoading(false)
    }
  }

  const openAction = (nextAction: ActionType) => {
    setAction(nextAction)
    setActionError(null)
  }

  const date = (value: string | null | undefined) => {
    if (!value) return "—"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    })
  }

  const money = (value: number | null) => {
    if (value === null || value === undefined) return "—"
    return `${Number(value).toLocaleString("ar-SA")} ر.س`
  }

  const statusLabels: Record<string, string> = {
    PENDING_REVIEW: "بانتظار المراجعة",
    PENDING: "قيد الانتظار",
    APPROVED: "تمت الموافقة",
    REJECTED: "مرفوضة",
    IN_PROGRESS: "قيد التنفيذ",
    COMPLETED: "مكتملة",
    CANCELLED: "ملغاة",
  }

  const priorityLabels: Record<string, string> = {
    LOW: "منخفضة",
    MEDIUM: "متوسطة",
    HIGH: "عالية",
    URGENT: "عاجلة",
  }

  const typeLabels: Record<string, string> = {
    CORRECTIVE: "صيانة تصحيحية",
    PREVENTIVE: "صيانة وقائية",
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
    <div style={S("display:flex; flex-direction:column; gap:6px; min-width:0")}>
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
        "padding:20px; border:1px solid var(--border); border-radius:14px; background:var(--card); display:flex; flex-direction:column; gap:20px",
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
    "width:100%; min-height:40px; padding:9px 12px; border:1px solid var(--border); border-radius:8px; background:var(--background); color:var(--foreground)",
  )

  const labelStyle = S("display:block; font-size:13px; font-weight:600; margin-bottom:7px")

  const today = new Date().toISOString().slice(0, 10)

  if (loading) {
    return (
      <div style={S("padding:32px; color:var(--muted-foreground)")}>
        جاري تحميل تفاصيل التذكرة...
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div style={S("padding:32px; display:flex; flex-direction:column; gap:16px")}>
        <p style={S("color:#dc2626")}>
          {error || "لم يتم العثور على التذكرة"}
        </p>
      </div>
    )
  }

  return (
    <div
      style={S(
        "width:100%; max-width:1100px; margin:0 auto; padding:24px; display:flex; flex-direction:column; gap:22px",
      )}
    >
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<a href="/" />}>الرئيسية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<a href="/places" />}>العقارات</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              render={
                <Link
                  to="/place/$place_id"
                  params={{ place_id: ticket.place_id }}
                >
                  {ticket.place_id}
                </Link>
              }
            />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header
        style={S(
          "display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:16px",
        )}
      >
        <div style={S("display:flex; flex-direction:column; gap:8px")}>
          <h1 style={S("font-size:24px; font-weight:800; margin:0")}>
            تفاصيل تذكرة الصيانة
          </h1>
          <p style={S("font-size:13px; color:var(--muted-foreground); margin:0")}>
            {ticket.description || "تذكرة صيانة"}
          </p>
        </div>

        <span
          style={{
            padding: "7px 14px",
            borderRadius: 20,
            color: statusColors[ticket.status] || "var(--foreground)",
            background: `${statusColors[ticket.status] || "#6b7280"}18`,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {statusLabels[ticket.status] || ticket.status}
        </span>
      </header>

      <Section title="معلومات التذكرة">
        <Grid>
          <InfoItem
            label="نوع الصيانة"
            value={typeLabels[ticket.ticket_type] || ticket.ticket_type}
          />
          <InfoItem
            label="الأولوية"
            value={priorityLabels[ticket.priority] || ticket.priority}
          />
          <InfoItem
            label="الحالة"
            value={statusLabels[ticket.status] || ticket.status}
          />
          <InfoItem label="تاريخ الاستحقاق" value={date(ticket.due_date)} />
          <InfoItem
            label="حالة التأخير"
            value={
              ticket.is_overdue
                ? <span style={S("color:#dc2626")}>متأخرة</span>
                : "غير متأخرة"
            }
          />
          <InfoItem label="تاريخ الإنشاء" value={date(ticket.created_at)} />
          <InfoItem label="آخر تحديث" value={date(ticket.updated_at)} />
        </Grid>

        <div style={S("border-top:1px solid var(--border); padding-top:16px")}>
          <InfoItem label="الوصف" value={ticket.description} />
        </div>
      </Section>

      <Section title="الأصل المرتبط">
        {asset ? (
          <Grid>
            <InfoItem label="اسم الأصل" value={asset.name} />
            <InfoItem label="نوع الأصل" value={asset.type} />
            <InfoItem label="حالة الأصل" value={asset.status} />
          </Grid>
        ) : (
          <p style={S("font-size:13px; color:var(--muted-foreground); margin:0")}>
            لا توجد بيانات للأصل أو لم يتم تحديد أصل لهذه التذكرة.
          </p>
        )}
      </Section>

      <Section title="التكاليف" icon={<Wallet size={18} />}>
        <Grid>
          <InfoItem label="التكلفة التقديرية" value={money(ticket.estimated_cost)} />
          <InfoItem label="التكلفة الفعلية" value={money(ticket.actual_cost)} />
        </Grid>
      </Section>

      <Section title="معلومات المراجعة">
        <Grid>
          <InfoItem label="تمت المراجعة بواسطة" value={ticket.reviewed_by} />
          <InfoItem label="تاريخ المراجعة" value={date(ticket.reviewed_at)} />
        </Grid>

        {ticket.rejection_reason && (
          <div
            style={S(
              "padding:14px; border-radius:10px; background:#dc262610; display:flex; flex-direction:column; gap:7px",
            )}
          >
            <strong style={S("font-size:13px; color:#dc2626")}>سبب الرفض</strong>
            <p style={S("font-size:14px; margin:0")}>{ticket.rejection_reason}</p>
          </div>
        )}
      </Section>

      <Section title="معلومات الإنجاز" icon={<CalendarDays size={18} />}>
        <Grid>
          <InfoItem label="تاريخ الإنجاز" value={date(ticket.completed_at)} />
          <InfoItem label="ملاحظات الإنجاز" value={ticket.completion_notes} />
        </Grid>
      </Section>

      <Section title="المسؤولون">
        <Grid>
          <InfoItem label="مُبلّغ التذكرة" value={reporterName} />
          <InfoItem label="المسؤول عن التنفيذ" value={assigneeName} />
        </Grid>
      </Section>

      <Section title="السجل الزمني" icon={<Clock3 size={18} />}>
        <Grid>
          <InfoItem label="تاريخ الإنشاء" value={date(ticket.created_at)} />
          <InfoItem label="تاريخ آخر تحديث" value={date(ticket.updated_at)} />
          <InfoItem label="تاريخ المراجعة" value={date(ticket.reviewed_at)} />
          <InfoItem label="تاريخ الإنجاز" value={date(ticket.completed_at)} />
        </Grid>
      </Section>

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
            إجراءات التذكرة
          </CardTitle>
        </CardHeader>

        <div
          style={S(
            "display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:12px; padding:24px 20px",
          )}
        >
          {ticket.status === "PENDING_REVIEW" && (
            <>
              <Button
                variant="default"
                className="am-btn"
                onClick={() => openAction("approve")}
                style={S("height:42px; padding:0 20px; gap:8px")}
              >
                <CheckCircle size={17} />
                <Trans>قبول التذكرة</Trans>
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
                <Trans>رفض التذكرة</Trans>
              </Button>
            </>
          )}

          {ticket.status === "APPROVED" && (
            <>
              <Button
                variant="outline"
                className="am-btn"
                onClick={() => openAction("reassign")}
                style={S("height:42px; padding:0 20px; gap:8px")}
              >
                <UserRoundCog size={17} />
                <Trans>إعادة تعيين المكلف</Trans>
              </Button>

              <Button
                variant="outline"
                className="am-btn"
                onClick={() => openAction("complete")}
                style={S(
                  "height:42px; padding:0 20px; gap:8px; color:var(--chart-2); border-color:var(--chart-2)",
                )}
              >
                <CheckCheck size={17} />
                <Trans>اكتملت التذكرة</Trans>
              </Button>
            </>
          )}
        </div>

        {action && (
          <div
            style={S(
              "margin:0 20px 20px; padding:18px; border:1px solid var(--border); border-radius:12px; display:flex; flex-direction:column; gap:16px",
            )}
          >
            <div style={S("display:flex; align-items:center; justify-content:space-between; gap:12px")}>
              <strong style={S("font-size:15px")}>
                {action === "approve" && "قبول التذكرة"}
                {action === "reject" && "رفض التذكرة"}
                {action === "reassign" && "إعادة تعيين المكلف"}
                {action === "complete" && "إكمال التذكرة"}
              </strong>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetActionForm}
                disabled={actionLoading}
                aria-label="إغلاق"
              >
                <X size={17} />
              </Button>
            </div>

            {(action === "approve" || action === "reassign") && (
              <>
                <div>
                  <label style={labelStyle}>تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    min={today}
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    style={fieldStyle}
                  />
                </div>
              </>
            )}

            {action === "approve" && (
              <div>
                <label style={labelStyle}>التكلفة التقديرية</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(event) => setEstimatedCost(event.target.value)}
                  placeholder="0.00"
                  style={fieldStyle}
                />
              </div>
            )}

            {action === "reject" && (
              <div>
                <label style={labelStyle}>سبب الرفض</label>
                <textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="اكتب سبب رفض التذكرة"
                  rows={4}
                  style={{ ...fieldStyle, resize: "vertical" }}
                />
              </div>
            )}

            {action === "complete" && (
              <>
                <div>
                  <label style={labelStyle}>التكلفة الفعلية</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={actualCost}
                    onChange={(event) => setActualCost(event.target.value)}
                    placeholder="0.00"
                    style={fieldStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>ملاحظات الإنجاز (اختياري)</label>
                  <textarea
                    value={completionNotes}
                    onChange={(event) => setCompletionNotes(event.target.value)}
                    placeholder="أضف ملاحظات الإنجاز"
                    rows={3}
                    style={{ ...fieldStyle, resize: "vertical" }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>صور الإنجاز (من 1 إلى 5 صور)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      setPhotos(Array.from(event.target.files ?? []).slice(0, 5))
                    }}
                    style={fieldStyle}
                  />
                  <p style={S("font-size:12px; color:var(--muted-foreground); margin:6px 0 0")}>
                    تم اختيار {photos.length} من 5 صور
                  </p>
                </div>
              </>
            )}

            {actionError && (
              <p style={S("margin:0; color:var(--destructive); font-size:13px")}>
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
                    estimatedCost === "" ||
                    Number(estimatedCost) < 0
                  }
                >
                  {actionLoading ? "جاري التنفيذ..." : "تأكيد الموافقة"}
                </Button>
              )}

              {action === "reject" && (
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                >
                  {actionLoading ? "جاري التنفيذ..." : "تأكيد الرفض"}
                </Button>
              )}

              {action === "reassign" && (
                <Button
                  onClick={handleReassign}
                  disabled={actionLoading || !assigneeId.trim() || !dueDate}
                >
                  {actionLoading ? "جاري التنفيذ..." : "تأكيد إعادة التعيين"}
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
                  {actionLoading ? "جاري التنفيذ..." : "تأكيد الإكمال"}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={resetActionForm}
                disabled={actionLoading}
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
