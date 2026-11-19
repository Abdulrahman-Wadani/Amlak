import { useEffect, useMemo, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { MapPin, Plus } from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { plural, t } from "@lingui/core/macro"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { countPlaceWorkers, getDashboardRows, getPlaces } from "@/lib/api"
import { placeCounts, type PlaceCounts } from "@/lib/places"
import { S } from "@/lib/dom-style"
import { Button, buttonVariants } from "@/components/ui/button"
import { StatusBadge, TypeLabel } from "@/components/place-shared"
import { cn } from "cn"
import { Page } from "@/components/page"
import { EmptyState, LoadError, LoadingList } from "@/components/states"
import { FilterTabs, ListFooter, ListToolbar, Panel, ToolbarSearch } from "@/components/panel"
import { useFormat } from "@/lib/format"
import { LIMITS } from "@/lib/limits"

export const Route = createFileRoute("/_authenticated/places")({
  component: PlacesPage,
})

const TABS = [
  { key: "ALL", label: <Trans>All</Trans> },
  { key: "ACTIVE", label: <Trans>Active</Trans> },
  { key: "UNDER_MAINTENANCE", label: <Trans>Under maintenance</Trans> },
  { key: "INACTIVE", label: <Trans>Inactive</Trans> },
] as const

type TabKey = (typeof TABS)[number]["key"]

const STATS = [
  { key: "assets", label: <Trans>Assets</Trans> },
  { key: "openTickets", label: <Trans>Open tickets</Trans> },
  { key: "workers", label: <Trans>Workers</Trans> },
] as const

type StatKey = (typeof STATS)[number]["key"]

// Three rows of three cards at 1440.
const PAGE_SIZE = 12

function PlacesPage() {
  const { accessToken, user } = useAuth()
  // Workers cannot list a place's workers, so they do not get that column.
  const isManager = user?.role === "MANAGER"
  const stats = STATS.filter((s) => s.key !== "workers" || isManager)
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [counts, setCounts] = useState<Record<string, PlaceCounts>>({})
  const [workerCounts, setWorkerCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState(false)
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<TabKey>("ALL")
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const { number } = useFormat()

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((list) => alive && setPlaces(list))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [accessToken, reload])

  const q = query.trim().toLowerCase()
  const visible = useMemo(() => {
    if (!places) return []
    return places.filter((p) => {
      const matchesTab = tab === "ALL" || p.status === tab
      const matchesQuery =
        !q ||
        p.place_name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [places, tab, q])

  // Assets and open tickets for every place come from the dashboard, in one
  // request.
  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getDashboardRows(accessToken)
      .then((rows) => alive && setCounts(placeCounts(rows)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [accessToken])

  // Workers per place: one small request per place, for Managers only.
  useEffect(() => {
    if (!accessToken || !places || !isManager) return
    let alive = true
    void Promise.all(
      places.map((p) =>
        countPlaceWorkers(accessToken, p.id)
          .then((n) => [p.id, n] as const)
          .catch(() => null),
      ),
    ).then((list) => {
      if (!alive) return
      setWorkerCounts(
        Object.fromEntries(list.filter((c) => c !== null) as [string, number][]),
      )
    })
    return () => {
      alive = false
    }
  }, [accessToken, places, isManager])

  const statValue = (placeId: string, key: StatKey) => {
    const value =
      key === "workers" ? workerCounts[placeId] : counts[placeId]?.[key]
    return value ?? "\u2014"
  }

  const countFor = (key: TabKey) =>
    places?.filter((p) => key === "ALL" || p.status === key).length ?? 0

  // A new search or filter starts again at the first page.
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const shown = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const activeCount = number(countFor("ACTIVE"))
  const summary =
    places && places.length > 0
      ? isManager
        ? t`${plural(places.length, { one: "# place", other: "# places" })}, ${activeCount} of them active.`
        : t`Places assigned to you.`
      : undefined

  return (
    <Page
      title={isManager ? <Trans>Places</Trans> : <Trans>My places</Trans>}
      description={summary}
      phoneActions={false}
      phoneEnd={isManager ? { label: t`Add place`, icon: "plus", link: { to: "/place/new" } } : "bell"}
      actions={isManager && (
        <Link
          to="/place/new"
          className={cn(buttonVariants(), "am-btn am-solid")}
        >
          <Plus aria-hidden="true" />
          <Trans>Add place</Trans>
        </Link>
      )}
    >
      {/* One card holds the search, the filters, the list and its pages. */}
      <Panel className="gap-5">
        {/* Workers see only their own few places: no search and no filters (as designed). */}
        {isManager && (
          <ListToolbar
            filters={
              <FilterTabs
                label={t`Filter by status`}
                value={tab}
                onChange={(key) => {
                  setTab(key)
                  setPage(1)
                }}
                tabs={TABS.map((item) => ({ key: item.key, label: item.label, count: countFor(item.key) }))}
              />
            }
          >
            <ToolbarSearch
              id="q"
              label={t`Search`}
              placeholder={t`Search by place name or city`}
              maxLength={LIMITS.short}
              value={query}
              onChange={(value) => {
                setQuery(value)
                setPage(1)
              }}
            />
          </ListToolbar>
        )}

        {places === null && !error && <LoadingList />}

        {error && (
          <LoadError
            title={<Trans>Could not load places</Trans>}
            onRetry={() => {
              setError(false)
              setReload((n) => n + 1)
            }}
          />
        )}

        {places !== null && places.length === 0 && (
          <EmptyState
            title={<Trans>No places yet</Trans>}
            text={
              isManager ? (
                <Trans>Add your first place with the Add place button.</Trans>
              ) : (
                <Trans>Places your manager assigns you to show here.</Trans>
              )
            }
          />
        )}

        {places !== null && places.length > 0 && visible.length === 0 && (
          <EmptyState
            title={<Trans>No places match</Trans>}
            text={<Trans>Nothing matches this search. Clear it to see all places.</Trans>}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setTab("ALL")
                }}
              >
                <Trans>Clear filters</Trans>
              </Button>
            }
          />
        )}

        {/* One row of cards overflowed the page; the design's grid wraps them. */}
        <div style={S("display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); align-items: stretch; gap: 20px")}>
          {shown.map((p) => (
            <Link
              key={p.id}
              to="/place/$place_id"
              params={{ place_id: p.id }}
              className="am-lift"
              style={S(
                "display: flex; flex-direction: column; height: 100%; box-sizing: border-box; gap: 16px; text-decoration: none; color: inherit; background: #fff; border: 1px solid var(--border); padding: 20px; box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.1)"
              )}
            >
              <div
                style={S(
                  "display: flex; align-items: flex-start; justify-content: space-between; gap: 12px"
                )}
              >
                <div
                  style={S(
                    "display: flex; flex-direction: column; gap: 4px; min-width: 0"
                  )}
                >
                  <span style={S("font-size: 18px; font-weight: 700")}>
                    {p.place_name}
                  </span>
                  <span
                    style={S(
                      "display: flex; align-items: center; gap: 4px; color: var(--muted-foreground); font-size: 14px"
                    )}
                  >
                    <MapPin
                      aria-hidden="true"
                      style={S("width: 16px; height: 16px; display: block; flex: none")}
                    />
                    <TypeLabel type={p.place_type} />, {p.city}
                  </span>
                </div>
                <StatusBadge status={String(p.status)} />
              </div>

              <div
                style={S(
                  `display: grid; grid-template-columns: repeat(${stats.length}, minmax(0, 1fr)); gap: 12px; margin-top: auto; border-top: 1px solid var(--border); padding-top: 14px`
                )}
              >
                {stats.map((s) => (
                  <div
                    key={s.key}
                    style={S("display: flex; flex-direction: column; line-height: 1.4")}
                  >
                    <span style={S("font-size: 13px; color: var(--muted-foreground)")}>
                      {s.label}
                    </span>
                    <span
                      className="font-mono tabular-nums"
                      style={S("font-weight: 600")}
                    >
                      {statValue(p.id, s.key)}
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>

        <ListFooter
          page={current}
          pageSize={PAGE_SIZE}
          total={visible.length}
          range={(from, to, total) => t`${from} to ${to} of ${total} places`}
          onPage={setPage}
        />
      </Panel>

      {!isManager && places !== null && places.length > 0 && (
        <p style={S("margin: 0; font-size: 13px; color: var(--muted-foreground)")}>
          <Trans>Only the places assigned to you appear here.</Trans>
        </p>
      )}
    </Page>
  )
}
