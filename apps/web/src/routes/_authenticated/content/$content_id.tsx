import { useEffect, useState, type ReactNode } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import {
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  FileText,
  Save,
  Trash2,
  Globe,
} from "lucide-react"

import { useAuth } from "@/lib/auth"
import {
  getContentById,
  updateContent,
  deleteContent,
} from "@/lib/api"
import type { WebContent } from "@/lib/api"
import { S } from "@/lib/dom-style"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

import "@/styles/motion.css"

export const Route = createFileRoute(
  "/_authenticated/content/$content_id",
)({
  component: ContentDetailsPage,
})

function ContentDetailsPage() {
  const { content_id } = Route.useParams()
  const { i18n } = useLingui()
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  const [content, setContent] = useState<WebContent | null>(null)
  const [failed, setFailed] = useState(false)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [body, setBody] = useState("")
  const [isPublished, setIsPublished] = useState(false)

  const slugIsValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    getContentById(accessToken, content_id)
      .then((data) => {
        if (!alive) return

        setContent(data)
        setTitle(data.title)
        setSlug(data.slug)
        setBody(data.body)
        setIsPublished(data.is_published)
      })
      .catch((error) => {
        console.error("Get content API error:", error)
        if (alive) setFailed(true)
      })

    return () => {
      alive = false
    }
  }, [accessToken, content_id])

  async function handleUpdate() {
    if (!accessToken || !content || saving || deleting) return

    setSaveError("")
    setSaveSuccess(false)

    if (!title.trim() || !slug.trim() || !body.trim()) {
      setSaveError(t`Fill in all the required fields.`)
      return
    }

    if (!slugIsValid) {
      setSaveError(
        t`The slug can only have lowercase English letters, numbers and hyphens (-).`,
      )
      return
    }

    setSaving(true)

    try {
      const updated = await updateContent(accessToken, content.id, {
        title: title.trim(),
        slug: slug.trim(),
        body,
        is_published: isPublished,
      })

      setContent(updated)
      setTitle(updated.title)
      setSlug(updated.slug)
      setBody(updated.body)
      setIsPublished(updated.is_published)

      setSaveSuccess(true)
    } catch (error) {
      console.error("Update content error:", error)

      setSaveError(
        error instanceof Error
          ? error.message
          : t`Could not save the changes.`,
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!accessToken || !content || saving || deleting) return

    const confirmed = window.confirm(
      t`Delete this page? This cannot be undone.`,
    )

    if (!confirmed) return

    setDeleting(true)
    setSaveError("")
    setSaveSuccess(false)

    try {
      await deleteContent(accessToken, content.id)
      await navigate({ to: "/content/" })
    } catch (error) {
      console.error("Delete content error:", error)

      setSaveError(
        error instanceof Error
          ? error.message
          : t`Could not delete the page.`,
      )
    } finally {
      setDeleting(false)
    }
  }

  const formattedDate = (date: string | Date) =>
    new Date(date).toLocaleDateString(i18n.locale)

  return (
    <div
      style={S(`
        width: 100%;
        max-width: 1000px;
        margin: 0 auto;
        padding: 40px 48px 56px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      `)}
    >
      {/* Header */}
      <div
        style={S(`
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 20px;
        `)}
      >
        <div
          style={S(`
            display: flex;
            justify-content: flex-start;
            width: 100%;
          `)}
        >
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<a href="/" />}>
                  <Trans>Home</Trans>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbLink render={<a href="/content/" />}>
                  <Trans>Content</Trans>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>
                  <Trans>Page details</Trans>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <h1
          style={S(`
            width: 100%;
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
            text-align: center;
          `)}
        >
          {content?.title ??
            (failed ? (
              <Trans>Content not found</Trans>
            ) : (
              <Skeleton
                style={S(`
                  width: 220px;
                  height: 30px;
                  margin: 0 auto;
                `)}
              />
            ))}
        </h1>
      </div>

      {/* Error */}
      {failed && (
        <div
          style={S(`
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            padding: 16px;
            border: 1px solid var(--border);
            background: #fff;
            color: var(--muted-foreground);
            font-size: 13px;
            text-align: center;
          `)}
        >
          <CircleAlert size={18} />
          <Trans>We could not load the page.</Trans>
        </div>
      )}

      {!failed && (
        <>
          {/* Content Overview */}
          <div
            style={S(`
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 12px;
              width: 100%;
              padding: 24px 20px;
              background: #fff;
              border: 1px solid var(--border);
              box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08);
              text-align: center;
            `)}
          >
            <div
              style={S(`
                width: 54px;
                height: 54px;
                display: grid;
                place-items: center;
                background: var(--muted);
                border: 1px solid var(--border);
              `)}
            >
              <FileText size={25} />
            </div>

            <div
              style={S(`
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                min-width: 0;
                max-width: 100%;
              `)}
            >
              <div
                style={S(`
                  font-size: 18px;
                  font-weight: 750;
                  overflow-wrap: anywhere;
                `)}
              >
                {content?.title ?? (
                  <Skeleton
                    style={S(`
                      height: 20px;
                      width: 160px;
                      margin: 0 auto;
                    `)}
                  />
                )}
              </div>

              <div
                dir="ltr"
                style={S(`
                  text-align: center;
                  font-size: 13px;
                  color: var(--muted-foreground);
                `)}
              >
                {content ? `/${content.slug}` : ""}
              </div>
            </div>

            {content && (
              <span
                style={S(`
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  padding: 6px 12px;
                  font-size: 12px;
                  font-weight: 650;
                  background: ${content.is_published ? "rgba(22, 163, 74, 0.10)" : "var(--muted)"};
                  color: ${content.is_published ? "#15803d" : "var(--muted-foreground)"};
                `)}
              >
                {content.is_published ? (
                  <Eye size={14} />
                ) : (
                  <EyeOff size={14} />
                )}
                {content.is_published ? t`Published` : t`Draft`}
              </span>
            )}
          </div>

          {/* Content Information */}
          <Card
            className="am-lift"
            style={S(`
              width: 100%;
              padding: 0;
              border: 1px solid var(--border);
              border-radius: 0;
              box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08);
              background: #fff;
              gap: 0;
            `)}
          >
            <CardHeader
              style={S(`
                display: flex;
                justify-content: center;
                padding: 18px 20px;
                border-bottom: 1px solid var(--border);
              `)}
            >
              <CardTitle
                style={S(`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 9px;
                  width: 100%;
                  font-size: 16px;
                  font-weight: 750;
                  text-align: center;
                `)}
              >
                <FileText size={18} />
                <Trans>Page information</Trans>
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {content === null ? (
                <div
                  style={S(`
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                  `)}
                >
                  <Skeleton style={S("height: 42px")} />
                  <Skeleton style={S("height: 42px")} />
                  <Skeleton style={S("height: 42px")} />
                </div>
              ) : (
                <div
                  style={S(`
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 18px;
                  `)}
                >
                  <FormField label={t`Page title`} htmlFor="content-title">
                    <Input
                      id="content-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="am-input"
                    />
                  </FormField>

                  <FormField label={t`Page language`} htmlFor="content-language">
                    <Input
                      id="content-language"
                      value={content.language === "ar" ? t`Arabic` : t`English`}
                      disabled
                      className="am-input"
                    />
                  </FormField>

                  <FormField label={t`Page slug`} htmlFor="content-slug">
                    <Input
                      id="content-slug"
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value.toLowerCase().replace(/\s+/g, "-"),
                        )
                      }
                      dir="ltr"
                      className="am-input"
                    />

                    {slug.length > 0 && !slugIsValid && (
                      <span
                        style={S(`
                          font-size: 11px;
                          color: var(--destructive);
                        `)}
                      >
                        <Trans>The slug format is not valid.</Trans>
                      </span>
                    )}
                  </FormField>

                  <InfoField label={t`Page ID`} value={content.id} />

                  <InfoField
                    label={t`Created`}
                    value={formattedDate(content.created_at)}
                  />

                  <InfoField
                    label={t`Last updated`}
                    value={formattedDate(content.updated_at)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Page Body */}
          <Card
            className="am-lift"
            style={S(`
              width: 100%;
              padding: 0;
              border: 1px solid var(--border);
              border-radius: 0;
              box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08);
              background: #fff;
              gap: 0;
            `)}
          >
            <CardHeader
              style={S(`
                display: flex;
                justify-content: center;
                padding: 18px 20px;
                border-bottom: 1px solid var(--border);
              `)}
            >
              <CardTitle
                style={S(`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 9px;
                  width: 100%;
                  font-size: 16px;
                  font-weight: 750;
                  text-align: center;
                `)}
              >
                <FileText size={18} />
                <Trans>Page body</Trans>
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              {content === null ? (
                <Skeleton style={S("height: 300px")} />
              ) : (
                <textarea
                  id="content-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={16}
                  className="am-input w-full"
                  style={S(`
                    min-height: 300px;
                    resize: vertical;
                    padding: 12px;
                    line-height: 1.8;
                    font-size: 13px;
                    background: #fff;
                  `)}
                />
              )}
            </CardContent>
          </Card>

          {/* Publishing */}
          <Card
            className="am-lift"
            style={S(`
              width: 100%;
              padding: 0;
              border: 1px solid var(--border);
              border-radius: 0;
              box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08);
              background: #fff;
              gap: 0;
            `)}
          >
            <CardHeader
              style={S(`
                display: flex;
                justify-content: center;
                padding: 18px 20px;
                border-bottom: 1px solid var(--border);
              `)}
            >
              <CardTitle
                style={S(`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 9px;
                  width: 100%;
                  font-size: 16px;
                  font-weight: 750;
                  text-align: center;
                `)}
              >
                <Globe size={18} />
                <Trans>Publishing</Trans>
              </CardTitle>
            </CardHeader>

            <CardContent style={S("padding: 20px")}>
              <label
                htmlFor="content-published"
                style={S(`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 12px;
                  padding: 16px;
                  background: var(--muted);
                  border: 1px solid var(--border);
                  cursor: pointer;
                `)}
              >
                <input
                  id="content-published"
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  style={S("width: 17px; height: 17px; accent-color: var(--primary)")}
                />

                <span
                  style={S(`
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    text-align: center;
                  `)}
                >
                  <span style={S("font-size: 13px; font-weight: 700")}>
                    <Trans>Published</Trans>
                  </span>

                  <span
                    style={S(`
                      font-size: 11px;
                      color: var(--muted-foreground);
                    `)}
                  >
                    <Trans>Unticking this makes the page a draft.</Trans>
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>

          {/* Actions */}
          <div
            style={S(`
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 12px;
              width: 100%;
              padding: 16px 18px;
              border: 1px solid var(--border);
              background: #fff;
            `)}
          >
            {saveError && (
              <p
                role="alert"
                style={S(`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 7px;
                  margin: 0;
                  color: var(--destructive);
                  font-size: 13px;
                  text-align: center;
                `)}
              >
                <CircleAlert size={16} />
                {saveError}
              </p>
            )}

            {saveSuccess && (
              <p
                role="status"
                style={S(`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 7px;
                  margin: 0;
                  color: var(--muted-foreground);
                  font-size: 13px;
                  text-align: center;
                `)}
              >
                <Check size={16} />
                <Trans>The page was updated.</Trans>
              </p>
            )}

            <div
              style={S(`
                display: flex;
                align-items: center;
                justify-content: center;
                flex-wrap: wrap;
                gap: 10px;
                width: 100%;
              `)}
            >
              <Button
                onClick={handleUpdate}
                disabled={!content || saving || deleting}
                className="am-btn am-solid"
                style={S(`
                  min-width: 150px;
                  height: 42px;
                  gap: 8px;
                `)}
              >
                <Save size={16} />
                {saving ? t`Saving…` : t`Save changes`}
              </Button>

              <Button
                onClick={handleDelete}
                disabled={!content || saving || deleting}
                variant="destructive"
                style={S(`
                  min-width: 130px;
                  height: 42px;
                  gap: 8px;
                `)}
              >
                <Trash2 size={16} />
                {deleting ? t`Deleting…` : t`Delete page`}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div
      style={S(`
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: center;
      `)}
    >
      <Label
        htmlFor={htmlFor}
        style={S(`
          font-size: 12px;
          font-weight: 650;
          color: var(--muted-foreground);
          text-align: center;
        `)}
      >
        {label}
      </Label>

      {children}
    </div>
  )
}

function InfoField({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div
      style={S(`
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: center;
      `)}
    >
      <span
        style={S(`
          font-size: 12px;
          font-weight: 650;
          color: var(--muted-foreground);
          text-align: center;
        `)}
      >
        {label}
      </span>

      <div
        style={S(`
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border: 1px solid var(--border);
          background: var(--muted);
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          overflow-wrap: anywhere;
        `)}
      >
        {value}
      </div>
    </div>
  )
}