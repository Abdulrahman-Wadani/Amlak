import { useEffect, useState } from "react"
import { createFileRoute, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import type { Asset, Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getAssetById, getPlace } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Page } from "@/components/page"
import { Panel } from "@/components/panel"
import { AssetForm } from "@/components/asset-form"

export const Route = createFileRoute("/_authenticated/place/asset/edit/$asset_id")({
  component: EditAsset,
})

function EditAsset() {
  const { asset_id } = useParams({ from: "/_authenticated/place/asset/edit/$asset_id" })
  const { accessToken } = useAuth()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getAssetById(accessToken, asset_id)
      .then(async (a) => {
        const p = await getPlace(accessToken, a.place_id)
        if (!alive) return
        setAsset(a)
        setPlace(p)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, asset_id])

  return (
    <Page
      title={<Trans>Edit asset</Trans>}
      parent={{
        label: asset?.name ?? <Trans>Asset</Trans>,
        link: { to: "/place/asset/$asset_id", params: { asset_id } },
      }}
      tabs={false}
    >
      {failed ? (
        <Panel>
          <p className="m-0 text-sm text-muted-foreground">
            <Trans>We could not load the asset.</Trans>
          </p>
        </Panel>
      ) : asset && place && accessToken ? (
        <AssetForm token={accessToken} place={place} asset={asset} />
      ) : (
        <Skeleton className="h-96" />
      )}
    </Page>
  )
}
