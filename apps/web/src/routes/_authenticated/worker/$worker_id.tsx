import { useEffect, useState } from "react"
import { createFileRoute, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import type { Worker } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getWorkerById } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Page } from "@/components/page"
import { Panel } from "@/components/panel"
import { WorkerForm } from "@/components/worker-form"

export const Route = createFileRoute("/_authenticated/worker/$worker_id")({
  component: WorkerPage,
})

/** A worker's account: the invitation form's layout, for editing (there is no board of its own). */
function WorkerPage() {
  const { worker_id } = useParams({ from: "/_authenticated/worker/$worker_id" })
  const { accessToken } = useAuth()
  const [worker, setWorker] = useState<Worker | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getWorkerById(accessToken, worker_id)
      .then((w) => alive && setWorker(w))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, worker_id])

  return (
    <Page
      title={worker?.fullname ?? (failed ? <Trans>Worker not found</Trans> : <Skeleton className="h-7 w-56" />)}
      phoneTitle={<Trans>Worker</Trans>}
      parent={{ label: <Trans>Workers</Trans>, link: { to: "/workers" } }}
      tabs={false}
    >
      {failed ? (
        <Panel>
          <p className="m-0 text-sm text-muted-foreground">
            <Trans>We could not load this worker.</Trans>
          </p>
        </Panel>
      ) : worker && accessToken ? (
        <WorkerForm key={worker.id} token={accessToken} worker={worker} onSaved={setWorker} />
      ) : (
        <Skeleton className="h-96" />
      )}
    </Page>
  )
}
