import { useState, type FormEvent } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"
import { createContent, updateContent, type ContentLanguage, type WebContent } from "@/lib/api"
import { ApiError, errorMessage } from "@/lib/errors"
import { FormCancel, useFormPopup } from "@/components/form-popup"
import { LIMITS, tooLong } from "@/lib/limits"
import { LANGUAGE_NAMES } from "@/lib/i18n"
import { useFormat } from "@/lib/format"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "cn"
import { Field, FormButtons, InfoRows, Panel, PanelTitle, Segmented, TwoColumns } from "@/components/panel"
import { toast } from "@/components/toast"

/** A draft or published chip for a content page. */
export function PublishedChip({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex h-[26px] flex-none items-center gap-1.5 border border-good-200 bg-good-50 px-2.5 text-[13px] font-semibold whitespace-nowrap text-good-700">
      <span aria-hidden="true" className="size-[7px] bg-good" />
      <Trans>Published</Trans>
    </span>
  ) : (
    <span className="inline-flex h-[26px] flex-none items-center gap-1.5 border border-border bg-secondary px-2.5 text-[13px] font-semibold whitespace-nowrap text-muted-foreground">
      <span aria-hidden="true" className="size-[7px] bg-muted-foreground" />
      <Trans>Draft</Trans>
    </span>
  )
}

type FieldKey = "title" | "slug" | "body"

/** New page and Edit page: language, title, link and content; saved as a draft or published. */
export function ContentForm({ token, page }: { token: string; page?: WebContent }) {
  const navigate = useNavigate()
  const popup = useFormPopup()
  const { date } = useFormat()
  const [current, setCurrent] = useState(page)
  const [language, setLanguage] = useState<ContentLanguage>(page?.language ?? "ar")
  const [title, setTitle] = useState(page?.title ?? "")
  const [slug, setSlug] = useState(page?.slug ?? "")
  const [body, setBody] = useState(page?.body ?? "")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function save(publish: boolean) {
    const next: Partial<Record<FieldKey, string>> = {}
    if (!title.trim()) next.title = t`Write the title.`
    else next.title = tooLong(title, LIMITS.title)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.trim())) next.slug = t`Use lowercase English letters, digits and single dashes, like about-us.`
    if (!body.trim()) next.body = t`Write the content.`
    else next.body = tooLong(body, LIMITS.body)
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setBusy(true)
    setError("")
    try {
      const fields = { title: title.trim(), slug: slug.trim(), body, is_published: publish }
      if (current) {
        setCurrent(await updateContent(token, current.id, fields))
        toast(publish ? t`Page published.` : t`Draft saved.`)
      } else {
        await createContent(token, { ...fields, language })
        toast(publish ? t`Page published.` : t`Draft saved.`)
        if (popup) popup.saved()
        else await navigate({ to: "/content" })
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "CONFLICT" ? t`This link is already used in this language.` : errorMessage(err),
      )
    } finally {
      setBusy(false)
    }
  }

  async function togglePublished() {
    if (!current) return
    setBusy(true)
    setError("")
    try {
      setCurrent(await updateContent(token, current.id, { is_published: !current.is_published }))
      toast(current.is_published ? t`Page unpublished.` : t`Page published.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const link = `${window.location.host}/p/${language}/${slug.trim() || "about"}`

  return (
    <TwoColumns
      main={
        <Panel pad="lg">
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault()
              void save(true)
            }}
            noValidate
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">
                <Trans>Language</Trans>
              </span>
              <div className={current ? "pointer-events-none opacity-60" : undefined} aria-disabled={current ? true : undefined}>
                <Segmented<ContentLanguage>
                  label={t`Language`}
                  value={language}
                  onChange={setLanguage}
                  options={[
                    { key: "ar", label: <span lang="ar">{LANGUAGE_NAMES.ar}</span> },
                    { key: "en", label: <span lang="en">{LANGUAGE_NAMES.en}</span> },
                  ]}
                />
              </div>
              {current && (
                <span className="text-[13px] text-muted-foreground">
                  <Trans>Each language is its own page; the language cannot change.</Trans>
                </span>
              )}
            </div>
            <Field id="c-title" label={<Trans>Address</Trans>} error={errors.title}>
              <Input id="c-title" maxLength={LIMITS.title} dir={language === "ar" ? "rtl" : "ltr"} value={title} aria-invalid={errors.title ? true : undefined} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field
              id="c-slug"
              label={<Trans>Link</Trans>}
              error={errors.slug}
              hint={
                <Trans>
                  The link will look like this: <bdi dir="ltr">{link}</bdi>
                </Trans>
              }
            >
              <Input id="c-slug" maxLength={100} dir="ltr" value={slug} aria-invalid={errors.slug ? true : undefined} aria-describedby={errors.slug ? "c-slug-error" : "c-slug-hint"} onChange={(e) => setSlug(e.target.value)} />
            </Field>
            <Field id="c-body" label={<Trans>Content</Trans>} error={errors.body}>
              <Textarea id="c-body" rows={8} maxLength={LIMITS.body} dir={language === "ar" ? "rtl" : "ltr"} value={body} aria-invalid={errors.body ? true : undefined} onChange={(e) => setBody(e.target.value)} />
            </Field>
            {error && (
              <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                {error}
              </p>
            )}
            <FormButtons>
              {popup && <FormCancel to={{ to: "/content" }} />}
              <Button type="button" variant="outline" disabled={busy} onClick={() => void save(false)}>
                <Trans>Save draft</Trans>
              </Button>
              <Button type="submit" disabled={busy}>
                <Trans>Publish</Trans>
              </Button>
            </FormButtons>
          </form>
        </Panel>
      }
      side={
        current && (
          <Panel labelledBy="publishing-title" className="gap-2">
            <PanelTitle id="publishing-title">
              <Trans>Publishing</Trans>
            </PanelTitle>
            <InfoRows
              rows={[
                { label: <Trans>Status</Trans>, value: <PublishedChip published={current.is_published} /> },
                ...(current.is_published
                  ? [{ label: <Trans>Last published</Trans>, value: date(current.updated_at, { day: "numeric", month: "long" }) }]
                  : []),
              ]}
            />
            <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void togglePublished()}>
              {current.is_published ? <Trans>Unpublish</Trans> : <Trans>Publish</Trans>}
            </Button>
            {current.is_published && (
              <a
                href={`/p/${current.language}/${current.slug}`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
              >
                <Trans>View page</Trans>
              </a>
            )}
          </Panel>
        )
      }
    />
  )
}
