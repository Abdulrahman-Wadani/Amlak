import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getPlace } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { FormPopup } from "@/components/form-popup"
import { Panel } from "@/components/panel"
import { AssetForm } from "@/components/asset-form"

export const Route = createFileRoute("/_authenticated/place/asset/new")({
  component: AddAsset,
  validateSearch: (search: Record<string, unknown>) => ({
    place_id: typeof search.place_id === "string" ? search.place_id : "",
  }),
})

function AddAsset() {
  const { accessToken } = useAuth()
  const { place_id } = Route.useSearch()
  const [place, setPlace] = useState<Place | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    if (!place_id) {
      setFailed(true)
      return
    }
    let alive = true
    getPlace(accessToken, place_id)
      .then((p) => alive && setPlace(p))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, place_id])

  return (
    <FormPopup
      title={<Trans>Add asset</Trans>}
      back={place_id ? { to: "/place/$place_id", params: { place_id } } : { to: "/places" }}
    >
      {failed ? (
        <Panel>
          <p className="m-0 text-sm text-muted-foreground">
            <Trans>We could not load this property.</Trans>
          </p>
        </Panel>
      ) : place && accessToken ? (
        <AssetForm token={accessToken} place={place} />
      ) : (
        <Skeleton className="h-96" />
      )}
    </FormPopup>
  )
}
