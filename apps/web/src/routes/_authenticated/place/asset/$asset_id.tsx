import { useEffect, useState } from "react"
import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import type { Asset, Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getAssetById, getPlace } from "@/lib/api"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"
import { AssetStatusBadge } from "@/components/place-shared"
import { AssetRemove } from "@/components/asset-manage"
import { AssetSchedules } from "@/components/asset-schedules"
import { TicketsSection } from "@/components/tickets-section"
import { InfoRows, Panel, PanelTitle, TwoColumns } from "@/components/panel"
import { Page } from "@/components/page"

export const Route = createFileRoute("/_authenticated/place/asset/$asset_id")({
  component: AssetDetailPage,
})

function AssetDetailPage() {
  const { asset_id } = useParams({ from: "/_authenticated/place/asset/$asset_id" })
  const { accessToken, user } = useAuth()
  const isManager = user?.role === "MANAGER"
  const navigate = useNavigate()

  const [asset, setAsset] = useState<Asset | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getAssetById(accessToken, asset_id)
      .then(async (assetData) => {
        if (!alive) return
        setAsset(assetData)
        const placeData = await getPlace(accessToken, assetData.place_id)
        if (alive) setPlace(placeData)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, asset_id])

  return (
    <Page
      title={asset?.name ?? (failed ? <Trans>Asset not found</Trans> : <Skeleton className="h-7 w-56" />)}
      phoneTitle={<Trans>Asset</Trans>}
      parent={
        asset
          ? {
              label: place?.place_name ?? <Trans>Place</Trans>,
              link: { to: "/place/$place_id", params: { place_id: asset.place_id } },
            }
          : { label: <Trans>Places</Trans>, link: { to: "/places" } }
      }
    >
      {failed ? (
        <Panel>
          <p className="m-0 text-sm text-muted-foreground">
            <Trans>We could not load the asset.</Trans>
          </p>
        </Panel>
      ) : (
        <>
          <TwoColumns
            main={
              accessToken && (
                <AssetSchedules token={accessToken} assetId={asset_id} place={place} canManage={isManager} />
              )
            }
            side={
              <Panel labelledBy="details-title" className="gap-2">
                <PanelTitle id="details-title">
                  <Trans>Details</Trans>
                </PanelTitle>
                {asset === null ? (
                  <Skeleton className="h-40" />
                ) : (
                  <>
                    <InfoRows
                      rows={[
                        { label: <Trans>Status</Trans>, value: <AssetStatusBadge status={asset.status} /> },
                        { label: <Trans>Type</Trans>, value: asset.type },
                        {
                          label: <Trans>Place</Trans>,
                          value: place ? (
                            <Link to="/place/$place_id" params={{ place_id: place.id }} className="relative underline underline-offset-4 before:absolute before:inset-x-0 before:-inset-y-3.5 before:content-['']">
                              {place.place_name}
                            </Link>
                          ) : (
                            "—"
                          ),
                        },
                        {
                          label: <Trans>Purchase date</Trans>,
                          value: asset.purchase_date ? <bdi dir="ltr">{asset.purchase_date}</bdi> : "—",
                        },
                      ]}
                    />
                    {isManager && accessToken && (
                      <div className="flex flex-wrap gap-2.5 pt-2">
                        <Link
                          to="/place/asset/edit/$asset_id"
                          params={{ asset_id: asset.id }}
                          className={cn(buttonVariants({ variant: "outline" }))}
                        >
                          <Trans>Edit</Trans>
                        </Link>
                        <AssetRemove
                          token={accessToken}
                          asset={asset}
                          onDeleted={() =>
                            void navigate({ to: "/place/$place_id", params: { place_id: asset.place_id } })
                          }
                        />
                      </div>
                    )}
                  </>
                )}
              </Panel>
            }
          />

          {/* Not in the design; kept under its sections. */}
          {asset && accessToken && (
            <TicketsSection
              token={accessToken}
              placeId={asset.place_id}
              assetId={asset.id}
              title={<Trans>Maintenance tickets for this asset</Trans>}
              emptyOpen={<Trans>This asset has no open tickets.</Trans>}
              emptyAll={<Trans>This asset has no maintenance tickets.</Trans>}
            />
          )}
        </>
      )}
    </Page>
  )
}
