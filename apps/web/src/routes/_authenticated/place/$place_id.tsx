import { useEffect, useState, type FormEvent } from "react"
import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Camera, ChevronRight, CircleAlert, Plus } from "lucide-react"
import type { Asset, Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/http"
import {
  assignPlaceWorker,
  getPlace,
  getPlaceAssets,
  getPlaceHealth,
  getWorkers,
  unassignPlaceWorker,
  type DashboardPlace,
} from "@/lib/api"
import { apiError, errorMessage } from "@/lib/errors"
import { useFormat } from "@/lib/format"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"
import { PlaceBookings } from "@/components/place-bookings"
import { TicketsSection } from "@/components/tickets-section"
import { AssetStatusBadge, StatusBadge, TypeLabel } from "@/components/place-shared"
import { Page } from "@/components/page"
import { ConfirmDialog, LoadError } from "@/components/states"
import {
  Field,
  InfoRows,
  Initial,
  NativeSelect,
  Panel,
  PanelTitle,
  ScrollHint,
  ScrollList,
  TabbedPanel,
} from "@/components/panel"

const TABS = ["assets", "workers", "tickets", "bookings"] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute("/_authenticated/place/$place_id")({
  // The open tab is in the address, so Back returns to it.
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } =>
    TABS.includes(search.tab as Tab) ? { tab: search.tab as Tab } : {},
  component: PlaceDetailPage,
})

type Worker = Awaited<ReturnType<typeof getWorkers>>[number]

function isAssigned(worker: Worker, placeId: string) {
  return worker.assigned_places.some((assignment) => assignment.place_id === placeId)
}

function PlaceDetailPage() {
  const { place_id } = useParams({ from: "/_authenticated/place/$place_id" })
  const { accessToken, user } = useAuth()
  // Editing, deleting, the budget and the workers are for Managers.
  const isManager = user?.role === "MANAGER"
  const navigate = useNavigate()
  const search = Route.useSearch()
  // Workers are a Manager's tab; anyone else asking for it gets the assets.
  const tab: Tab = search.tab === "workers" && !isManager ? "assets" : (search.tab ?? "assets")
  const chooseTab = (next: Tab) =>
    void navigate({ to: "/place/$place_id", params: { place_id }, search: next === "assets" ? {} : { tab: next } })

  const [place, setPlace] = useState<Place | null>(null)
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [workers, setWorkers] = useState<Worker[] | null>(null)
  const [health, setHealth] = useState<DashboardPlace | null>(null)
  const [failed, setFailed] = useState(false)

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    if (!accessToken) return
    let alive = true

    getPlace(accessToken, place_id)
      .then((p) => alive && setPlace(p))
      .catch(() => alive && setFailed(true))

    getPlaceAssets(accessToken, place_id)
      .then((list) => alive && setAssets(list))
      .catch(() => alive && setAssets([]))

    // GET /workers and the dashboard's budget are Manager-only.
    if (isManager) {
      getWorkers(accessToken)
        .then((list) => alive && setWorkers(list))
        .catch(() => alive && setWorkers([]))
      getPlaceHealth(accessToken, place_id)
        .then((row) => alive && setHealth(row))
        .catch(() => {})
    }

    return () => {
      alive = false
    }
  }, [accessToken, place_id, isManager])

  async function handleDelete() {
    if (!accessToken || !place || deleting) return

    try {
      setDeleting(true)
      setDeleteError("")
      const response = await authFetch(`/places/${place_id}`, accessToken, { method: "DELETE" })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw apiError(response.status, result)
      await navigate({ to: "/places" })
    } catch (error) {
      setDeleteError(errorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const where = place && (
    <>
      <TypeLabel type={place.place_type} />, {place.city}
    </>
  )

  const budget = isManager && health?.maintenance_budget && place && (
    <BudgetPanel budget={health.maintenance_budget} timeZone={place.timezone} />
  )

  return (
    <Page
      title={
        place?.place_name ??
        (failed ? <Trans>Place not found</Trans> : <Skeleton className="h-7 w-56" />)
      }
      phoneTitle={<Trans>Place</Trans>}
      phoneSubtitle={where}
      parent={{ label: isManager ? <Trans>Places</Trans> : <Trans>My places</Trans>, link: { to: "/places" } }}
      actions={
        place &&
        isManager && (
          <>
            <Link
              to="/place/edit/$place_id"
              params={{ place_id }}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Trans>Edit</Trans>
            </Link>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDeleteError("")
                setConfirming(true)
              }}
            >
              <Trans>Delete</Trans>
            </Button>
          </>
        )
      }
    >
      {failed && <LoadError title={<Trans>Could not load this place</Trans>} onRetry={() => window.location.reload()} />}

      {place && (
        <ConfirmDialog
          open={confirming}
          title={<Trans>Delete “{place.place_name}”?</Trans>}
          text={
            <Trans>
              The place disappears from lists and its history stays in reports. This cannot be undone from the app.
            </Trans>
          }
          confirm={deleting ? <Trans>Deleting…</Trans> : <Trans>Delete place</Trans>}
          busy={deleting}
          error={deleteError}
          onConfirm={() => void handleDelete()}
          onClose={() => setConfirming(false)}
        />
      )}

      {!failed && (
        <>
          {/* The place's information on top, then one card with one list at a time. */}
          <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))] desk:gap-6">
            <InfoPanel place={place} isManager={isManager} />
            {budget}
            {!isManager && (
              <Panel>
                <Link to="/ticket/new" search={{ place_id }} className={cn(buttonVariants(), "w-full")}>
                  <Camera aria-hidden="true" />
                  <Trans>Report damage in this place</Trans>
                </Link>
                <span className="text-[13px] text-muted-foreground">
                  <Trans>View only. Editing is for the manager.</Trans>
                </span>
              </Panel>
            )}
          </div>

          <TabbedPanel
            label={t`Place sections`}
            value={tab}
            onChange={chooseTab}
            tabs={[
              { key: "assets", label: <Trans>Assets</Trans> },
              ...(isManager ? [{ key: "workers" as const, label: <Trans>Workers</Trans> }] : []),
              { key: "tickets", label: <Trans>Tickets</Trans> },
              { key: "bookings", label: <Trans>Bookings</Trans> },
            ]}
          >
            {tab === "assets" && <AssetsPanel placeId={place_id} assets={assets} isManager={isManager} />}
            {tab === "workers" && isManager && accessToken && (
              <WorkersPanel token={accessToken} placeId={place_id} workers={workers} onChanged={setWorkers} />
            )}
            {tab === "tickets" && accessToken && (
              <TicketsSection
                token={accessToken}
                placeId={place_id}
                assets={assets}
                title={<Trans>Maintenance tickets</Trans>}
                emptyOpen={<Trans>This place has no open tickets.</Trans>}
                emptyAll={<Trans>This place has no maintenance tickets.</Trans>}
                showAddTicket
              />
            )}
            {tab === "bookings" && <PlaceBookings placeId={place_id} />}
          </TabbedPanel>
        </>
      )}
    </Page>
  )
}

/** This month's maintenance spending against the place's budget (Managers only). */
function BudgetPanel({
  budget,
  timeZone,
}: {
  budget: NonNullable<DashboardPlace["maintenance_budget"]>
  timeZone: string
}) {
  const { money, number, date } = useFormat()
  const month = date(new Date(), { month: "long", timeZone })
  const share = budget.budget > 0 ? Math.min(100, (budget.spent / budget.budget) * 100) : 100
  const over = budget.spent > budget.budget
  return (
    <Panel labelledBy="budget-title">
      <PanelTitle id="budget-title">
        <Trans>{month} maintenance budget</Trans>
      </PanelTitle>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-[32px] leading-[1.2] font-bold whitespace-nowrap">
          <span className="font-mono tabular-nums">{number(budget.spent, { maximumFractionDigits: 2 })}</span>{" "}
          <span className="text-[0.8em]">{budget.currency}</span>
        </span>
        <span className="text-sm text-muted-foreground">
          <Trans>of {money(budget.budget, budget.currency, { maximumFractionDigits: 0 })}</Trans>
        </span>
      </div>
      <div aria-hidden="true" className="h-2 overflow-hidden bg-secondary">
        <div
          className={`am-fill h-full rounded-full ${over ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${share}%` }}
        />
      </div>
      <span className="text-[13px] text-muted-foreground">
        <Trans>Visible to the manager only.</Trans>
      </span>
    </Panel>
  )
}

/** The place's assets, scrolling inside the card when there are many. */
function AssetsPanel({
  placeId,
  assets,
  isManager,
}: {
  placeId: string
  assets: Asset[] | null
  isManager: boolean
}) {
  const [scrolls, setScrolls] = useState(false)
  const row =
    "box-border flex min-h-[76px] flex-none snap-start items-center justify-between gap-3 border border-border bg-card p-3.5 text-foreground no-underline"
  return (
    <Panel labelledBy="assets-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <PanelTitle id="assets-title">
            <Trans>Assets</Trans>
          </PanelTitle>
          {scrolls && <ScrollHint />}
        </div>
        {isManager && (
          <Link to="/place/asset/new" search={{ place_id: placeId }} className={cn(buttonVariants({ variant: "outline" }))}>
            <Plus aria-hidden="true" />
            <Trans>Add asset</Trans>
          </Link>
        )}
      </div>
      {assets === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[76px]" />
          <Skeleton className="h-[76px]" />
        </div>
      ) : assets.length === 0 ? (
        <p className="m-0 border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {isManager ? (
            <Trans>No assets yet. Add an asset to start tracking this property.</Trans>
          ) : (
            <Trans>No assets yet.</Trans>
          )}
        </p>
      ) : (
        <ScrollList label={t`Assets`} onScrollable={setScrolls}>
          {assets.map((asset) => {
            const content = (
              <>
                <span className="flex min-w-0 flex-col leading-[1.5]">
                  <span className="font-semibold [overflow-wrap:anywhere]">{asset.name}</span>
                  <span className="text-[13px] text-muted-foreground">{asset.type}</span>
                </span>
                <span className="flex flex-none items-center gap-2">
                  <AssetStatusBadge status={asset.status} />
                  {isManager && (
                    <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground rtl:rotate-180" strokeWidth={1.8} />
                  )}
                </span>
              </>
            )
            // Workers see the list only, as designed; the asset page is the Manager's.
            return isManager ? (
              <Link key={asset.id} to="/place/asset/$asset_id" params={{ asset_id: asset.id }} className={`am-lift ${row}`}>
                {content}
              </Link>
            ) : (
              <div key={asset.id} className={row}>
                {content}
              </div>
            )
          })}
        </ScrollList>
      )}
    </Panel>
  )
}

/** The workers assigned to the place, with Unassign, and the form to assign an active worker. */
function WorkersPanel({
  token,
  placeId,
  workers,
  onChanged,
}: {
  token: string
  placeId: string
  workers: Worker[] | null
  onChanged: (workers: Worker[]) => void
}) {
  const [selected, setSelected] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")

  const assigned = workers?.filter((worker) => isAssigned(worker, placeId)) ?? []
  const choices = workers?.filter((worker) => worker.status === "ACTIVE" && !isAssigned(worker, placeId)) ?? []

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key)
    setError("")
    try {
      await action()
      onChanged(await getWorkers(token))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    void run("assign", async () => {
      await assignPlaceWorker(token, placeId, selected)
      setSelected("")
    })
  }

  return (
    <Panel labelledBy="workers-title">
      <PanelTitle id="workers-title">
        <Trans>Assigned workers</Trans>
      </PanelTitle>
      {workers === null ? (
        <Skeleton className="h-[72px]" />
      ) : assigned.length === 0 ? (
        <p className="m-0 border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          <Trans>No workers are assigned to this place.</Trans>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {assigned.map((worker) => (
            <div
              key={worker.id}
              className="box-border flex min-w-0 flex-wrap items-center justify-between gap-3 border border-border bg-card p-3.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Initial name={worker.fullname} />
                <span className="flex min-w-0 flex-col leading-[1.5]">
                  <span className="font-semibold">{worker.fullname}</span>
                  <span className="text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{worker.email}</span>
                </span>
              </div>
              <Button
                type="button"
                variant="destructive"
                disabled={busy !== null}
                aria-label={t`Unassign ${worker.fullname}`}
                onClick={() => void run(worker.id, () => unassignPlaceWorker(token, placeId, worker.id))}
              >
                {busy === worker.id ? <Trans>Unassigning…</Trans> : <Trans>Unassign</Trans>}
              </Button>
            </div>
          ))}
        </div>
      )}

      {workers !== null && (
        <form
          onSubmit={handleAssign}
          className="flex flex-wrap items-end gap-2.5 border-t border-border pt-3.5"
        >
          <div className="min-w-0 flex-[1_1_180px]">
            <Field
              id="assign-worker"
              label={<Trans>Assign an active worker</Trans>}
              hint={choices.length === 0 ? <Trans>All your active workers are already assigned to this place.</Trans> : undefined}
            >
              <NativeSelect id="assign-worker" value={selected} onChange={setSelected} disabled={choices.length === 0}>
                <option value="">{t`Choose a worker`}</option>
                {choices.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.fullname}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Button type="submit" disabled={!selected || busy !== null}>
            <Plus aria-hidden="true" />
            {busy === "assign" ? <Trans>Assigning…</Trans> : <Trans>Assign</Trans>}
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </Panel>
  )
}

/** Status, type and address; Managers also see the currency and the time zone. */
function InfoPanel({ place, isManager }: { place: Place | null; isManager: boolean }) {
  return (
    <Panel labelledBy="info-title" className="gap-2">
      <PanelTitle id="info-title">
        <Trans>Place information</Trans>
      </PanelTitle>
      {place === null ? (
        <Skeleton className="h-40" />
      ) : (
        <InfoRows
          rows={[
            { label: <Trans>Status</Trans>, value: <StatusBadge status={String(place.status)} /> },
            { label: <Trans>Type</Trans>, value: <TypeLabel type={place.place_type} /> },
            { label: <Trans>Address</Trans>, value: place.address || place.city },
            ...(isManager
              ? [
                  { label: <Trans>Currency</Trans>, value: <bdi dir="ltr">{place.currency}</bdi> },
                  { label: <Trans>Time zone</Trans>, value: <bdi dir="ltr">{place.timezone}</bdi> },
                ]
              : []),
          ]}
        />
      )}
    </Panel>
  )
}
