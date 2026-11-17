import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { CircleAlert } from "lucide-react"
import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { createSupportTicket } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import Form, { type FormValues } from "@/components/form"

export const Route = createFileRoute("/_authenticated/support/new")({
  component: NewSupportTicket,
})

function NewSupportTicket() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState("")

  async function handleSubmit(values: FormValues) {
    if (!accessToken) return
    const subject = typeof values.subject === "string" ? values.subject.trim() : ""
    const description =
      typeof values.description === "string" ? values.description.trim() : ""
    if (!subject || !description) {
      setFormError(t`Write a subject and a description.`)
      return
    }
    setFormError("")
    try {
      await createSupportTicket(accessToken, { subject, description })
      void navigate({ to: "/support" })
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  return (
    <center>
      <div
        style={S(
          "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 640px",
        )}
      >
        <h1 style={S("font-size: 30px; font-weight: 800; margin: 0")}>
          <Trans>New support ticket</Trans>
        </h1>
        <Form
          fields={[
            { name: "subject", label: t`Subject`, type: "text", required: true },
            { name: "description", label: t`Description`, type: "textarea", required: true },
          ]}
          onSubmit={handleSubmit}
        />
        {formError && (
          <p role="alert" className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {formError}
          </p>
        )}
      </div>
    </center>
  )
}
