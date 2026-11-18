import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { Bell, ChevronRight, Inbox, LogOut, Users, Wallet } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

const SECTION =
  "box-border flex min-w-0 flex-col border border-border bg-card p-6 shadow-sm"

/**
 * Account → Manage: on the phone, a manager reaches workers, finance and
 * notifications from here, since the bottom tabs hold only five links.
 */
export function ManageLinks() {
  const { user } = useAuth()
  if (user?.role !== "MANAGER") return null
  return (
    <section aria-labelledby="manage-title" className={`${SECTION} gap-1 desk:hidden`}>
      <h2 id="manage-title" className="m-0 text-lg leading-[1.4] font-bold">
        <Trans>Manage</Trans>
      </h2>
      <div className="flex flex-col">
        <ManageLink link={{ to: "/workers" }} icon={<Users />}>
          <Trans>Workers</Trans>
        </ManageLink>
        <ManageLink link={{ to: "/expenses" }} icon={<Wallet />}>
          <Trans>Expenses</Trans>
        </ManageLink>
        <ManageLink link={{ to: "/reports" }} icon={<Wallet />}>
          <Trans>Financial reports</Trans>
        </ManageLink>
        <ManageLink link={{ to: "/notifications" }} icon={<Bell />}>
          <Trans>Notifications</Trans>
        </ManageLink>
      </div>
    </section>
  )
}

function ManageLink({ link, icon, children }: { link: LinkProps; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      {...link}
      className="am-nav flex h-[52px] items-center justify-between gap-3 border-t border-border text-foreground no-underline"
    >
      <span className="flex items-center gap-3 font-medium text-foreground [&_svg]:size-5 [&_svg]:flex-none [&_svg]:text-primary [&_svg]:stroke-[1.8]">
        {icon}
        {children}
      </span>
      <ChevronRight aria-hidden="true" className="size-[18px] flex-none text-muted-foreground rtl:rotate-180" strokeWidth={1.8} />
    </Link>
  )
}

/** Account → Security: support requests and signing out (both left the top bar). */
export function SecurityLinks() {
  const { logout } = useAuth()
  return (
    <section aria-labelledby="security-title" className={`${SECTION} gap-4`}>
      <h2 id="security-title" className="m-0 text-lg leading-[1.4] font-bold">
        <Trans>Security</Trans>
      </h2>
      <Row
        title={<Trans>Support</Trans>}
        hint={<Trans>Send a problem or a question to the Amlak team.</Trans>}
      >
        <Link to="/support" className={cn(buttonVariants({ variant: "outline" }), "no-underline")}>
          <Inbox aria-hidden="true" strokeWidth={1.8} />
          <Trans>Support requests</Trans>
        </Link>
      </Row>
      <div aria-hidden="true" className="h-px bg-border" />
      <Row title={<Trans>Sign out</Trans>} hint={<Trans>On this device.</Trans>}>
        <Button type="button" variant="destructive-soft" onClick={() => logout()}>
          <LogOut aria-hidden="true" className="rtl:rotate-180" strokeWidth={1.8} />
          <Trans>Sign out</Trans>
        </Button>
      </Row>
    </section>
  )
}

function Row({ title, hint, children }: { title: ReactNode; hint: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </div>
      {children}
    </div>
  )
}
