
import { useEffect, useState } from "react"
import { Link, createFileRoute, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react"
import type { Asset, Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getPlace, getPlaceAssets } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  MapPin,
  Plus,
  Wallet,
  Clock3,
} from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AssetStatusBadge,
  Meta,
  StatusBadge,
  TypeLabel,
} from "@/components/place-shared"

export const Route = createFileRoute("/_authenticated/place/$place_id")({
  component: PlaceDetailPage,
})

function PlaceDetailPage() {
  const { place_id } = useParams({
    from: "/_authenticated/place/$place_id",
  })
  const { i18n } = useLingui()
  const { accessToken } = useAuth()

  const [place, setPlace] = useState<Place | null>(null)
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    getPlace(accessToken, place_id)
      .then((p) => alive && setPlace(p))
      .catch(() => alive && setFailed(true))

    getPlaceAssets(accessToken, place_id)
      .then((list) => alive && setAssets(list))
      .catch(() => alive && setAssets([]))

    return () => {
      alive = false
    }
  }, [accessToken, place_id])

  const money = new Intl.NumberFormat(
    i18n.locale === "ar" ? "ar" : "en"
  )

  const day = new Intl.DateTimeFormat(
    i18n.locale === "ar" ? "ar" : "en",
    { dateStyle: "medium" }
  )

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
        <div
          style={S(
            "display: flex; flex-direction: column; gap: 6px; min-width: 0"
          )}
        >
          <div
            style={S(
              "display: flex; align-items: center; gap: 8px; color: var(--muted-foreground); font-size: 13px"
            )}
          >
            <Building2 size={16} />
            <span>
              <Trans>Property details</Trans>
            </span>
          </div>

          <h1
            style={S(
              "font-size: 28px; font-weight: 800; margin: 0; line-height: 1.3"
            )}
          >
            {place?.place_name ??
              (failed ? (
                <Trans>Place not found</Trans>
              ) : (
                <Skeleton style={S("width: 220px; height: 28px")} />
              ))}
          </h1>
        </div>

        <Link
          to="/places"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "am-btn"
          )}
          style={S("height: 40px; padding: 0 16px; gap: 8px")}
        >
          <ArrowRight size={16} />
          <Trans>Your places</Trans>
        </Link>
      </div>

      {failed && (
        <Card style={S("padding: 18px; border: 1px solid var(--border)")}>
          <p
            style={S(
              "color: var(--muted-foreground); margin: 0; font-size: 14px"
            )}
          >
            <Trans>We could not load this property.</Trans>
          </p>
        </Card>
      )}

      {!failed && (
        <>
          {/* Property information */}
          <Card
            className="am-lift"
            style={S(
              "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0"
            )}
          >
            <CardHeader
              style={S(
                "padding: 18px 20px; border-bottom: 1px solid var(--border); gap: 4px"
              )}
            >
              <CardTitle
                style={S("font-size: 17px; font-weight: 750")}
              >
                <Trans>معلومات الملكية</Trans>
              </CardTitle>
              <p
                style={S(
                  "font-size: 13px; color: var(--muted-foreground); margin: 0"
                )}
              >
              </p>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {place === null ? (
                <div
                  style={S(
                    "display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px"
                  )}
                >
                  {Array.from({ length: 6 }).map((_, index) => (
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
                    label={<Trans>Property type</Trans>}
                    icon={<Building2 size={16} />}
                    value={<TypeLabel type={place.place_type} />}
                  />

                  <InfoItem
                    label={<Trans>City</Trans>}
                    icon={<MapPin size={16} />}
                    value={place.city}
                  />

                  <InfoItem
                    label={<Trans>Address</Trans>}
                    icon={<MapPin size={16} />}
                    value={place.address ?? <Trans>Not set</Trans>}
                  />

                  <InfoItem
                    label={<Trans>Monthly budget</Trans>}
                    icon={<Wallet size={16} />}
                    value={`${money.format(place.monthly_maintenance_budget)} ${place.currency}`}
                  />

                  <InfoItem
                    label={<Trans>Timezone</Trans>}
                    icon={<Clock3 size={16} />}
                    value={place.timezone}
                  />

                  <InfoItem
                    label={<Trans>Status</Trans>}
                    icon={<span />}
                    value={<StatusBadge status={String(place.status)} />}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assets */}
          <Card
            className="am-lift"
            style={S(
              "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0"
            )}
          >
            <CardHeader
              style={S(
                "padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px"
              )}
            >
              <div
                style={S(
                  "display: flex; flex-direction: column; gap: 4px"
                )}
              >
                <CardTitle
                  style={S("font-size: 17px; font-weight: 750")}
                >
                  <Trans>Assets</Trans>
                  {assets !== null && (
                    <span
                      style={S(
                        "margin-inline-start: 8px; font-size: 12px; font-weight: 600; color: var(--muted-foreground); border: 1px solid var(--border); padding: 2px 8px"
                      )}
                    >
                      {assets.length}
                    </span>
                  )}
                </CardTitle>

                <p
                  style={S(
                    "font-size: 13px; color: var(--muted-foreground); margin: 0"
                  )}
                >
                </p>
              </div>

              <CardAction>
                <Link
                  to="/place/asset/new"
                  search={{ place_id }}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "am-btn"
                  )}
                  style={S(
                    "height: 38px; padding: 0 12px; gap: 6px; white-space: nowrap"
                  )}
                >
                  <Plus size={16} />
                  <Trans>Add asset</Trans>
                </Link>
              </CardAction>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {assets === null ? (
                <div
                  style={S(
                    "display: flex; flex-direction: column; gap: 10px"
                  )}
                >
                  <Skeleton style={S("height: 68px")} />
                  <Skeleton style={S("height: 68px")} />
                </div>
              ) : assets.length === 0 ? (
                <div
                  style={S(
                    "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 32px 16px; border: 1px dashed var(--border); text-align: center"
                  )}
                >
                  <Building2
                    size={28}
                    style={S("color: var(--muted-foreground)")}
                  />
                  <p
                    style={S(
                      "font-size: 14px; font-weight: 650; margin: 0"
                    )}
                  >
                    <Trans>No assets yet.</Trans>
                  </p>
                  <p
                    style={S(
                      "font-size: 13px; color: var(--muted-foreground); margin: 0"
                    )}
                  >
                    <Trans>Add an asset to start tracking this property.</Trans>
                  </p>
                </div>
              ) : (
                <div
                  style={S(
                    "display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px"
                  )}
                >
                  {assets.map((a) => (
                    <div
                      key={a.id}
                      className="am-lift"
                      style={S(
                        "display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; border: 1px solid var(--border); padding: 14px; background: var(--card)"
                      )}
                    >
                      <div
                        style={S(
                          "display: flex; flex-direction: column; gap: 5px; min-width: 0"
                        )}
                      >
                        <span
                          style={S(
                            "font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                          )}
                        >
                          {a.name}
                        </span>

                        <span
                          style={S(
                            "color: var(--muted-foreground); font-size: 12px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap"
                          )}
                        >
                          <span>{a.type}</span>

                          {a.purchase_date && (
                            <>
                              <span>·</span>
                              <CalendarDays size={13} />
                              <span>
                                {day.format(new Date(a.purchase_date))}
                              </span>
                            </>
                          )}
                        </span>
                      </div>

                      <div style={S("flex-shrink: 0")}>
                        <AssetStatusBadge status={a.status} />
                      </div>
                    </div>
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
