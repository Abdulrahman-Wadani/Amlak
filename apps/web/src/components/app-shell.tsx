import { Link, Outlet, useLocation } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { useAuth } from "@/lib/auth"
import {
  currentTab,
  desktopNav,
  mobileTabs,
  roleLabel,
  sectionOf,
  type Role,
} from "@/lib/nav"
import { ShellProvider, useShell } from "@/components/shell-context"
import { Toasts } from "@/components/toast"

/**
 * The signed-in layout. From 1120px: a 72px top bar with the role's links and
 * the user at the end. Below 1120px (the phone layout): a 60px top bar with
 * the page title, and bottom tabs.
 */
export function AppShell({ role }: { role: Role }) {
  return (
    <ShellProvider>
      <Shell role={role} />
    </ShellProvider>
  )
}

function Shell({ role }: { role: Role }) {
  useLingui() // re-render the labels when the language changes
  const { tabs, setBar } = useShell()
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-[15px] leading-[1.6] text-foreground">
      <DesktopBar role={role} />
      <Toasts />
      {/* The phone top bar: each page portals its title and buttons into it (components/page.tsx). */}
      <header
        ref={setBar}
        className="sticky top-0 z-20 box-border flex h-[60px] flex-none items-center justify-between gap-2 border-b border-border bg-card px-2 desk:hidden"
      />
      <div className={tabs ? "flex-1 min-w-0 pb-[calc(68px+env(safe-area-inset-bottom))] desk:pb-0" : "flex-1 min-w-0"}>
        <Outlet />
      </div>
      {tabs && <PhoneTabs role={role} />}
    </div>
  )
}

export function Brand({ size }: { size: "desk" | "phone" }) {
  const tile =
    size === "desk"
      ? "size-[30px] text-base"
      : "size-7 text-[15px]"
  return (
    <span
      aria-hidden="true"
      className={`${tile} flex flex-none items-center justify-center bg-foreground leading-none font-extrabold text-white`}
    >
      <Trans comment="Brand glyph: negative-space letter inside the white tile; Arabic uses the letter أ">
        A
      </Trans>
    </span>
  )
}

function DesktopBar({ role }: { role: Role }) {
  const { user } = useAuth()
  const pathname = useLocation({ select: (l) => l.pathname })
  const section = sectionOf(pathname)
  const name = user?.fullname ?? ""
  const initial = Array.from(name.trim())[0] ?? ""
  const roleName = roleLabel(role)
  return (
    <nav
      aria-label={t`Main menu`}
      className="hidden flex-none border-b border-border bg-card text-foreground desk:block"
    >
      <div className="mx-auto box-border flex min-h-[72px] max-w-[1240px] items-center gap-8 px-10">
        <div className="flex items-center gap-2.5">
          <Brand size="desk" />
          <span className="text-[23px] leading-none font-extrabold text-foreground">
            <Trans>Amlak</Trans>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {desktopNav(role).map((item) => {
            const current = item.section === section
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: true }}
                aria-current={current ? "page" : undefined}
                className={`am-nav flex h-11 items-center gap-2 px-3 whitespace-nowrap text-foreground no-underline ${current ? "bg-secondary font-semibold" : "font-medium"}`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>
        <Link
          to="/profile"
          activeOptions={{ exact: true }}
          aria-label={t`Account, ${name}, ${roleName}`}
          aria-current={section === "account" ? "page" : undefined}
          className={`am-nav ms-auto flex h-[52px] items-center gap-2.5 px-3 text-foreground no-underline ${section === "account" ? "bg-secondary" : ""}`}
        >
          <span
            aria-hidden="true"
            className="inline-flex size-9 flex-none items-center justify-center rounded-full bg-secondary text-[15px] font-bold text-primary"
          >
            {initial}
          </span>
          <span aria-hidden="true" className="flex flex-col leading-[1.4]">
            <span className="text-sm font-semibold">{name}</span>
            <span className="text-[13px] text-muted-foreground">{roleName}</span>
          </span>
        </Link>
      </div>
    </nav>
  )
}

function PhoneTabs({ role }: { role: Role }) {
  const pathname = useLocation({ select: (l) => l.pathname })
  const current = currentTab(role, sectionOf(pathname))
  return (
    <nav
      aria-label={t`Main menu`}
      className="fixed inset-x-0 bottom-0 z-20 flex h-[calc(68px+env(safe-area-inset-bottom))] border-t border-border bg-card pb-[env(safe-area-inset-bottom)] desk:hidden"
    >
      {mobileTabs(role).map((item) => {
        const on = item.section === current
        return (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: true }}
            aria-current={on ? "page" : undefined}
            // As in the design: flex 1 without min-width 0, so a long label
            // (Arabic "Users", English "Announcements") widens its tab instead of being cut.
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs whitespace-nowrap no-underline ${on ? "font-semibold text-primary" : "font-medium text-muted-foreground"}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
