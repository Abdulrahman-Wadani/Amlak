
import { useEffect, useMemo, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { CircleAlert, Plus, Search, UserRound } from "lucide-react"

import { t } from "@lingui/core/macro"
import type { SupportTicket } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getSupportTicket } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { filterSupportTickets, type SupportFilter } from "@/lib/support"
import { Trans } from "@lingui/react/macro"

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
import { UserSupport } from "@/components/user-support"

export const Route = createFileRoute("/_authenticated/support/")({
  component: SupportPage,
})

/** Admins answer every request; everyone else sends theirs and reads the replies. */
function SupportPage() {
  const { user } = useAuth()
  return user?.role === "ADMIN" ? <UsersPage /> : <UserSupport />
}

// Labels are components so they translate at render, not at import.
const TABS = [
  { key: "OPEN", label: <Trans>Open</Trans> },
  { key: "RESOLVED", label: <Trans>Resolved</Trans> },
] as const

type TabKey = SupportFilter

function UsersPage() {
  const { accessToken, user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const [ticket, setTicket] = useState<SupportTicket[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<TabKey>("ALL")

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    getSupportTicket(accessToken)
      .then((list) => {
        if (alive) setTicket(list)
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
    if (!ticket) return []

    return filterSupportTickets(ticket, tab, q)
  }, [ticket, tab, q])

  const countFor = (key: TabKey) =>
    ticket?.filter(
      (user) => key === "ALL" || user.status === key,
    ).length ?? 0

  return (
    <Page
      title={<Trans>Support tickets</Trans>}
      phoneStart={isAdmin ? "logo" : "none"}
      phoneBack={isAdmin ? undefined : { to: "/profile" }}
      phoneEnd="none"
      bell={!isAdmin}
      actions={
        <Link to="/support/new" className={cn(buttonVariants(), "am-btn am-solid")}>
          <Plus size={18} aria-hidden="true" />
          <Trans>Add ticket</Trans>
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
            placeholder={t`Search by subject or description`}
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
      {ticket === null && !error && (
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
          <Trans>We could not load the support tickets.</Trans>
        </p>
      )}

      {/* Empty State */}
      {ticket !== null && !error && visible.length === 0 && (
        <Empty style={S("padding: 40px")}>
          <EmptyHeader>
            <EmptyTitle>
              {query || tab !== "ALL"
                ? t`No tickets match`
                : t`No support tickets yet`}
            </EmptyTitle>

            <EmptyDescription>
              {query || tab !== "ALL"
                ? t`Try other search words or another filter.`
                : t`Tickets you open show here.`}
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

      {/* ticket Grid */}
      {visible.length > 0 && (
        <div
          style={S(
            "display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px",
          )}
        >
          {visible.map((user) => (
            <Link
              key={user.id}
              to="/support/$support_id"
              params={{ support_id: user.id }}
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
                    {user.subject}
                  </div>

                  <div
                    style={S(
                      "margin-top: 3px; font-size: 11px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap",
                    )}
                  >
                    {user.status === "OPEN" ? <Trans>Open</Trans> : <Trans>Resolved</Trans>}
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
                  {user.created_at}
                </span>

                <StatusBadge status={user.status} />
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
