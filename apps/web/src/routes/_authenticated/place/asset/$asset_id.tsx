
import { useEffect, useState } from "react"
import {
  Link,
  createFileRoute,
  useParams,
} from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react"
import type { Asset, Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import {
  getAssetById,
  getPlace,
  getTicketsForPlace,
} from "@/lib/api"
import { S } from "@/lib/dom-style"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  MapPin,
  Wrench,
  AlertTriangle,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AssetStatusBadge,
  StatusBadge,
} from "@/components/place-shared"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export const Route = createFileRoute("/_authenticated/place/asset/$asset_id")({
  component: AssetDetailPage,
})

function AssetDetailPage() {
  const { asset_id } = useParams({
    from: "/_authenticated/asset/$asset_id",
  })

  const { i18n } = useLingui()
  const { accessToken } = useAuth()

  const [asset, setAsset] = useState<Asset | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [tickets, setTickets] = useState<
    Awaited<ReturnType<typeof getTicketsForPlace>> | null
  >(null)

  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    async function loadAsset() {
      try {
        const assetData = await getAssetById(accessToken!, asset_id)

        if (!alive) return

        setAsset(assetData)

        // Load the property associated with this asset.
        const [placeData, placeTickets] = await Promise.all([
          getPlace(accessToken!, assetData.place_id),
          getTicketsForPlace(accessToken!, assetData.place_id),
        ])

        if (!alive) return

        setPlace(placeData)

        // Show only tickets belonging to this asset.
        setTickets(
          placeTickets.filter((ticket) => ticket.asset_id === asset_id)
        )
      } catch (error) {
        console.error("Failed to load asset:", error)
        if (alive) setFailed(true)
      }
    }

    loadAsset()

    return () => {
      alive = false
    }
  }, [accessToken, asset_id])

  const day = new Intl.DateTimeFormat(
    i18n.locale === "ar" ? "ar" : "en",
    { dateStyle: "medium" }
  )

  const ticketLabels: Record<string, string> = {
    CORRECTIVE: "صيانة تصحيحية",
    PREVENTIVE: "صيانة وقائية",
    LOW: "منخفضة",
    MEDIUM: "متوسطة",
    HIGH: "عالية",
    URGENT: "عاجلة",
    PENDING: "معلقة",
    SUBMITTED: "مرسلة",
    UNDER_REVIEW: "قيد المراجعة",
    APPROVED: "مقبولة",
    REJECTED: "مرفوضة",
    IN_PROGRESS: "قيد التنفيذ",
    COMPLETED: "مكتملة",
    CANCELLED: "ملغاة",
  }

  function getTicketLabel(value: string) {
    return ticketLabels[value] ?? value
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "—"

    return day.format(
      new Date(value.length === 10 ? `${value}T00:00:00` : value)
    )
  }

  return (
    <div
      dir="rtl"
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 900px"
      )}
    >
      {/* Header */}
      <div
        style={S(
          "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px"
        )}
      >
        <div style={S("display: flex; flex-direction: column; gap: 8px")}>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<a href="/" />}>
                  الرئيسية
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbLink render={<a href="/places" />}>
                  العقارات
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>تفاصيل الأصل</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1
            style={S(
              "font-size: 28px; font-weight: 800; margin: 0; line-height: 1.3"
            )}
          >
            {asset?.name ??
              (failed ? (
                <Trans>Asset not found</Trans>
              ) : (
                <Skeleton style={S("width: 220px; height: 28px")} />
              ))}
          </h1>
        </div>

        <Link
          to="/places"
          className="am-btn"
          style={S(
            "height: 40px; padding: 0 16px; display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); text-decoration: none"
          )}
        >
          <ArrowRight size={16} />
          <Trans>Your places</Trans>
        </Link>
      </div>

      {failed && (
        <Card style={S("padding: 18px; border: 1px solid var(--border)")}>
          <p style={S("color: var(--muted-foreground); margin: 0")}>
            تعذر تحميل بيانات الأصل.
          </p>
        </Card>
      )}

      {!failed && (
        <>
          {/* Asset Information */}
          <Card
            className="am-lift"
            style={S(
              "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0"
            )}
          >
            <CardHeader
              style={S(
                "padding: 18px 20px; border-bottom: 1px solid var(--border)"
              )}
            >
              <CardTitle style={S("font-size: 17px; font-weight: 750")}>
                <Trans>معلومات الأصل</Trans>
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {asset === null ? (
                <div
                  style={S(
                    "display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px"
                  )}
                >
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} style={S("height: 68px")} />
                  ))}
                </div>
              ) : (
                <div
                  style={S(
                    "display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px"
                  )}
                >
                  <InfoItem
                    label="اسم الأصل"
                    icon={<Building2 size={16} />}
                    value={asset.name}
                  />

                  <InfoItem
                    label="نوع الأصل"
                    icon={<Wrench size={16} />}
                    value={asset.type}
                  />

                  <InfoItem
                    label="الحالة"
                    icon={<span />}
                    value={<AssetStatusBadge status={asset.status} />}
                  />

                  <InfoItem
                    label="تاريخ الشراء"
                    icon={<CalendarDays size={16} />}
                    value={
                      asset.purchase_date
                        ? formatDate(String(asset.purchase_date))
                        : "—"
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Property */}
          <Card
            className="am-lift"
            style={S(
              "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0"
            )}
          >
            <CardHeader
              style={S(
                "padding: 18px 20px; border-bottom: 1px solid var(--border)"
              )}
            >
              <CardTitle style={S("font-size: 17px; font-weight: 750")}>
                <Trans>الملكية المرتبطة بالأصل</Trans>
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {place === null ? (
                <Skeleton style={S("height: 65px")} />
              ) : (
                <Link
                  to="/place/$place_id"
                  params={{ place_id: place.id }}
                  className="am-lift"
                  style={S(
                    "display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border: 1px solid var(--border); background: var(--card); text-decoration: none; color: inherit"
                  )}
                >
                  <div style={S("display: flex; flex-direction: column; gap: 6px")}>
                    <strong style={S("font-size: 14px")}>
                      {place.place_name}
                    </strong>

                    <span
                      style={S(
                        "font-size: 12px; color: var(--muted-foreground); display: flex; align-items: center; gap: 5px"
                      )}
                    >
                      <MapPin size={13} />
                      {place.city}
                    </span>
                  </div>

                  <ArrowRight size={17} />
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Tickets */}
          <Card
            className="am-lift"
            style={S(
              "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0"
            )}
          >
            <CardHeader
              style={S(
                "padding: 18px 20px; border-bottom: 1px solid var(--border)"
              )}
            >
              <CardTitle style={S("font-size: 17px; font-weight: 750")}>
                تذاكر صيانة الأصل
                {tickets !== null && (
                  <span
                    style={S(
                      "margin-inline-start: 8px; font-size: 12px; color: var(--muted-foreground)"
                    )}
                  >
                    {tickets.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {tickets === null ? (
                <div style={S("display: flex; flex-direction: column; gap: 10px")}>
                  <Skeleton style={S("height: 70px")} />
                  <Skeleton style={S("height: 70px")} />
                </div>
              ) : tickets.length === 0 ? (
                <div
                  style={S(
                    "display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 16px; text-align: center"
                  )}
                >
                  <AlertTriangle
                    size={28}
                    style={S("color: var(--muted-foreground)")}
                  />
                  <p
                    style={S(
                      "font-size: 14px; color: var(--muted-foreground); margin: 0"
                    )}
                  >
                    لا توجد تذاكر صيانة لهذا الأصل.
                  </p>
                </div>
              ) : (
                <div style={S("display: flex; flex-direction: column; gap: 10px")}>
                  {tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      to="/ticket/$ticket_id"
                      params={{ ticket_id: ticket.id }}
                      className="am-lift"
                      style={S(
                        "display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px; border: 1px solid var(--border); background: var(--card); text-decoration: none; color: inherit"
                      )}
                    >
                      <div
                        style={S(
                          "display: flex; flex-direction: column; gap: 6px; min-width: 0"
                        )}
                      >
                        <strong style={S("font-size: 14px")}>
                          {ticket.description || "تذكرة صيانة"}
                        </strong>

                        <span
                          style={S(
                            "font-size: 12px; color: var(--muted-foreground)"
                          )}
                        >
                          {getTicketLabel(ticket.ticket_type)}
                          {" · "}
                          الأولوية: {getTicketLabel(ticket.priority)}
                        </span>

                        <span
                          style={S(
                            "font-size: 12px; color: var(--muted-foreground)"
                          )}
                        >
                          تاريخ الإنشاء: {formatDate(ticket.created_at)}
                        </span>
                      </div>

                      <div style={S("display: flex; align-items: center; gap: 10px")}>
                        <StatusBadge status={String(ticket.status)} />
                        <ArrowRight size={17} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label: React.ReactNode
  value: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <div
      style={S(
        "display: flex; flex-direction: column; gap: 9px; min-width: 0; padding: 14px; border: 1px solid var(--border); background: var(--card)"
      )}
    >
      <div
        style={S(
          "display: flex; align-items: center; gap: 7px; color: var(--muted-foreground); font-size: 12px; font-weight: 600"
        )}
      >
        {icon}
        <span>{label}</span>
      </div>

      <div
        style={S(
          "font-size: 14px; font-weight: 650; min-width: 0; overflow-wrap: anywhere"
        )}
      >
        {value}
      </div>
    </div>
  )
}
