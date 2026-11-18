
import { useEffect, useMemo, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import {
  CircleAlert,
  Plus,
  Search,
  FileText,
  Globe,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"

import { useAuth } from "@/lib/auth"
import { getContents } from "@/lib/api"
import type {
  WebContent,
  ContentLanguage,
  ContentPagination,
} from "@/lib/api"
import { S } from "@/lib/dom-style"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { errorMessage } from "@/lib/errors"
import { buttonVariants } from "@/components/ui/button"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react"
import { t } from "@lingui/core/macro"
import { Page } from "@/components/page"
import { formatDate } from "@/lib/format"



export const Route = createFileRoute("/_authenticated/content/")({
  component: ContentPage,
})

type ContentTab = "ALL" | "PUBLISHED" | "DRAFT"

const PAGE_SIZE = 12

function ContentPage() {
  const { accessToken } = useAuth()
  const { i18n } = useLingui()

  const [contents, setContents] = useState<WebContent[] | null>(null)
  const [pagination, setPagination] = useState<ContentPagination | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<ContentTab>("ALL")
  const [language, setLanguage] = useState<ContentLanguage | "ALL">("ALL")
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    setLoading(true)
    setError("")

    getContents(accessToken, {
      language: language === "ALL" ? undefined : language,
      page,
      page_size: PAGE_SIZE,
    })
      .then((result) => {
        if (!alive) return
        setContents(result.data)
        setPagination(result.pagination)
      })
      .catch((err: unknown) => {
        if (!alive) return
        setError(
          errorMessage(err),
        )
        setContents([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [accessToken, language, page])

  const visible = useMemo(() => {
    if (!contents) return []

    const q = query.trim().toLowerCase()

    return contents.filter((content) => {
      const matchesTab =
        tab === "ALL" ||
        (tab === "PUBLISHED" && content.is_published) ||
        (tab === "DRAFT" && !content.is_published)

      const matchesQuery =
        !q ||
        content.title.toLowerCase().includes(q) ||
        content.slug.toLowerCase().includes(q)

      return matchesTab && matchesQuery
    })
  }, [contents, query, tab])

  const countFor = (key: ContentTab) =>
    contents?.filter((content) => {
      if (key === "ALL") return true
      if (key === "PUBLISHED") return content.is_published
      return !content.is_published
    }).length ?? 0

  const changeLanguage = (value: ContentLanguage | "ALL") => {
    setLanguage(value)
    setPage(1)
  }

  return (
    <Page
      title={<Trans>Content</Trans>}
      description={<Trans>Manage the site's pages, their text and whether they are published.</Trans>}
      phoneStart="logo"
      phoneActions={false}
      phoneEnd={{ label: t`Add Content`, icon: "plus", link: { to: "/content/new" } }}
      actions={
        <Link to="/content/new" className={cn(buttonVariants(), "am-btn am-solid")}>
          <Plus aria-hidden="true" />
          <Trans>Add Content</Trans>
        </Link>
      }
    >

      {/* Search and filters */}
      <div
        style={S(
          "display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px",
        )}
      >
        <div style={S("position: relative; flex: 1 1 280px; max-width: 360px")}>
          <Label
            htmlFor="content-search"
            style={S(
              "position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)",
            )}
          >
            <Trans>Search content</Trans>
          </Label>

          <Search
            aria-hidden="true"
            style={S(
              "position: absolute; top: 12px; inset-inline-start: 14px; width: 19px; height: 19px; color: var(--muted-foreground); pointer-events: none",
            )}
          />

          <Input
            id="content-search"
            type="search"
            className="am-input"
            style={S("padding-inline-start: 42px")}
            placeholder={t`Search by title or slug…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div
          role="group"
          aria-label={t`Filter by language`}
          style={S("display: flex; gap: 7px; flex-wrap: wrap")}
        >
          {(
            [
              { key: "ALL", label: t`All languages` },
              { key: "ar", label: t`Arabic` },
              { key: "en", label: t`English` },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              className="am-tab"
              aria-pressed={language === item.key}
              onClick={() => changeLanguage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status tabs */}
      <div
        role="group"
        aria-label={t`Filter by publishing status`}
        style={S("display: flex; gap: 8px; flex-wrap: wrap")}
      >
        {(
          [
            { key: "ALL", label: t`All` },
            { key: "PUBLISHED", label: t`Published` },
            { key: "DRAFT", label: t`Drafts` },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            className="am-tab"
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
          >
            {item.label}
            <span className="am-tab-count">{countFor(item.key)}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={S(
            "display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px",
          )}
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              style={S(
                "display: flex; flex-direction: column; gap: 12px; padding: 16px; min-height: 150px; border: 1px solid var(--border); background: #fff",
              )}
            >
              <Skeleton style={S("height: 16px; width: 65%")} />
              <Skeleton style={S("height: 12px; width: 90%")} />
              <Skeleton style={S("height: 20px; width: 75px")} />
              <Skeleton style={S("height: 10px; width: 45%")} />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <p className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
          <CircleAlert size={15} />
          {error}
        </p>
      )}

      {/* Empty */}
      {!loading && !error && contents !== null && visible.length === 0 && (
        <Empty style={S("padding: 40px")}>
          <EmptyHeader>
            <EmptyTitle>
              {query || tab !== "ALL" || language !== "ALL"
                ? t`No pages match`
                : t`No content pages yet`}
            </EmptyTitle>
            <EmptyDescription>
              {query || tab !== "ALL" || language !== "ALL"
                ? t`Try another search or other filters.`
                : t`Create your first content page.`}
            </EmptyDescription>

            {query || tab !== "ALL" || language !== "ALL" ? (
              <Button
                size="sm"
                className="am-btn"
                onClick={() => {
                  setQuery("")
                  setTab("ALL")
                  changeLanguage("ALL")
                }}
              >
                <Trans>Clear filters</Trans>
              </Button>
            ) : (
              <Link to="/content/new" className="am-btn">
                <Plus size={15} />
                <Trans>New page</Trans>
              </Link>
            )}
          </EmptyHeader>
        </Empty>
      )}

      {/* Content cards */}
      {!loading && !error && visible.length > 0 && (
        <div
          style={S(
            "display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px",
          )}
        >
          {visible.map((content) => (
            <Link
              key={content.id}
              to="/content/$content_id"
              params={{ content_id: content.id }}
              className="am-lift"
              style={S(
                "display: flex; flex-direction: column; gap: 12px; padding: 16px; min-height: 175px; text-decoration: none; color: inherit; background: #fff; border: 1px solid var(--border); box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08)",
              )}
            >
              <div style={S("display: flex; align-items: flex-start; gap: 10px")}>
                <div
                  style={S(
                    "width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--muted); flex-shrink: 0",
                  )}
                >
                  <FileText size={17} />
                </div>

                <div style={S("min-width: 0; flex: 1")}>
                  <div
                    style={S(
                      "font-size: 14px; font-weight: 750; overflow: hidden; text-overflow: ellipsis; white-space: nowrap",
                    )}
                  >
                    {content.title}
                  </div>
                  <div
                    style={S(
                      "margin-top: 5px; font-size: 11px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap",
                    )}
                  >
                    <bdi dir="ltr">/{content.slug}</bdi>
                  </div>
                </div>
              </div>

              <div
                style={S(
                  "display: flex; align-items: center; justify-content: space-between; gap: 8px",
                )}
              >
                <span
                  style={S(
                    "display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; background: var(--muted); font-size: 11px; color: var(--muted-foreground)",
                  )}
                >
                  <Globe size={12} />
                  {content.language === "ar" ? t`Arabic` : t`English`}
                </span>

                <span
                  style={S(
                    `display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; font-size: 11px; background: ${content.is_published ? "rgba(22, 163, 74, 0.10)" : "var(--muted)"}; color: ${content.is_published ? "#15803d" : "var(--muted-foreground)"}`,
                  )}
                >
                  {content.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
                  {content.is_published ? t`Published` : t`Draft`}
                </span>
              </div>

              <div
                style={S(
                  "margin-top: auto; padding-top: 9px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 650; color: var(--muted-foreground)",
                )}
              >
                <span>
                  <Trans>Last updated:</Trans>{" "}
                  {formatDate(content.updated_at, i18n.locale, { year: "numeric", month: "numeric", day: "numeric" })}
                </span>
                <span><Trans>View details</Trans></span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination && pagination.total_pages > 1 && (
        <div
          style={S(
            "display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border)",
          )}
        >
          <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
            <Trans>
              Page {pagination.page} of {pagination.total_pages} — {pagination.total} pages in total
            </Trans>
          </span>

          <div style={S("display: flex; gap: 8px; align-items: center")}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft size={15} className="rtl:rotate-180" />
              <Trans>Previous</Trans>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((current) => current + 1)}
            >
              <Trans>Next</Trans>
              <ChevronRight size={15} className="rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </Page>
  )
}
