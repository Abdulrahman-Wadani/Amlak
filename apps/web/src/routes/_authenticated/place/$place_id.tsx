import { useEffect, useState, type ReactNode } from "react"
import { Link, createFileRoute, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getPlace } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge, TypeLabel } from "@/components/place-shared"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


export const Route = createFileRoute("/_authenticated/place/$place_id")({
  component: PlaceDetailPage,
})

function PlaceDetailPage() {
  const { place_id } = useParams({ from: "/_authenticated/place/$place_id" })
  const { i18n } = useLingui()
  const { accessToken } = useAuth()
  const [place, setPlace] = useState<Place | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlace(accessToken, place_id)
      .then((p) => alive && setPlace(p))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, place_id])

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Trans>Field</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Value</Trans>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <DetailRow
                    label={<Trans>Property type</Trans>}
                    value={<TypeLabel type={place.place_type} />}
                  />
                  <DetailRow label={<Trans>City</Trans>} value={place.city} />
                  <DetailRow
                    label={<Trans>Address</Trans>}
                    value={place.address ?? <Trans>Not set</Trans>}
                  />
                  <DetailRow
                    label={<Trans>Monthly budget</Trans>}
                    value={`${new Intl.NumberFormat(i18n.locale === "ar" ? "ar" : "en").format(place.monthly_maintenance_budget)} ${place.currency}`}
                  />
                  <DetailRow
                    label={<Trans>Timezone</Trans>}
                    value={place.timezone}
                  />
                  <DetailRow
                    label={<Trans>Status</Trans>}
                    value={<StatusBadge status={place.status} />}
                  />
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <TableRow>
      <TableCell style={S("font-weight: 600")}>{label}</TableCell>
      <TableCell>{value}</TableCell>
    </TableRow>
  )
}

