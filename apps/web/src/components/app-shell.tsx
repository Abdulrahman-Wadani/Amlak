import type { ReactNode } from "react"
import { Link, Outlet } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { useAuth } from "@/lib/auth"
import { S } from "@/lib/dom-style"

type NavItem = { to: string; label: ReactNode; d: string }

const NAV: NavItem[] = [
  {
    to: "/home",
    label: <Trans>Home</Trans>,
    d: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  },
  {
    to: "/places",
    label: <Trans>Places</Trans>,
    d: "M4 3h16v18H4zM9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3",
  },
  {
    to: "/finance",
    label: <Trans>Finance</Trans>,
    d: "M3 7h18v13H3zM5 7V6a2 2 0 0 1 2-2h10v3M16.5 13.5",
  },
  {
    to: "/workers",
    label: <Trans>Workers</Trans>,
    d: "M9 8a3.5 3.5 0 1 0 0-0M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6",
  },
]

const NAV_STYLE =
  "display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px; white-space: nowrap; text-decoration: none; color: var(--foreground); font-size: 14px; font-weight: 500"

const ICON_STYLE = S("display: block; flex: none; width: 18px; height: 18px")

function Icon({ d, children }: { d?: string; children?: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={ICON_STYLE}
    >
      {d ? <path d={d} /> : children}
    </svg>
  )
}

export function AppShell({ role }: { role: "manager" | "worker" | "admin" }) {
  useLingui() // subscribe so strings refresh on language flip
  const { user, logout } = useAuth()
  void role
  return (
    <div
      style={S(
        "min-height: 100vh; display: flex; flex-direction: column; background: var(--background); color: var(--foreground); font-family: var(--font-sans); font-size: 15px; line-height: 1.6"
      )}
    >
      <nav
        aria-label={t`Main menu`}
        style={S(
          "position: sticky; top: 0; z-index: 20; box-sizing: border-box; flex: none; display: flex; align-items: center; gap: 20px; height: 56px; padding: 0 20px; background: var(--card); color: var(--foreground); border-block-end: 1px solid var(--border)"
        )}
      >
        <Link
          to="/home"
          style={S(
            "display: flex; align-items: center; gap: 8px; text-decoration: none; flex: none"
          )}
        >
          <span
            aria-hidden="true"
            style={S(
              "width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; background: var(--foreground); color: var(--card); font-family: var(--font-sans); font-size: 14px; font-weight: 800; line-height: 1"
            )}
          >
            A
          </span>
          <span
            style={S(
              "font-family: var(--font-sans); font-size: 19px; font-weight: 800; line-height: 1; color: var(--foreground)"
            )}
          >
            Amlak
          </span>
        </Link>

        <div
          style={S(
            "display: flex; align-items: center; gap: 2px; min-width: 0; overflow-x: auto; scrollbar-width: none"
          )}
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="am-nav"
              activeProps={{ "aria-current": "page" }}
              style={S(NAV_STYLE)}
            >
              <Icon d={item.d} />
              {item.label}
            </Link>
          ))}
        </div>

        <div
          style={S(
            "margin-inline-start: auto; display: flex; align-items: center; gap: 10px; flex: none"
          )}
        >
          <Link
            to="/profile"
            className="am-nav"
            activeProps={{ "aria-current": "page" }}
            style={S(NAV_STYLE)}
          >
            <Icon>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </Icon>
            <Trans>Account</Trans>
          </Link>
          <span
            style={S(
              "display: flex; align-items: center; gap: 10px; border-inline-start: 1px solid var(--border); padding-inline-start: 12px"
            )}
          >
            <span style={S("font-size: 13px; font-weight: 600")}>
              {user?.fullname}
            </span>
            <button
              type="button"
              className="am-btn"
              onClick={() => logout()}
              style={S(
                "height: 30px; padding: 0 10px; border: 1px solid var(--foreground); background: transparent; color: var(--foreground); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer"
              )}
            >
              <Trans>Sign out</Trans>
            </button>
          </span>
        </div>
      </nav>

      <div style={S("flex: 1 1 auto; min-width: 0; box-sizing: border-box")}>
        <Outlet />
      </div>
    </div>
  )
}