import { useEffect, useState } from "react"
import { createFileRoute, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getPlace } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Page } from "@/components/page"
import { Panel } from "@/components/panel"
import { PlaceForm } from "@/components/place-form"

export const Route = createFileRoute("/_authenticated/place/edit/$place_id")({
  component: EditPlace,
})

function EditPlace() {
  const { place_id } = useParams({ from: "/_authenticated/place/edit/$place_id" })
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
    <Page
      title={<Trans>Edit place</Trans>}
      parent={{
        label: place?.place_name ?? <Trans>Place</Trans>,
        link: { to: "/place/$place_id", params: { place_id } },
      }}
      tabs={false}
    >
      {failed ? (
        <Panel>
          <p className="m-0 text-sm text-muted-foreground">
            <Trans>We could not load this property.</Trans>
          </p>
        </Panel>
      ) : place && accessToken ? (
        <PlaceForm token={accessToken} place={place} />
      ) : (
        <Skeleton className="h-96" />
      )}
    </Page>
  )
}
