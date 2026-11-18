
import { useEffect, useMemo, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import {
  CircleAlert,
  MapPin,
  Plus,
  Search,
  UserRound,
  Phone,
} from "lucide-react"

import { useAuth } from "@/lib/auth"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import type { Worker } from "@amlak/shared"
import { getWorkers } from "@/lib/api"
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

import { StatusBadge } from "@/components/place-shared"
import { cn } from "cn"
import { Page } from "@/components/page"

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

function WorkersPage() {
  const { accessToken } = useAuth()

  const [workers, setWorkers] = useState<Worker[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<TabKey>("ALL")

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    getWorkers(accessToken)
      .then((list) => {
        if (alive) setWorkers(list)
      })
      .catch(() => {
        if (alive) setError(true)
      })

    return () => {
      alive = false
    }
  }, [accessToken])

  const q = query.trim().toLowerCase()

  const visible = useMemo(() => {
    if (!workers) return []

    return workers.filter((worker) => {
      const matchesTab =
        tab === "ALL" || worker.status === tab

      const matchesQuery =
        !q ||
        worker.fullname.toLowerCase().includes(q) ||
        worker.email.toLowerCase().includes(q) ||
        (worker.phone ?? "").toLowerCase().includes(q)

      return matchesTab && matchesQuery
    })
  }, [workers, tab, q])

  const countFor = (key: TabKey) =>
    workers?.filter(
      (worker) => key === "ALL" || worker.status === key,
    ).length ?? 0

  return (
    <Page
      title={<Trans>Workers</Trans>}
      phoneActions={false}
      phoneEnd={{ label: t`Add worker`, icon: "plus", link: { to: "/worker/new" } }}
      actions={
        <Link to="/worker/new" className={cn(buttonVariants(), "am-btn am-solid")}>
          <Plus aria-hidden="true" />
          <Trans>Add worker</Trans>
        </Link>
      }
    >

      {/* Search and Filters */}
      <div
        style={S(
          "display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px",
        )}
      >
        <div
          style={S(
            "position: relative; flex: 1 1 320px; max-width: 320px",
          )}
        >
          <Label
            htmlFor="worker-search"
            style={S(
              "position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)",
            )}
          >
            <Trans>Search</Trans>
          </Label>

          <Search
            aria-hidden="true"
            style={S(
              "position: absolute; top: 12px; inset-inline-start: 14px; width: 20px; height: 20px; color: var(--muted-foreground); pointer-events: none",
            )}
          />

          <Input
            id="worker-search"
            type="search"
            className="am-input"
            style={S("padding-inline-start: 44px")}
            placeholder={t`Search by name, email or phone`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div
          role="group"
          aria-label={t`Filter by status`}
          style={S("display: flex; gap: 8px; flex-wrap: wrap")}
        >
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="am-tab"
              aria-pressed={tab === item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
              <span className="am-tab-count">
                {countFor(item.key)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {workers === null && !error && (
        <div
          style={S(
            "display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px",
          )}
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              style={S(
                "display: flex; flex-direction: column; gap: 12px; padding: 14px; min-height: 150px; border: 1px solid var(--border); background: #fff",
              )}
            >
              <div style={S("display: flex; align-items: center; gap: 10px")}>
                <Skeleton
                  style={S(
                    "width: 36px; height: 36px; border-radius: 10px",
                  )}
                />
                <div
                  style={S(
                    "flex: 1; display: flex; flex-direction: column; gap: 6px",
                  )}
                >
                  <Skeleton style={S("height: 12px; width: 65%")} />
                  <Skeleton style={S("height: 10px; width: 85%")} />
                </div>
              </div>

              <Skeleton style={S("height: 20px; width: 75px")} />
              <Skeleton style={S("height: 10px; width: 100%")} />
              <Skeleton style={S("height: 10px; width: 45%")} />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
          <CircleAlert
            aria-hidden="true"
            className="size-3.5 shrink-0"
          />
          <Trans>We could not load the workers.</Trans>
        </p>
      )}

      {/* Empty State */}
      {workers !== null && !error && visible.length === 0 && (
        <Empty style={S("padding: 40px")}>
          <EmptyHeader>
            <EmptyTitle>
              {query || tab !== "ALL"
                ? t`No workers match`
                : t`No workers yet`}
            </EmptyTitle>

            <EmptyDescription>
              {query || tab !== "ALL"
                ? t`Try other search words or another filter.`
                : t`Add your first worker to start managing your team.`}
            </EmptyDescription>

            {query || tab !== "ALL" ? (
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
            ) : (
              <Link
                to="/worker/new"
                className={cn(buttonVariants(), "am-btn am-solid")}
              >
                <Plus size={16} />
                <Trans>Add worker</Trans>
              </Link>
            )}
          </EmptyHeader>
        </Empty>
      )}

      {/* Workers Grid */}
      {visible.length > 0 && (
        <div
          style={S(
            "display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px",
          )}
        >
          {visible.map((worker) => (
            <Link
              key={worker.id}
              to="/worker/$worker_id"
              params={{ worker_id: worker.id }}
              className="am-lift"
              style={S(
                "display: flex; flex-direction: column; gap: 10px; padding: 14px; min-height: 150px; text-decoration: none; color: inherit; background: #fff; border: 1px solid var(--border); box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08)",
              )}
            >
              {/* Worker Info */}
              <div
                style={S(
                  "display: flex; align-items: center; gap: 9px; min-width: 0",
                )}
              >
                <div
                  style={S(
                    "width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--muted); flex-shrink: 0",
                  )}
                >
                  <UserRound size={17} />
                </div>

                <div style={S("min-width: 0; flex: 1")}>
                  <div
                    style={S(
                      "font-size: 13px; font-weight: 750; overflow: hidden; text-overflow: ellipsis; white-space: nowrap",
                    )}
                  >
                    {worker.fullname}
                  </div>

                  <div
                    style={S(
                      "margin-top: 3px; font-size: 11px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap",
                    )}
                  >
                    <bdi dir="ltr">{worker.email}</bdi>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <StatusBadge status={worker.status} />
              </div>

              {/* Phone and Places */}
              <div
                style={S(
                  "display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--muted-foreground)",
                )}
              >
                <span
                  style={S(
                    "display: flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap",
                  )}
                >
                  <Phone size={12} />
                  <span dir="ltr">
                    {worker.phone || t`No phone number`}
                  </span>
                </span>

                <span
                  style={S(
                    "display: flex; align-items: center; gap: 4px; flex-shrink: 0",
                  )}
                >
                  <MapPin size={12} />
                  <Trans>{worker.assigned_places?.length ?? 0} places</Trans>
                </span>
              </div>

              {/* Assigned Places */}
              {worker.assigned_places &&
                worker.assigned_places.length > 0 && (
                  <div
                    style={S(
                      "display: flex; flex-wrap: wrap; gap: 5px",
                    )}
                  >
                    {worker.assigned_places.slice(0, 2).map((place) => (
                      <span
                        key={place.place_id}
                        style={S(
                          "max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 4px 7px; background: var(--muted); color: var(--muted-foreground); font-size: 10px",
                        )}
                      >
                        {place.place_name}
                      </span>
                    ))}

                    {worker.assigned_places.length > 2 && (
                      <span
                        style={S(
                          "padding: 4px 7px; background: var(--muted); color: var(--muted-foreground); font-size: 10px",
                        )}
                      >
                        +{worker.assigned_places.length - 2}
                      </span>
                    )}
                  </div>
                )}

              {/* Footer */}
              <div
                style={S(
                  "margin-top: auto; padding-top: 8px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 650; color: var(--muted-foreground)",
                )}
              >
                <Trans>View details</Trans>
                <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  )
}
