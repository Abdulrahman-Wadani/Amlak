
import { useEffect, useMemo, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { CircleAlert, Search, UserRound, Phone } from "lucide-react"

import type { User } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { getUsers } from "@/lib/api"
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

import { StatusBadge } from "@/components/place-shared"
import { Page } from "@/components/page"

export const Route = createFileRoute("/_authenticated/admin/")({
  component: UsersPage,
})

// Labels are components so they translate at render, not at import.
const TABS = [
  { key: "ALL", label: <Trans>All</Trans> },
  { key: "ACTIVE", label: <Trans>Active</Trans> },
  { key: "INVITED", label: <Trans>Invited</Trans> },
  { key: "PENDING_VERIFICATION", label: <Trans>Pending verification</Trans> },
  { key: "DEACTIVATED", label: <Trans>Deactivated</Trans> },
] as const

type TabKey = (typeof TABS)[number]["key"]

function UsersPage() {
  const { accessToken } = useAuth()

  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<TabKey>("ALL")

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    getUsers(accessToken)
      .then((list) => {
        if (alive) setUsers(list)
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
    if (!users) return []

    return users.filter((user) => {
      const matchesTab =
        tab === "ALL" || user.status === tab

      const matchesQuery =
        !q ||
        user.fullname.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.phone ?? "").toLowerCase().includes(q) ||
        user.id.includes(q) 

      return matchesTab && matchesQuery
    })
  }, [users, tab, q])

  const countFor = (key: TabKey) =>
    users?.filter(
      (user) => key === "ALL" || user.status === key,
    ).length ?? 0

  return (
    <Page title={<Trans>Users</Trans>} phoneStart="logo" phoneEnd="none">

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
            htmlFor="user-search"
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
            id="user-search"
            type="search"
            className="am-input"
            style={S("padding-inline-start: 44px")}
            placeholder={t`Search by name, email, phone or ID`}
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
      {users === null && !error && (
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
          <Trans>We could not load the users.</Trans>
        </p>
      )}

      {/* Empty State */}
      {users !== null && !error && visible.length === 0 && (
        <Empty style={S("padding: 40px")}>
          <EmptyHeader>
            <EmptyTitle>
              {query || tab !== "ALL"
                ? t`No users match`
                : t`No users yet`}
            </EmptyTitle>

            <EmptyDescription>
              {query || tab !== "ALL"
                ? t`Try other search words or another filter.`
                : t`There are no users to show.`}
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
            ) : null}
          </EmptyHeader>
        </Empty>
      )}

      {/* Users Grid */}
      {visible.length > 0 && (
        <div
          style={S(
            "display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px",
          )}
        >
          {visible.map((user) => (
            <Link
              key={user.id}
              to="/admin/$admin_id"
              params={{ admin_id: user.id }}
              className="am-lift"
              style={S(
                "display: flex; flex-direction: column; gap: 10px; padding: 14px; min-height: 150px; text-decoration: none; color: inherit; background: #fff; border: 1px solid var(--border); box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.08)",
              )}
            >
              {/* User Info */}
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
                    {user.fullname}
                  </div>

                  <div
                    style={S(
                      "margin-top: 3px; font-size: 11px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap",
                    )}
                  >
                    <bdi dir="ltr">{user.email}</bdi>
                  </div>
                </div>
              </div>

              {/* Role and Status */}
              <div
                style={S(
                  "display: flex; align-items: center; justify-content: space-between; gap: 8px",
                )}
              >
                <span
                  style={S(
                    "font-size: 11px; color: var(--muted-foreground)",
                  )}
                >
                  {user.role}
                </span>

                <StatusBadge status={user.status} />
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
                    {user.phone || t`No phone number`}
                  </span>
                </span>

              </div>

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
