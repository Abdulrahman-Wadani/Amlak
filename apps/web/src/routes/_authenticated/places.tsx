import { useEffect, useMemo, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { CircleAlert, MapPin, Plus, Search } from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { countPlaceWorkers, getDashboardRows, getPlaces } from "@/lib/api"
import { placeCounts, type PlaceCounts } from "@/lib/places"
import { S } from "@/lib/dom-style"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { StatusBadge, TypeLabel } from "@/components/place-shared"
import { cn } from "cn"
import { Page } from "@/components/page"

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

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((list) => alive && setPlaces(list))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [accessToken])

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

  return (
    <Page
      title={<Trans>Places</Trans>}
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
      <div
        style={S(
          "display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px"
        )}
      >
        <div style={S("position: relative; flex: 1 1 320px; max-width: 320px")}>
          <Label
            htmlFor="q"
            style={S(
              "position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)"
            )}
          >
            <Trans>Search</Trans>
          </Label>
          <Search
            aria-hidden="true"
            style={S(
              "position: absolute; top: 12px; inset-inline-start: 14px; width: 20px; height: 20px; color: var(--muted-foreground); pointer-events: none"
            )}
          />
          <Input
            id="q"
            type="search"
            className="am-input"
            style={S("padding-inline-start: 44px")}
            placeholder={t`Search by place name or city`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div
          role="group"
          aria-label={t`Filter by status`}
          style={S("display: flex; gap: 8px; flex-wrap: wrap")}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className="am-tab"
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="am-tab-count">{countFor(t.key)}</span>
            </button>
          ))}
        </div>
      </div>

      {places === null && !error && (
        <div style={S("display: flex; flex-direction: column; gap: 12px")}>
          <Skeleton style={S("height: 122px")} />
          <Skeleton style={S("height: 122px")} />
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          <Trans>We could not load your places.</Trans>
        </p>
      )}

      {places !== null && places.length === 0 && (
        <Empty style={S("padding: 40px")}>
          <EmptyHeader>
            <EmptyTitle>
              <Trans>No places yet</Trans>
            </EmptyTitle>
            <EmptyDescription>
              {isManager ? (
                <Trans>Add your first place with the Add place button.</Trans>
              ) : (
                <Trans>Places your manager assigns you to show here.</Trans>
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {places !== null && places.length > 0 && visible.length === 0 && (
        <Empty style={S("padding: 40px")}>
          <EmptyHeader>
            <EmptyTitle>
              <Trans>No places match</Trans>
            </EmptyTitle>
            <EmptyDescription>
              <Trans>
                Nothing matches this search. Clear it to see all places.
              </Trans>
            </EmptyDescription>
            <Button
              size="sm"
              className="am-btn"
              onClick={() => {
                setQuery("")
                setTab("ALL")
              }}
            >
              <Trans>Clear filters</Trans>
            </Button>
          </EmptyHeader>
        </Empty>
      )}

      {/* One row of cards overflowed the page; the design's grid wraps them. */}
      <div style={S("display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 20px")}>
        {visible.map((p) => (
          <Link
            key={p.id}
            to="/place/$place_id"
            params={{ place_id: p.id }}
            className="am-lift"
            style={S(
              "display: flex; flex-direction: column; gap: 16px; text-decoration: none; color: inherit; background: #fff; border: 1px solid var(--border); padding: 20px; box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.1)"
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
                `display: grid; grid-template-columns: repeat(${stats.length}, minmax(0, 1fr)); gap: 12px; border-top: 1px solid var(--border); padding-top: 14px`
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
    </Page>
  )
}
