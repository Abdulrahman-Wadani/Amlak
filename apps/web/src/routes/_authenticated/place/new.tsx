import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { useAuth } from "@/lib/auth"
import { Page } from "@/components/page"
import { PlaceForm } from "@/components/place-form"

export const Route = createFileRoute("/_authenticated/place/new")({
  component: AddPlace,
})

function AddPlace() {
  const { accessToken } = useAuth()
  return (
    <Page
      title={<Trans>Add place</Trans>}
      parent={{ label: <Trans>Places</Trans>, link: { to: "/places" } }}
      tabs={false}
    >
      {accessToken && <PlaceForm token={accessToken} />}
    </Page>
  )
}
