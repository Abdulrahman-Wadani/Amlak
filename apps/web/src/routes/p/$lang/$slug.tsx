import { useEffect, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { getPublicContent, type WebContent } from "@/lib/api"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"

/**
 * A published content page, open to everyone (outside _authenticated).
 * The body is plain text: blank lines split paragraphs and a line that
 * starts with "## " is a heading. React escapes it, so HTML is never run.
 */
export const Route = createFileRoute("/p/$lang/$slug")({
  component: PublicContentPage,
})

function blocks(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function PublicContentPage() {
  const { lang, slug } = Route.useParams()
  const language = lang === "ar" || lang === "en" ? lang : null
  const [page, setPage] = useState<WebContent | null | undefined>(undefined)
  const [others, setOthers] = useState<WebContent[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!language) {
      setPage(null)
      return
    }
    let alive = true
    setPage(undefined)
    setFailed(false)
    getPublicContent(language, slug)
      .then((found) => alive && setPage(found))
      .catch(() => alive && setFailed(true))
    // The footer links to the other published pages in this language.
    fetch(`/api/v1/content?language=${language}&page_size=20`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((result: { data?: WebContent[] } | null) => alive && setOthers((result?.data ?? []).filter((p) => p.is_published)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [language, slug])

  const dir = language === "ar" ? "rtl" : "ltr"
  return (
    <div className="flex min-h-screen flex-col bg-background text-[15px] leading-[1.6] text-foreground">
      <header className="flex h-[60px] items-center justify-between gap-3 border-b border-border bg-card px-4 desk:h-[72px] desk:px-10">
        <Link to="/" className="flex min-h-11 items-center gap-2.5 text-foreground no-underline">
          <span aria-hidden="true" className="flex size-7 items-center justify-center bg-foreground text-[15px] font-extrabold text-white desk:size-[30px]">
            <Trans comment="Brand glyph: negative-space letter inside the white tile; Arabic uses the letter أ">A</Trans>
          </span>
          <span className="text-xl font-extrabold desk:text-[23px]">
            <Trans comment="Brand wordmark, Latin letters only in English">Amlak</Trans>
          </span>
        </Link>
        <Link to="/signin" className={cn(buttonVariants({ variant: "outline" }))}>
          <Trans>Sign in</Trans>
        </Link>
      </header>

      <main className="mx-auto box-border w-full max-w-[760px] flex-1 px-4 pt-10 pb-16 desk:px-10 desk:pt-16">
        {failed ? (
          <p role="alert" className="m-0 text-destructive">
            <Trans>We could not load this page. Try again later.</Trans>
          </p>
        ) : page === undefined ? (
          <div className="flex flex-col gap-3.5">
            <Skeleton className="h-9 w-3/5" />
            <Skeleton className="h-40" />
          </div>
        ) : page === null ? (
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[28px] font-bold">
              <Trans>Page not found</Trans>
            </h1>
            <p className="m-0 text-muted-foreground">
              <Trans>This page does not exist or is not published.</Trans>
            </p>
          </div>
        ) : (
          <article lang={page.language} dir={dir} className="flex flex-col gap-5 [overflow-wrap:anywhere]">
            <h1 className="m-0 text-[32px] leading-[1.3] font-bold desk:text-[40px]">{page.title}</h1>
            {blocks(page.body).map((block, index) =>
              block.startsWith("## ") ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: the blocks of one text
                <h2 key={index} className="m-0 mt-2 text-[22px] leading-[1.4] font-bold">
                  {block.slice(3)}
                </h2>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: the blocks of one text
                <p key={index} className="m-0 text-base leading-[1.9] whitespace-pre-line">
                  {block}
                </p>
              ),
            )}
          </article>
        )}
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 text-[13px] text-muted-foreground desk:px-10">
        <nav className="flex flex-wrap gap-x-4">
          {others.map((other) => (
            <Link
              key={other.id}
              to="/p/$lang/$slug"
              params={{ lang: other.language, slug: other.slug }}
              className="inline-flex min-h-11 items-center text-muted-foreground underline underline-offset-4"
            >
              {other.title}
            </Link>
          ))}
        </nav>
        <span>
          <Trans>Amlak {new Date().getFullYear()}</Trans>
        </span>
      </footer>
    </div>
  )
}
