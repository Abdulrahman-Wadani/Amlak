
import { useState, type FormEvent } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowRight, CircleAlert, Save } from "lucide-react"
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
    console.log("Submitted values:", values)

    const response = await createContent(accessToken, {
      title: String(values.title),
      language: values.language as "ar" | "en",
      slug: String(values.slug),
      body: String(values.body),
      is_published: values.is_published === "true",
    })

    console.log("Content created:", response)

    // ضع هنا كود الانتقال للصفحة إذا احتجت
  } catch (error) {
    console.error("Failed to create content:", error)
  }
}
  return (
    <center>
    <div
      dir="rtl"
      style={S(
        "padding: 40px 48px 56px; max-width: 1000px; display: flex; flex-direction: column; gap: 24px",
      )}
    >

    <Form
    callable={handleSubmit}
    args={{}}
    fields={[
          { name: "title", label: t`title`, type: "text"},
          { name: "language", label: t`language`, type: "select",options:[{label: t`عربي`, value:'ar' },{label: t`انجليزي`, value:'en'}] },
          { name: "slug", label: t`slug`, type: "text" },
          { name: "body", label: t`body`, type: "text" },
{
  name: "is_published",
  label: t`is_published`,
  type: "select",
  options: [
    { label: t`Published`, value: true },
    { label: t`Draft`, value: false },
  ],
}        ]}
    
    >
    
    </Form>      
      
    </div>
    </center>
  )
}
