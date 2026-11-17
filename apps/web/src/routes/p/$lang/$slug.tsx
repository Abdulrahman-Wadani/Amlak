import { useEffect, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { getPublicContent, type WebContent } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * A published content page, open to everyone (outside _authenticated).
 * The body is shown as plain text: React escapes it, so HTML in it is
 * never run.
 */
export const Route = createFileRoute("/p/$lang/$slug")({
  component: PublicContentPage,
})

function PublicContentPage() {
  const { lang, slug } = Route.useParams()
  const language = lang === "ar" || lang === "en" ? lang : null
  const [page, setPage] = useState<WebContent | null | undefined>(undefined)
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
    return () => {
      alive = false
    }
  }, [language, slug])

  return (
    <div
      style={S(
        "min-height: 100vh; background: var(--background); color: var(--foreground); font-family: var(--font-sans)",
      )}
    >
      <header
        style={S(
          "display: flex; align-items: center; height: 56px; padding: 0 20px; border-block-end: 1px solid var(--border); background: var(--card)",
        )}
      >
        <Link to="/" style={S("font-size: 19px; font-weight: 800; text-decoration: none; color: var(--foreground)")}>
          Amlak
        </Link>
      </header>

      <main style={S("max-width: 760px; margin: 0 auto; padding: 40px 20px 64px")}>
        {failed ? (
          <p role="alert" style={S("color: var(--destructive)")}>
            <Trans>We could not load this page. Try again later.</Trans>
          </p>
        ) : page === undefined ? (
          <div style={S("display: flex; flex-direction: column; gap: 14px")}>
            <Skeleton style={S("height: 36px; width: 60%")} />
            <Skeleton style={S("height: 160px")} />
          </div>
        ) : page === null ? (
          <div style={S("display: flex; flex-direction: column; gap: 8px")}>
            <h1 style={S("font-size: 28px; font-weight: 800; margin: 0")}>
              <Trans>Page not found</Trans>
            </h1>
            <p style={S("margin: 0; color: var(--muted-foreground)")}>
              <Trans>This page does not exist or is not published.</Trans>
            </p>
          </div>
        ) : (
          <article lang={page.language} dir={page.language === "ar" ? "rtl" : "ltr"}>
            <h1 style={S("font-size: 32px; font-weight: 800; margin: 0 0 20px; line-height: 1.3")}>
              {page.title}
            </h1>
            <div style={S("white-space: pre-wrap; overflow-wrap: anywhere; font-size: 16px; line-height: 1.8")}>
              {page.body}
            </div>
          </article>
        )}
      </main>
    </div>
  )
}
