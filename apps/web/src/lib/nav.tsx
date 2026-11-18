import type { ReactNode } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"

export type Role = "MANAGER" | "WORKER" | "ADMIN"

/** A part of the app; the link for the current page's section is marked current. */
export type Section =
  | "home"
  | "places"
  | "tickets"
  | "bookings"
  | "finance"
  | "workers"
  | "account"
  | "users"
  | "support"
  | "announcements"
  | "content"

/** The section a path belongs to, or null (notifications, support for non-admins...). */
export function sectionOf(pathname: string): Section | null {
  const first = pathname.split("/")[1] ?? ""
  switch (first) {
    case "home":
      return "home"
    case "places":
    case "place":
      return "places"
    case "tickets":
    case "ticket":
      return "tickets"
    case "bookings":
      return "bookings"
    case "expenses":
    case "reports":
    case "finance":
      return "finance"
    case "workers":
    case "worker":
      return "workers"
    case "profile":
      return "account"
    case "admin":
      return "users"
    case "support":
      return "support"
    case "announcements":
      return "announcements"
    case "content":
      return "content"
    default:
      return null
  }
}

export interface NavItem {
  section: Section
  to: string
  label: ReactNode
  icon: ReactNode
}

const ICONS = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  places: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" />
    </>
  ),
  tickets: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.8-.4-.4-2.8z" />
  ),
  bookings: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M5 7V6a2 2 0 0 1 2-2h10v3" />
      <circle cx="16.5" cy="13.5" r="1" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14a6 6 0 0 1 3.5 6" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="m9 6 6 6-6 6" />,
}

export type IconName = keyof typeof ICONS

/** A 24px-grid line icon with a 1.8 stroke, as in the design. */
export function NavIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flex: "none" }}
      className={name === "back" ? "ltr:rotate-180" : undefined}
    >
      {ICONS[name]}
    </svg>
  )
}

/** The links of the desktop top bar, per role. Account is the user block at the end. */
export function desktopNav(role: Role): NavItem[] {
  switch (role) {
    case "ADMIN":
      return [
        { section: "users", to: "/admin", label: <Trans>Users</Trans>, icon: <NavIcon name="people" /> },
        { section: "support", to: "/support", label: <Trans>Support requests</Trans>, icon: <NavIcon name="inbox" /> },
        { section: "announcements", to: "/announcements", label: <Trans>Announcements</Trans>, icon: <NavIcon name="bell" /> },
        { section: "content", to: "/content", label: <Trans>Site content</Trans>, icon: <NavIcon name="globe" /> },
      ]
    case "WORKER":
      return [
        { section: "home", to: "/home", label: <Trans>Home</Trans>, icon: <NavIcon name="home" /> },
        { section: "places", to: "/places", label: <Trans>Places</Trans>, icon: <NavIcon name="places" /> },
        { section: "tickets", to: "/tickets", label: <Trans>My tasks</Trans>, icon: <NavIcon name="tickets" /> },
        { section: "bookings", to: "/bookings", label: <Trans>Bookings</Trans>, icon: <NavIcon name="bookings" /> },
      ]
    default:
      return [
        { section: "home", to: "/home", label: <Trans>Home</Trans>, icon: <NavIcon name="home" /> },
        { section: "places", to: "/places", label: <Trans>Places</Trans>, icon: <NavIcon name="places" /> },
        { section: "tickets", to: "/tickets", label: <Trans>Maintenance</Trans>, icon: <NavIcon name="tickets" /> },
        { section: "bookings", to: "/bookings", label: <Trans>Bookings</Trans>, icon: <NavIcon name="bookings" /> },
        { section: "finance", to: "/expenses", label: <Trans>Finance</Trans>, icon: <NavIcon name="finance" /> },
        { section: "workers", to: "/workers", label: <Trans>Workers</Trans>, icon: <NavIcon name="people" /> },
      ]
  }
}

const accountTab: NavItem = {
  section: "account",
  to: "/profile",
  label: <Trans>Account</Trans>,
  icon: <NavIcon name="user" />,
}

/** The bottom tabs of the phone layout, per role. */
export function mobileTabs(role: Role): NavItem[] {
  switch (role) {
    case "ADMIN":
      return [
        { section: "users", to: "/admin", label: <Trans>Users</Trans>, icon: <NavIcon name="people" /> },
        { section: "support", to: "/support", label: <Trans>Support</Trans>, icon: <NavIcon name="inbox" /> },
        { section: "announcements", to: "/announcements", label: <Trans>Announcements</Trans>, icon: <NavIcon name="bell" /> },
        { section: "content", to: "/content", label: <Trans>Content</Trans>, icon: <NavIcon name="globe" /> },
        accountTab,
      ]
    default:
      return [...desktopNav(role).slice(0, 4), accountTab]
  }
}

/**
 * The tab marked current on the phone. A manager reaches finance and workers
 * from Account, so those pages mark Account.
 */
export function currentTab(role: Role, section: Section | null): Section | null {
  if (role === "MANAGER" && (section === "finance" || section === "workers")) return "account"
  return section
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "ADMIN":
      return t`Admin`
    case "WORKER":
      return t`Worker`
    default:
      return t`Manager`
  }
}
