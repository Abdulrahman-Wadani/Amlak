
import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Mail,
  Phone,
  UserRound,
  Ticket as TicketIcon,
  MessageSquare,
  CheckCircle2,
  CheckCircle,
  X
} from "lucide-react"

import { useAuth } from "@/lib/auth"
import {
  getSupportTicketById,
  getUserById,
  resolveSupportTicket,
} from "@/lib/api"

import { S } from "@/lib/dom-style"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/place-shared"
import { Button } from "@/components/ui/button"

type SupportTicket = {
  id: string
  user_id: string
  subject: string
  description: string
  status: string
  admin_response: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

type TicketUser = {
  id: string
  fullname: string
  email: string
  phone: string | null
}

export const Route = createFileRoute(
  "/_authenticated/support/$support_id",
)({
  component: SupportTicketDetailPage,
})

function SupportTicketDetailPage() {
  const { support_id } = Route.useParams()
  const { accessToken, user: me } = useAuth()
  // Only an Admin may read other users (GET /users/{id}) and resolve tickets.
  const isAdmin = me?.role === "ADMIN"
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [user, setUser] = useState<TicketUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [adminResponse, setAdminResponse] = useState("");
  const [resolving, setResolving] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);
const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !support_id) return

    let alive = true

    async function loadTicket() {
      setLoading(true)
      setError("")
      setTicket(null)
      setUser(null)

      try {
        const ticketData = await getSupportTicketById(
          accessToken,
          support_id,
        )

        if (!alive) return

        setTicket(ticketData)

        if (isAdmin) {
          try {
            const userData = await getUserById(
              accessToken,
              ticketData.user_id,
            )

            if (alive && userData) {
              setUser(userData)
            }
          } catch {
          }
        }
      } catch {
        if (alive) {
          setError("تعذر تحميل بيانات التذكرة. حاول مرة أخرى.")
        }
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadTicket()

    return () => {
      alive = false
    }
  }, [accessToken, support_id, isAdmin])

  const formatDate = (date: string | null) => {
    if (!date) return "—"

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return "—"

    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsedDate)
  }

  // نفس تنسيقات حقول الإدخال المستخدمة في صفحة الصيانة
  const fieldStyle = S(
    "width:100%; min-height:40px; padding:9px 12px; border:1px solid var(--border); background:var(--background); color:var(--foreground)",
  )

  const labelStyle = S(
    "display:block; font-size:13px; font-weight:600; margin-bottom:7px",
  )

  if (loading) {
    return (
      <PageContainer>
        <div style={S(`width:100%; max-width:760px; display:flex; flex-direction:column; gap:20px;`)}>
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    )
  }
  const handleResolve = async () => {
  if (!accessToken || !adminResponse.trim()) return

  try {
    setResolving(true)
    setResolveError(null)

    await resolveSupportTicket(
      accessToken,
      support_id,
      adminResponse.trim()
    )

    // جلب بيانات التذكرة بعد تحديثها من السيرفر
    const updatedTicket = await getSupportTicketById(
      accessToken,
      support_id
    )

    setTicket(updatedTicket)
    setShowResolveForm(false)
    setAdminResponse("")
  } catch (err) {
    setResolveError(
      err instanceof Error ? err.message : "تعذر حل التذكرة"
    )
  } finally {
    setResolving(false)
  }
}

  if (error || !ticket) {
    return (
      <PageContainer>
        <div
          style={S(`
            width:100%;
            max-width:760px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:16px;
            text-align:center;
          `)}
        >
          <CircleAlert size={36} color="var(--destructive)" />
          <p style={S(`color:var(--destructive); font-size:14px;`)}>
            {error || "التذكرة غير موجودة"}
          </p>
          <Link
            to="/support"
            style={S(`color:var(--primary); font-size:14px; text-decoration:underline;`)}
          >
            العودة إلى تذاكر الدعم
          </Link>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div
        style={S(`
          width:100%;
          max-width:760px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:24px;
        `)}
      >
        {/* Breadcrumb */}
        <div
          style={S(`
            width:100%;
            display:flex;
            justify-content:flex-start;
            align-items:center;
            gap:8px;
            font-size:13px;
            color:var(--muted-foreground);
          `)}
        >
          <Link to="/support" className="hover:underline">
            <Trans>الرئيسية</Trans>
          </Link>

          <span>/</span>

          <Link
            to="/support"
            className="hover:underline"
          >
            <Trans>تذاكر الدعم</Trans>
          </Link>

          <span>/</span>

          <span style={S(`color:var(--foreground);`)}>
            <Trans>تفاصيل التذكرة</Trans>
          </span>
        </div>
        {/* Header */}
        <div
          style={S(`
            width:100%;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:12px;
            text-align:center;
          `)}
        >
          <div
            style={S(`
              width:64px;
              height:64px;
              border-radius:18px;
              background:var(--muted);
              display:flex;
              align-items:center;
              justify-content:center;
            `)}
          >
            <TicketIcon size={30} />
          </div>

          <h1 style={S(`font-size:24px; font-weight:700;`)}>
            {ticket.subject}
          </h1>

          <StatusBadge status={ticket.status} />

          <p style={S(`font-size:13px; color:var(--muted-foreground);`)}>
            <Trans>تذكرة دعم</Trans>
          </p>
        </div>
        {/* Ticket information */}
        <Card className="w-full" >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TicketIcon size={18} />
              <Trans>معلومات التذكرة</Trans>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <InfoField
              label="عنوان التذكرة"
              value={ticket.subject}
            />

            <InfoField
              label="وصف المشكلة"
              value={ticket.description}
            />

            <InfoField
              label="حالة التذكرة"
              value={ticket.status}
              badge
            />

            <InfoField
              label="تاريخ الإنشاء"
              value={formatDate(ticket.created_at)}
              icon={<CalendarDays size={16} />}
            />

            <InfoField
              label="آخر تحديث"
              value={formatDate(ticket.updated_at)}
              icon={<CalendarDays size={16} />}
            />
          </CardContent>
        </Card>
<div style={S("display:flex; flex-direction:column; gap:16px; width:100%")}>

  {/* أزرار إظهار الأقسام */}
  <div style={S("display:flex;flex-direction:row;direction:rtl;justify-content:flex-start;align-items:center;gap:10px;flex-wrap:wrap;width:100%;")}>

    <Button
      type="button"
      variant="outline"
      size="sm"
      className="am-btn"
      onClick={() => {
        const element = document.getElementById("ticket-header");
        if (element) {
          element.style.display = element.style.display === "none" ? "" : "none";
        }
      }}
      style={S("height:40px; padding:0 16px; gap:8px")}
    >
      <UserRound size={16} />
      <Trans>صاحب التذكرة</Trans>
    </Button>

    <Button
      type="button"
      variant="outline"
      size="sm"
      className="am-btn"
      onClick={() => {
        const element = document.getElementById("ticket-response");
        if (element) {
          element.style.display = element.style.display === "none" ? "" : "none";
        }
      }}
      style={S("height:40px; padding:0 16px; gap:8px")}
    >
      <MessageSquare size={16} />
      <Trans>رد الإدارة</Trans>
    </Button>

  </div>

  {/* نموذج حل التذكرة */}
  {showResolveForm && (
    <div
      style={S("padding:18px; border:1px solid var(--border); background:var(--card); display:flex; flex-direction:column; gap:16px; width:100%")}
    >
      <div style={S("display:flex; align-items:center; justify-content:space-between; gap:12px")}>
        <strong style={S("font-size:15px")}>
          <Trans>حل التذكرة</Trans>
        </strong>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowResolveForm(false)}
          disabled={resolving}
          aria-label="إغلاق"
        >
          <X size={17} />
        </Button>
      </div>

      <div>
        <label style={labelStyle}>
          <Trans>رد الإدارة</Trans>
        </label>

        <textarea
          value={adminResponse}
          onChange={(event) => setAdminResponse(event.target.value)}
          placeholder="اكتب رد الإدارة وتفاصيل الحل..."
          rows={4}
          disabled={resolving}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </div>

      {resolveError && (
        <p style={S("margin:0; color:var(--destructive); font-size:13px")}>
          {resolveError}
        </p>
      )}

      <div style={S("display:flex; flex-wrap:wrap; gap:10px")}>
        <Button
          onClick={handleResolve}
          disabled={resolving || !adminResponse.trim()}
        >
          {resolving ? "جاري التنفيذ..." : "تأكيد الحل"}
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setShowResolveForm(false);
            setAdminResponse("");
            setResolveError(null);
          }}
          disabled={resolving}
        >
          إلغاء
        </Button>
      </div>
    </div>
  )}

  {/* زر حل التذكرة دائماً في الأسفل */}
  {isAdmin && ticket.status === "OPEN" && (
  <div
  style={S(`
    display:flex;
    direction:rtl;
    justify-content:center;
    width:100%;
  `)}
>
  <Button
    type="button"
    variant="default"
    id="solvebutton"
    onClick={() => {
        setShowResolveForm(!showResolveForm);
        const element = document.getElementById("solvebutton");
        element.style.display = "none"
    }}
    style={S("height:42px; padding:0 20px; gap:8px")}
  >
    <CheckCircle size={17} />
    <Trans>حل التذكرة</Trans>
  </Button>
</div>
  )}

</div>
        {/* Ticket owner */}
        <Card className="w-full" id="ticket-header" style={{display: "none"}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound size={18} />
              <Trans>صاحب التذكرة</Trans>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {user ? (
              <>
                <InfoField
                  label="الاسم الكامل"
                  value={user.fullname || "—"}
                />

                <InfoField
                  label="البريد الإلكتروني"
                  value={user.email || "—"}
                  icon={<Mail size={16} />}
                />

                <InfoField
                  label="رقم الجوال"
                  value={user.phone || "—"}
                  icon={<Phone size={16} />}
                />
              </>
            ) : (
              <InfoField
                label="الاسم الكامل"
                value={ticket.user_id === me?.id ? t`You` : "—"}
              />
            )}
          </CardContent>
        </Card>

        {/* Admin response */}
        <Card className="w-full" id="ticket-response" style={{display: "none"}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare size={18} />
              <Trans>رد الإدارة</Trans>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <InfoField
              label="الرد"
              value={ticket.admin_response || "لا يوجد رد من الإدارة حتى الآن"}
            />

            <InfoField
              label="تم الحل بواسطة"
              value={
                !ticket.resolved_by
                  ? "—"
                  : ticket.resolved_by === me?.id
                    ? t`You`
                    : t`Support team`
              }
            />

            <InfoField
              label="تاريخ الحل"
              value={formatDate(ticket.resolved_at)}
              icon={<CheckCircle2 size={16} />}
            />
          </CardContent>
        </Card>

        <Link
          to="/support"
          style={S(`
            display:flex;
            align-items:center;
            gap:8px;
            color:var(--primary);
            font-size:14px;
            text-decoration:none;
          `)}
        >
          <ArrowRight size={16} />
          <Trans>العودة إلى تذاكر الدعم</Trans>
        </Link>
      </div>
    </PageContainer>
  )
}

function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      style={S(`
        width:100%;
        max-width:1000px;
        margin:0 auto;
        padding:40px 48px 56px;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:24px;
      `)}
    >
      {children}

    </div>
    
  )
}

function InfoField({
  label,
  value,
  icon,
  badge = false,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  badge?: boolean
}) {
  return (
    <div
      style={S(`
        display:flex;
        flex-direction:column;
        gap:8px;
        width:100%;
      `)}
    >
      <span
        style={S(`
          font-size:13px;
          color:var(--muted-foreground);
          font-weight:500;
        `)}
      >
        {label}
      </span>

      <div
        style={S(`
          min-height:42px;
          padding:10px 12px;
          border:1px solid var(--border);
          border-radius:8px;
          display:flex;
          align-items:center;
          gap:8px;
          font-size:14px;
          overflow-wrap:anywhere;
          white-space:pre-wrap;
        `)}
      >
        {icon}
        {badge ? <StatusBadge status={value} /> : value}
      </div>
    </div>
  )
}
