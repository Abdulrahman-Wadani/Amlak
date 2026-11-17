
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { CircleAlert } from "lucide-react"
import { t } from "@lingui/core/macro"

import { useAuth } from "@/lib/auth"
import { createContent } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { S } from "@/lib/dom-style"
import Form, { type FormValues } from "@/components/form"

export const Route = createFileRoute("/_authenticated/content/new")({
  component: NewContentPage,
})

function NewContentPage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState("")

  const handleSubmit = async (values: FormValues) => {
    if (!accessToken) return
    const text = (name: string) =>
      typeof values[name] === "string" ? (values[name] as string) : ""
    try {
      const response = await createContent(accessToken, {
        title: text("title"),
        language: text("language") === "en" ? "en" : "ar",
        slug: text("slug"),
        body: text("body"),
        is_published: values.is_published === "true",
      })

      setError("")
      void navigate({ to: "/content/$content_id", params: { content_id: response.id } })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <center>
    <div
      style={S(
        "padding: 40px 48px 56px; max-width: 1000px; display: flex; flex-direction: column; gap: 24px",
      )}
    >

    <Form
    onSubmit={handleSubmit}
    fields={[
          { name: "title", label: t`Title`, type: "text"},
          { name: "language", label: t`Language`, type: "select", defaultValue: "ar", options:[{label: t`Arabic`, value:'ar' },{label: t`English`, value:'en'}] },
          { name: "slug", label: t`Slug`, type: "text" },
          { name: "body", label: t`Body`, type: "textarea" },
{
  name: "is_published",
  label: t`Status`,
  type: "select",
  defaultValue: "false",
  options: [
    { label: t`Published`, value: "true" },
    { label: t`Draft`, value: "false" },
  ],
}        ]}
    
    >
    
    </Form>      
    {error && (
      <p role="alert" className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
        <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
        {error}
      </p>
    )}
      
    </div>
    </center>
  )
}
