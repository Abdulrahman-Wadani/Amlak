import { useEffect, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { CircleAlert, Plus } from "lucide-react"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import type { Worker } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { deleteWorker, getWorkers, updateWorker } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { useFormat } from "@/lib/format"
import { Button, buttonVariants } from "@/components/ui/button"
import { WorkerStatusChip } from "@/components/place-shared"
import { FilterTabs, Initial } from "@/components/panel"
import { cn } from "cn"
import { Page } from "@/components/page"
import { ConfirmDialog, EmptyState, LoadError, LoadingList } from "@/components/states"

export const Route = createFileRoute("/_authenticated/workers")({
  component: WorkersPage,
})

// Labels are components so they translate at render, not at import.
const TABS = [
  { key: "ALL", label: <Trans>All</Trans> },
  { key: "ACTIVE", label: <Trans>Active</Trans> },
  { key: "INVITED", label: <Trans>Invited</Trans> },
  { key: "DEACTIVATED", label: <Trans>Deactivated</Trans> },
] as const

type TabKey = (typeof TABS)[number]["key"]

// A worker who has not set up the account yet counts as invited.
const group = (worker: Worker): Exclude<TabKey, "ALL"> =>
  worker.status === "ACTIVE" ? "ACTIVE" : worker.status === "DEACTIVATED" ? "DEACTIVATED" : "INVITED"

function WorkersPage() {
  const { accessToken } = useAuth()
  const [workers, setWorkers] = useState<Worker[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<TabKey>("ALL")
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState("")
  const [toDelete, setToDelete] = useState<Worker | null>(null)
  const [toDeactivate, setToDeactivate] = useState<Worker | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getWorkers(accessToken)
      .then((list) => alive && setWorkers(list))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, reload])

  const countFor = (key: TabKey) => workers?.filter((w) => key === "ALL" || group(w) === key).length ?? 0
  const visible = workers?.filter((w) => tab === "ALL" || group(w) === tab) ?? []

  async function act(worker: Worker, action: () => Promise<unknown>) {
    if (!accessToken) return
    setBusy(worker.id)
    setActionError("")
    try {
      await action()
      setWorkers(await getWorkers(accessToken))
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function deleteInvitation(worker: Worker) {
    if (!accessToken) return
    await act(worker, () => deleteWorker(accessToken, worker.id))
    setToDelete(null)
  }

  async function deactivate(worker: Worker) {
    if (!accessToken) return
    await act(worker, () => updateWorker(accessToken, worker.id, { status: "DEACTIVATED" }))
    setToDeactivate(null)
  }

  return (
    <Page
      title={<Trans>Workers</Trans>}
      description={<Trans>Accounts of the workers who work in your places.</Trans>}
      phoneActions={false}
      phoneEnd={{ label: t`Invite worker`, icon: "plus", link: { to: "/worker/new" } }}
      actions={
        <Link to="/worker/new" className={cn(buttonVariants())}>
          <Plus aria-hidden="true" />
          <Trans>Invite worker</Trans>
        </Link>
      }
    >
      <FilterTabs
        label={t`Filter by status`}
        value={tab}
        onChange={setTab}
        tabs={TABS.map((item) => ({ key: item.key, label: item.label, count: countFor(item.key) }))}
      />

      {actionError && (
        <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {actionError}
        </p>
      )}

      {failed && (
        <LoadError
          title={<Trans>Could not load workers</Trans>}
          onRetry={() => {
            setFailed(false)
            setReload((n) => n + 1)
          }}
        />
      )}

      {workers === null && !failed && <LoadingList />}

      {workers !== null && workers.length === 0 && (
        <EmptyState
          title={<Trans>No workers yet</Trans>}
          text={<Trans>Invite your first worker with the Invite worker button.</Trans>}
        />
      )}

      {workers !== null && workers.length > 0 && visible.length === 0 && (
        <EmptyState title={<Trans>No workers have this status.</Trans>} />
      )}

      {toDelete && (
        <ConfirmDialog
          open
          title={<Trans>Delete the invitation for {toDelete.fullname}?</Trans>}
          text={<Trans>The invitation link stops working. You can invite the worker again later.</Trans>}
          confirm={busy ? <Trans>Deleting…</Trans> : <Trans>Delete invitation</Trans>}
          busy={busy !== null}
          error={actionError}
          onConfirm={() => void deleteInvitation(toDelete)}
          onClose={() => setToDelete(null)}
        />
      )}

      {toDeactivate && (
        <ConfirmDialog
          open
          title={<Trans>Deactivate {toDeactivate.fullname}?</Trans>}
          text={<Trans>They are signed out now and cannot sign in until you reactivate them.</Trans>}
          confirm={busy ? <Trans>Deactivating…</Trans> : <Trans>Deactivate</Trans>}
          busy={busy !== null}
          error={actionError}
          onConfirm={() => void deactivate(toDeactivate)}
          onClose={() => setToDeactivate(null)}
        />
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] items-stretch gap-4">
        {visible.map((worker) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            busy={busy === worker.id}
            disabled={busy !== null}
            onDeactivate={() => {
              setActionError("")
              setToDeactivate(worker)
            }}
            onReactivate={() =>
              accessToken && void act(worker, () => updateWorker(accessToken, worker.id, { status: "ACTIVE" }))
            }
            onDeleteInvitation={() => {
              setActionError("")
              setToDelete(worker)
            }}
          />
        ))}
      </div>
    </Page>
  )
}

function WorkerCard({
  worker,
  busy,
  disabled,
  onDeactivate,
  onReactivate,
  onDeleteInvitation,
}: {
  worker: Worker
  busy: boolean
  disabled: boolean
  onDeactivate: () => void
  onReactivate: () => void
  onDeleteInvitation: () => void
}) {
  const { number } = useFormat()
  const kind = group(worker)
  const places = number(worker.assigned_places.length)
  return (
    <div className="box-border flex min-w-0 flex-col gap-2.5 border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Initial name={worker.fullname} />
          <span className="flex min-w-0 flex-col leading-[1.5]">
            <span className="font-semibold [overflow-wrap:anywhere]">{worker.fullname}</span>
            <span className="text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{worker.email}</span>
          </span>
        </div>
        <WorkerStatusChip status={worker.status} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <bdi dir="ltr">{worker.phone}</bdi>
        <span>
          <Trans>Assigned places: {places}</Trans>
        </span>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {kind === "ACTIVE" && (
          <>
            <Link
              to="/worker/$worker_id"
              params={{ worker_id: worker.id }}
              aria-label={t`Edit ${worker.fullname}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Trans>Edit</Trans>
            </Link>
            <Button
              type="button"
              variant="destructive"
              disabled={disabled}
              aria-label={t`Deactivate ${worker.fullname}`}
              onClick={onDeactivate}
            >
              {busy ? <Trans>Deactivating…</Trans> : <Trans>Deactivate</Trans>}
            </Button>
          </>
        )}
        {kind === "INVITED" && (
          <Button
            type="button"
            variant="destructive"
            disabled={disabled}
            aria-label={t`Delete the invitation for ${worker.fullname}`}
            onClick={onDeleteInvitation}
          >
            {busy ? <Trans>Deleting…</Trans> : <Trans>Delete invitation</Trans>}
          </Button>
        )}
        {kind === "DEACTIVATED" && (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={t`Reactivate ${worker.fullname}`}
            onClick={onReactivate}
          >
            {busy ? <Trans>Reactivating…</Trans> : <Trans>Reactivate</Trans>}
          </Button>
        )}
      </div>
    </div>
  )
}
