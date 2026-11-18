import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { useAuth } from "@/lib/auth"
import { Page } from "@/components/page"
import { WorkerForm } from "@/components/worker-form"

export const Route = createFileRoute("/_authenticated/worker/new")({
  component: InviteWorker,
})

function InviteWorker() {
  const { accessToken } = useAuth()
  return (
    <Page
      title={<Trans>Invite worker</Trans>}
      parent={{ label: <Trans>Workers</Trans>, link: { to: "/workers" } }}
      tabs={false}
    >
      {accessToken && <WorkerForm token={accessToken} />}
    </Page>
  )
}
