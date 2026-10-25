import { useEffect, useMemo, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { Search, MapPin } from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getPlaces } from "@/lib/api"
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
import { StatusBadge, TypeLabel } from "@/components/place-shared"
import "@/styles/motion.css"


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

function PlacesPage() {
  const { accessToken } = useAuth()
  const [places, setPlaces] = useState<Place[] | null>(null)
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

  const countFor = (key: TabKey) =>
    places?.filter((p) => key === "ALL" || p.status === key).length ?? 0

  return (
    <div
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 20px"
      )}
    >
      <h1 style={S("font-size: 30px; font-weight: 800; margin: 0")}>
        <Trans>Places</Trans>
      </h1>

      <div style={S("display: flex; flex-direction: column; gap: 14px")}>
        <div style={S("max-width: 360px")}>
          <Label htmlFor="q">
            <Trans>Search</Trans>
          </Label>
          <div style={S("position: relative; margin-top: 4px")}>
            <Search
              aria-hidden="true"
              style={S(
                "position: absolute; inset-inline-start: 10px; top: 50%; translate: 0 -50%; width: 16px; height: 16px; color: var(--muted-foreground)"
              )}
            />
            <Input
              id="q"
              type="search"
              className="am-input"
              style={S("padding-inline-start: 32px; height: 36px")}
              placeholder={t`Search by place name or city`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div role="group" aria-label="Filter" style={S("display: flex; gap: 6px; flex-wrap: wrap")}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className="am-tab"
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span style={S("color: var(--muted-foreground); font-size: 12px")}>
                {countFor(t.key)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {places === null && !error && (
        <div style={S("display: flex; flex-direction: column; gap: 10px")}>
          <Skeleton style={S("height: 96px")} />
          <Skeleton style={S("height: 96px")} />
        </div>
      )}

      {error && (
        <p style={S("color: var(--muted-foreground)")}>
          <Trans>We could not load your places.</Trans>
        </p>
      )}

      {places !== null && visible.length === 0 && (
        <Empty style={S("padding: 40px")}>
          <EmptyHeader>
            <EmptyTitle>
              <Trans>No properties yet</Trans>
            </EmptyTitle>
            <EmptyDescription>
              <Trans>
                Nothing matches this search. Clear it to see all properties.
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

      <div style={S("display: flex; flex-direction: column; gap: 10px")}>
        {visible.map((p) => (
          <Link
            key={p.id}
            to="/place/$place_id"
            params={{ place_id: p.id }}
            className="am-lift"
            style={S(
              "display: block; text-decoration: none; color: inherit; border: 1px solid var(--border); padding: 16px 18px"
            )}
          >
            <div
              style={S(
                "display: flex; justify-content: space-between; align-items: flex-start; gap: 12px"
              )}
            >
              <div style={S("display: flex; flex-direction: column; gap: 6px")}>
                <span style={S("font-size: 17px; font-weight: 700")}>
                  {p.place_name}
                </span>
                <span
                  style={S(
                    "display: flex; align-items: center; gap: 6px; color: var(--muted-foreground); font-size: 13px"
                  )}
                >
                  <MapPin aria-hidden="true" style={S("width: 14px; height: 14px")} />
                  <TypeLabel type={p.place_type} />, {p.city}
                </span>
              </div>
              <StatusBadge status={String(p.status)} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
