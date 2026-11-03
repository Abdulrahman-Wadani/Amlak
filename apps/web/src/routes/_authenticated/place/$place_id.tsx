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
  const { place_id } = useParams({ from: "/_authenticated/place/$place_id" })
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

  const money = new Intl.NumberFormat(i18n.locale === "ar" ? "ar" : "en")
  const day = new Intl.DateTimeFormat(i18n.locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
  })

  return (
    <div
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 20px; max-width: 720px"
      )}
    >
      <div
        style={S(
          "display: flex; align-items: center; justify-content: space-between; gap: 16px"
        )}
      >
        <h1 style={S("font-size: 28px; font-weight: 800; margin: 0")}>
          {place?.place_name ??
            (failed ? (
              <Trans>Place not found</Trans>
            ) : (
              <Skeleton style={S("width: 220px; height: 28px")} />
            ))}
        </h1>
        <Link
          to="/places"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "am-btn"
          )}
        >
          <Trans>Your places</Trans>
        </Link>
      </div>

      {failed && (
        <p style={S("color: var(--muted-foreground)")}>
          <Trans>We could not load this property.</Trans>
        </p>
      )}

      {!failed && (
        <Card style={S("padding: 0")}>
          <CardHeader>
            <CardTitle>
              <Trans>Details</Trans>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {place === null ? (
              <div
                style={S("display: flex; flex-direction: column; gap: 10px")}
              >
                <Skeleton style={S("height: 40px")} />
                <Skeleton style={S("height: 40px")} />
                <Skeleton style={S("height: 40px")} />
              </div>
            ) : (
              <div
                style={S(
                  "display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px"
                )}
              >
                <Meta
                  label={<Trans>Property type</Trans>}
                  value={<TypeLabel type={place.place_type} />}
                />
                <Meta label={<Trans>City</Trans>} value={place.city} />
                <Meta
                  label={<Trans>Address</Trans>}
                  value={place.address ?? <Trans>Not set</Trans>}
                />
                <Meta
                  label={<Trans>Monthly budget</Trans>}
                  value={`${money.format(place.monthly_maintenance_budget)} ${place.currency}`}
                />
                <Meta label={<Trans>Timezone</Trans>} value={place.timezone} />
                <Meta
                  label={<Trans>Status</Trans>}
                  value={<StatusBadge status={String(place.status)} />}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!failed && (
        <Card style={S("padding: 0")}>
          <CardHeader>
            <CardTitle>
              <Trans>Assets</Trans>
            </CardTitle>
            <CardAction>
              <Link
                to="/place/asset/new"
                search={{ place_id }}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "am-btn"
                )}
              >
                <Trans>Add asset</Trans>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {assets === null ? (
              <div
                style={S("display: flex; flex-direction: column; gap: 10px")}
              >
                <Skeleton style={S("height: 56px")} />
                <Skeleton style={S("height: 56px")} />
              </div>
            ) : assets.length === 0 ? (
              <p style={S("color: var(--muted-foreground); margin: 0")}>
                <Trans>No assets yet.</Trans>
              </p>
            ) : (
              <ul
                style={S(
                  "display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none"
                )}
              >
                {assets.map((a) => (
                  <li
                    key={a.id}
                    style={S(
                      "display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid var(--border); padding: 12px 14px"
                    )}
                  >
                    <div
                      style={S(
                        "display: flex; flex-direction: column; gap: 2px; min-width: 0"
                      )}
                    >
                      <span style={S("font-size: 15px; font-weight: 700")}>
                        {a.name}
                      </span>
                      <span
                        style={S(
                          "color: var(--muted-foreground); font-size: 13px"
                        )}
                      >
                        {a.type}
                        {a.purchase_date
                          ? ` · ${day.format(new Date(a.purchase_date))}`
                          : ""}
                      </span>
                    </div>
                    <AssetStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
