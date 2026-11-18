import { useEffect, useState } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Plus } from "lucide-react"
import { storedUser, useAuth } from "@/lib/auth"
import { apiAllPages, deleteContent, type WebContent } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { useFormat } from "@/lib/format"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "cn"
import { Page } from "@/components/page"
import { ConfirmDialog, EmptyState, LoadError, LoadingList } from "@/components/states"
import { toast } from "@/components/toast"
import { PublishedChip } from "@/components/content-form"

export const Route = createFileRoute("/_authenticated/content/")({
  beforeLoad: () => {
    if (storedUser()?.role !== "ADMIN") throw redirect({ to: "/home" })
  },
  component: SiteContent,
})

/** The public pages visitors read, in both languages, with their draft or published state. */
function SiteContent() {
  const { accessToken } = useAuth()
  const { date } = useFormat()
  const [pages, setPages] = useState<WebContent[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [toDelete, setToDelete] = useState<WebContent | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    setFailed(false)
    apiAllPages<WebContent>("/content", accessToken)
      .then((list) => alive && setPages(list.sort((a, b) => b.updated_at.localeCompare(a.updated_at))))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, reload])

  async function remove() {
    if (!accessToken || !toDelete) return
    setBusy(true)
    setError("")
    try {
      await deleteContent(accessToken, toDelete.id)
      setToDelete(null)
      toast(t`Page deleted.`)
      setReload((n) => n + 1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page
      title={<Trans>Site content</Trans>}
      description={<Trans>Public pages that visitors read.</Trans>}
      phoneStart="logo"
      phoneActions={false}
      phoneEnd={{ label: t`New page`, icon: "plus", link: { to: "/content/new" } }}
      actions={
        <Link to="/content/new" className={cn(buttonVariants())}>
          <Plus aria-hidden="true" />
          <Trans>New page</Trans>
        </Link>
      }
    >
      {failed ? (
        <LoadError title={<Trans>Could not load the pages</Trans>} onRetry={() => setReload((n) => n + 1)} />
      ) : pages === null ? (
        <LoadingList />
      ) : pages.length === 0 ? (
        <EmptyState title={<Trans>No pages yet</Trans>} text={<Trans>Add the first page with the New page button.</Trans>} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] items-stretch gap-4">
          {pages.map((page) => (
            <div key={page.id} className="box-border flex min-w-0 flex-col gap-3 border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col leading-[1.5]">
                  <span lang={page.language} dir="auto" className="font-semibold [overflow-wrap:anywhere]">
                    {page.title}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    <bdi dir="ltr">
                      /{page.language}/{page.slug}
                    </bdi>
                    {t`, ${date(page.updated_at, { day: "numeric", month: "long" })}`}
                  </span>
                </div>
                <PublishedChip published={page.is_published} />
              </div>
              <div className="mt-auto flex justify-end gap-2">
                <Link
                  to="/content/$content_id"
                  params={{ content_id: page.id }}
                  aria-label={t`Edit ${page.title}`}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <Trans>Edit</Trans>
                </Link>
                <Button
                  type="button"
                  variant="destructive"
                  aria-label={t`Delete ${page.title}`}
                  onClick={() => {
                    setError("")
                    setToDelete(page)
                  }}
                >
                  <Trans>Delete</Trans>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {toDelete && (
        <ConfirmDialog
          open
          title={<Trans>Delete “{toDelete.title}”?</Trans>}
          text={<Trans>Visitors can no longer open it. This cannot be undone from the app.</Trans>}
          confirm={busy ? <Trans>Deleting…</Trans> : <Trans>Delete page</Trans>}
          busy={busy}
          error={error}
          onConfirm={() => void remove()}
          onClose={() => setToDelete(null)}
        />
      )}
    </Page>
  )
}
