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
    to: "/tickets",
    label: <Trans>Maintenance</Trans>,
    d: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.8-.4-.4-2.8z",
  },
  {
    to: "/bookings",
    label: <Trans>Bookings</Trans>,
    d: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
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
  "display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 12px; border-radius: 0px; text-decoration: none; color: #1B2430; font-size: 15px; font-weight: 500"

export function AppShell({ role }: { role: "manager" | "worker" | "admin" }) {
  useLingui() // subscribe so strings refresh on language flip
  const { user, logout } = useAuth()
  void role
  return (
    <div
      style={S(
        "min-height: 100vh; display: flex; flex-wrap: wrap; background: var(--background); color: var(--foreground); font-family: var(--font-sans); font-size: 15px; line-height: 1.6"
      )}
    >
      <nav
        aria-label={t`Main menu`}
        style={S(
          "flex: 1 1 248px; box-sizing: border-box; background: #FFFFFF; color: #1B2430; border-inline-end: 1px solid #D3D9E2; padding: 24px 16px; display: flex; flex-direction: column; gap: 28px"
        )}
      >
        <div style={S("padding: 0 8px")}>
          <div style={S("display: flex; align-items: center; gap: 10px")}>
            <div
              aria-hidden="true"
              style={S(
                "width: 30px; height: 30px; flex: none; background: #1B2430; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-family: var(--font-sans); font-size: 16px; font-weight: 800; line-height: 1"
              )}
            >
              A
            </div>
            <span
              style={S(
                "font-family: var(--font-sans); font-size: 23px; font-weight: 800; line-height: 1; color: #1B2430"
              )}
            >
              Amlak
            </span>
          </div>
        </div>

        <div style={S("display: flex; flex-direction: column; gap: 4px")}>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="am-nav"
              activeProps={{ "aria-current": "page" }}
              style={S(NAV_STYLE)}
            >
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={S("display: block; flex: none")}
              >
                <path d={item.d} />
              </svg>
              {item.label}
            </Link>
          ))}
        </div>

        <div
          style={S(
            "margin-top: auto; display: flex; flex-direction: column; gap: 12px"
          )}
        >
          <Link
            to="/profile"
            className="am-nav"
            activeProps={{ "aria-current": "page" }}
            style={S(NAV_STYLE)}
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={S("display: block; flex: none")}
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
            <Trans>Account</Trans>
          </Link>
          <div
            style={S(
              "display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; border-top: 1px solid #D3D9E2"
            )}
          >
            <span style={S("font-size: 14px; font-weight: 600")}>
              {user?.fullname}
            </span>
            <button
              type="button"
              className="am-btn"
              onClick={() => logout()}
              style={S(
                "height: 32px; padding: 0 12px; border: 1px solid #1B2430; background: transparent; color: #1B2430; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer"
              )}
            >
              <Trans>Sign out</Trans>
            </button>
          </div>
        </div>
      </nav>

      <div style={S("flex: 4 1 0; min-width: 0; box-sizing: border-box")}>
        <Outlet />
      </div>
    </div>
  )
}
