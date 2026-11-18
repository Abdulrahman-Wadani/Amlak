import { createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { storedUser, useAuth } from "@/lib/auth"
import { FormPopup } from "@/components/form-popup"
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
    <FormPopup title={<Trans>New page</Trans>} back={{ to: "/content" }}>
      {accessToken && <ContentForm token={accessToken} />}
    </FormPopup>
  )
}
