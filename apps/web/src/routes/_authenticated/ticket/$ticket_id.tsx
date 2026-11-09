
import { useEffect, useState } from "react"
import {
  createFileRoute,
  useParams,
  Link,
  
} from "@tanstack/react-router"
import { ArrowLeft, CalendarDays, Clock3, Wallet,CheckCircle,
  XCircle,
  UserRoundCog,
  CheckCheck } from "lucide-react"
import { Trans } from "@lingui/react/macro"

import { useAuth } from "@/lib/auth"
import { getTicketById, getAssetById,getWorkerById } from "@/lib/api"
import type { Asset } from "@amlak/shared"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "cn"
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

function TicketDetailPage() {
  const { ticket_id } = useParams({
    from: "/_authenticated/ticket/$ticket_id",
  })

  const { accessToken } = useAuth()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [user, setUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const ticketData = await getTicketById(
          accessToken!,
          ticket_id,
        )

        // Your current getTicketById returns an array.
        const selectedTicket = (
          Array.isArray(ticketData) ? ticketData[0] : ticketData
        ) as Ticket

        if (!selectedTicket) {
          throw new Error("Ticket not found")
        }

        if (!alive) return
        setTicket(selectedTicket)

        if (selectedTicket.asset_id) {
          const assetData = await getAssetById(
            accessToken!,
            selectedTicket.asset_id,
          )

          if (alive) setAsset(assetData)
        }
      } catch (err) {
        console.error("Failed to load ticket:", err)

        if (alive) {
          setError(
            err instanceof Error
              ? err.message
              : "حدث خطأ أثناء تحميل التذكرة",
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

  useEffect(() => {
    if (!accessToken || !ticket) return

    let alive = true

    getWorkerById(accessToken, ticket.reporter_id)
      .then((userData) => {
        if (alive) setUser(userData.fullname)
        })
    })

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
    PENDING: "#d97706",
    APPROVED: "#2563eb",
    REJECTED: "#dc2626",
    IN_PROGRESS: "#7c3aed",
    COMPLETED: "#16a34a",
    CANCELLED: "#6b7280",
  }
    const handleClick = () => {
    alert('Button was clicked!');
  };

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

      </div>
    )
  }

  return (
    <div style={S("width:100%; max-width:1100px; margin:0 auto; padding:24px; display:flex; flex-direction:column; gap:22px")}>
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


      <header style={S("display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:16px")}>
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
          <InfoItem
            label="تاريخ الاستحقاق"
            value={date(ticket.due_date)}
          />
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
          <InfoItem
            label="التكلفة التقديرية"
            value={money(ticket.estimated_cost)}
          />
          <InfoItem
            label="التكلفة الفعلية"
            value={money(ticket.actual_cost)}
          />
        </Grid>
      </Section>

      <Section title="معلومات المراجعة">
        <Grid>
          <InfoItem label="تمت المراجعة بواسطة" value={ticket.reviewed_by} />
          <InfoItem label="تاريخ المراجعة" value={date(ticket.reviewed_at)} />
        </Grid>

        {ticket.rejection_reason && (
          <div style={S("padding:14px; border-radius:10px; background:#dc262610; display:flex; flex-direction:column; gap:7px")}>
            <strong style={S("font-size:13px; color:#dc2626")}>
              سبب الرفض
            </strong>
            <p style={S("font-size:14px; margin:0")}>
              {ticket.rejection_reason}
            </p>
          </div>
        )}
      </Section>

      <Section title="معلومات الإنجاز" icon={<CalendarDays size={18} />}>
        <Grid>
          <InfoItem
            label="تاريخ الإنجاز"
            value={date(ticket.completed_at)}
          />
          <InfoItem
            label="ملاحظات الإنجاز"
            value={ticket.completion_notes}
          />
        </Grid>
      </Section>

      <Section title="المسؤولون">
        <Grid>
          <InfoItem label="مُبلّغ التذكرة" value={user} />
          <InfoItem label="المسؤول عن التنفيذ" value={user} />
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
    "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0"
  )}
>
  <CardHeader
    style={S(
      "padding: 20px; border-bottom: 1px solid var(--border); text-align: center"
    )}
  >
    <CardTitle style={S("font-size: 17px; font-weight: 750; width: 100%; text-align: center")}>
      إجراءات التذكرة
    </CardTitle>
  </CardHeader>

  <div
    style={S(
      "display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 12px; padding: 24px 20px"
    )}
  >
    <Button
      variant="default"
      className="am-btn"
      onClick={handleClick}
      style={S("height: 42px; padding: 0 20px; gap: 8px")}
    >
      <CheckCircle size={17} />
      <Trans>قبول التذكرة</Trans>
    </Button>

    <Button
      variant="outline"
      className="am-btn"
      onClick={handleClick}
      style={S(
        "height: 42px; padding: 0 20px; gap: 8px; color: var(--destructive); border-color: var(--destructive)"
      )}
    >
      <XCircle size={17} />
      <Trans>رفض التذكرة</Trans>
    </Button>

    <Button
      variant="outline"
      className="am-btn"
      onClick={handleClick}
      style={S("height: 42px; padding: 0 20px; gap: 8px")}
    >
      <UserRoundCog size={17} />
      <Trans>إعادة تعيين المكلف</Trans>
    </Button>

    <Button
      variant="outline"
      className="am-btn"
      onClick={handleClick}
      style={S(
        "height: 42px; padding: 0 20px; gap: 8px; color: var(--chart-2); border-color: var(--chart-2)"
      )}
    >
      <CheckCheck size={17} />
      <Trans>اكتملت التذكرة</Trans>
    </Button>
  </div>
</Card>
    </div>
  )
}
