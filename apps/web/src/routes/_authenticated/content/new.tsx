
import { useState, type FormEvent } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { CircleAlert } from "lucide-react"
import { t } from "@lingui/core/macro"

import { useAuth } from "@/lib/auth"
import { createContent } from "@/lib/api"
import type { ContentLanguage } from "@/lib/api"
import { S } from "@/lib/dom-style"
import Form from "@/components/form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute("/_authenticated/content/new")({
  component: NewContentPage,
})

function NewContentPage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState("")
  const [language, setLanguage] = useState<ContentLanguage>("ar")
  const [slug, setSlug] = useState("")
  const [body, setBody] = useState("")
  const [isPublished, setIsPublished] = useState(false)

  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const slugIsValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)

const handleSubmit = async (values: Record<string, unknown>) => {
  try {
    const response = await createContent(accessToken, {
      title: String(values.title),
      language: values.language as "ar" | "en",
      slug: String(values.slug),
      body: String(values.body),
      is_published: values.is_published === "true",
    })

    setError("")
    void navigate({ to: "/content/$content_id", params: { content_id: response.id } })
  } catch (err) {
    setError(err instanceof Error ? err.message : t`Could not save the content.`)
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
    callable={handleSubmit}
    args={{}}
    fields={[
          { name: "title", label: t`Title`, type: "text"},
          { name: "language", label: t`Language`, type: "select",options:[{label: t`Arabic`, value:'ar' },{label: t`English`, value:'en'}] },
          { name: "slug", label: t`Slug`, type: "text" },
          { name: "body", label: t`Body`, type: "textarea" },
{
  name: "is_published",
  label: t`Status`,
  type: "select",
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
