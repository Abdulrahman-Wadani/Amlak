import { useEffect, useState } from "react"
import { createFileRoute, redirect, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { storedUser, useAuth } from "@/lib/auth"
import { getContentById, type WebContent } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Page } from "@/components/page"
import { LoadError } from "@/components/states"
import { ContentForm } from "@/components/content-form"

export const Route = createFileRoute("/_authenticated/content/$content_id")({
  beforeLoad: () => {
    if (storedUser()?.role !== "ADMIN") throw redirect({ to: "/home" })
  },
  component: EditPage,
})

function EditPage() {
  const { content_id } = useParams({ from: "/_authenticated/content/$content_id" })
  const { accessToken } = useAuth()
  const [page, setPage] = useState<WebContent | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    getContentById(accessToken, content_id)
      .then(setPage)
      .catch(() => setFailed(true))
  }, [accessToken, content_id])

  return (
    <Page
      title={page?.title ?? (failed ? <Trans>Page not found</Trans> : <Skeleton className="h-7 w-56" />)}
      phoneTitle={<Trans>Edit page</Trans>}
      parent={{ label: <Trans>Site content</Trans>, link: { to: "/content" } }}
      bell={false}
      phoneEnd="none"
      tabs={false}
    >
      {failed ? (
        <LoadError title={<Trans>Could not load this page</Trans>} onRetry={() => window.location.reload()} />
      ) : page && accessToken ? (
        <ContentForm key={page.id} token={accessToken} page={page} />
      ) : (
        <Skeleton className="h-96" />
      )}
    </Page>
  )
}
