import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { useAuth } from "@/lib/auth"
import { FormPopup } from "@/components/form-popup"
import { WorkerForm } from "@/components/worker-form"

export const Route = createFileRoute("/_authenticated/worker/new")({
  component: InviteWorker,
})

function InviteWorker() {
  const { accessToken } = useAuth()
  return (
    <FormPopup title={<Trans>Invite worker</Trans>} back={{ to: "/workers" }}>
      {accessToken && <WorkerForm token={accessToken} />}
    </FormPopup>
  )
}
