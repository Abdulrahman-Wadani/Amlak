import { createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { storedUser, useAuth } from "@/lib/auth"
import { Page } from "@/components/page"
import { ContentForm } from "@/components/content-form"

export const Route = createFileRoute("/_authenticated/content/new")({
  beforeLoad: () => {
    if (storedUser()?.role !== "ADMIN") throw redirect({ to: "/home" })
  },
  component: NewPage,
})

function NewPage() {
  const { accessToken } = useAuth()
  return (
    <Page title={<Trans>New page</Trans>} parent={{ label: <Trans>Site content</Trans>, link: { to: "/content" } }} bell={false} phoneEnd="none" tabs={false}>
      {accessToken && <ContentForm token={accessToken} />}
    </Page>
  )
}
