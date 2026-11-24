import { createFileRoute, Link } from "@tanstack/react-router"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { Trans } from "@lingui/react/macro"
import {
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ExternalLink,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "cn"
import { useAuth } from "@/lib/auth"
import { LanguageButton } from "@/components/auth-layout"
import { buttonVariants } from "@/components/ui/button"

export const Route = createFileRoute("/")({
  component: Landing,
})

type Tone = "crit" | "warn" | "info" | "good"

const TONE: Record<Tone, string> = {
  crit: "bg-crit-50 text-crit-900",
  warn: "bg-warn-50 text-warn-700",
  info: "bg-info-50 text-info-700",
  good: "bg-good-50 text-good-700",
}

const PROBLEMS = [
  {
    icon: MessageSquare,
    tone: "crit",
    title: msg`Reports get lost in calls and chats`,
    text: msg`A broken tap or a leaking pipe is sent by phone or message, then forgotten.`,
  },
  {
    icon: Users,
    tone: "warn",
    title: msg`Nobody knows who fixes what`,
    text: msg`Without a clear assignment, workers repeat work or wait for someone to act.`,
  },
  {
    icon: CalendarDays,
    tone: "crit",
    title: msg`Bookings overlap`,
    text: msg`Stays written on paper or in separate chats end up on the same dates.`,
  },
  {
    icon: Receipt,
    tone: "warn",
    title: msg`Money is spread across notebooks`,
    text: msg`Expenses and income for each place are hard to total, so the profit is a guess.`,
  },
] as const

const SWAPS = [
  {
    label: msg`Maintenance`,
    before: msg`Reports scattered across calls and chats`,
    after: msg`One ticket with photos, an assigned worker and a clear status`,
  },
  {
    label: msg`Bookings`,
    before: msg`A paper calendar and double bookings`,
    after: msg`One calendar that blocks overlapping stays`,
  },
  {
    label: msg`Money`,
    before: msg`Income and expenses in separate notebooks`,
    after: msg`Income, expenses and profit for each place and currency`,
  },
] as const

const FEATURES = [
  {
    icon: Building2,
    tone: "info",
    title: msg`Places and assets`,
    text: msg`Add your properties and the assets inside them. Owners and assigned workers get the access they need.`,
  },
  {
    icon: LayoutDashboard,
    tone: "good",
    title: msg`A dashboard for every place`,
    text: msg`Assets by status, open and overdue tickets, today's check-ins and check-outs, and the maintenance budget.`,
  },
  {
    icon: Wrench,
    tone: "warn",
    title: msg`Maintenance tickets`,
    text: msg`Report issues with photos. Approve, reject or reassign them, then close them with after-photos.`,
  },
  {
    icon: CalendarClock,
    tone: "info",
    title: msg`Preventive maintenance`,
    text: msg`Schedule periodic work for each asset. Tickets are created for you when the work is due.`,
  },
  {
    icon: CalendarDays,
    tone: "good",
    title: msg`Bookings without conflicts`,
    text: msg`Manage stays on a calendar that blocks double bookings, and check guests in and out.`,
  },
  {
    icon: Receipt,
    tone: "warn",
    title: msg`Expenses and reports`,
    text: msg`Log expenses with receipt photos, and see income, expenses and profit per place and currency.`,
  },
  {
    icon: Bell,
    tone: "crit",
    title: msg`Reminders and notifications`,
    text: msg`Automatic reminders and overdue alerts by email and in the app, written in each person's language.`,
  },
  {
    icon: ShieldCheck,
    tone: "info",
    title: msg`Roles and accounts`,
    text: msg`Owners, workers and the admin each see what they need. Workers join through an invitation from their manager.`,
  },
] as const

const STEPS = [
  {
    title: msg`Create your account`,
    text: msg`Sign up with your email and enter the code we send you.`,
  },
  {
    title: msg`Add your places`,
    text: msg`Add each property and the assets inside it, then set who works on them.`,
  },
  {
    title: msg`Invite your team`,
    text: msg`Invite workers by email and set up the periodic maintenance schedules.`,
  },
  {
    title: msg`Follow everything`,
    text: msg`Track tickets, bookings and expenses from your dashboard, on phone or desktop.`,
  },
] as const

function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-[15px] leading-[1.6] text-foreground">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Features />
        <Problem />
        <Solution />
        <HowToUse />
      </main>
      <SiteFooter />
    </div>
  )
}

function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[30px] flex-none items-center justify-center text-base leading-none font-extrabold desk:size-9 desk:text-[19px]",
          onDark ? "bg-white text-foreground" : "bg-foreground text-white"
        )}
      >
        <Trans comment="Brand glyph: negative-space letter inside the white tile; Arabic uses the letter أ">A</Trans>
      </span>
      <span className={cn("text-[22px] leading-none font-extrabold", onDark ? "text-white" : "text-foreground")}>
        <Trans comment="Brand wordmark, Latin letters only in English">Amlak</Trans>
      </span>
    </span>
  )
}

function SectionLinks({ className }: { className: string }) {
  const { i18n } = useLingui()
  const links = [
    { href: "#features", label: i18n._(msg`Amlak features`) },
    { href: "#problem", label: i18n._(msg`The problem`) },
    { href: "#solution", label: i18n._(msg`The solution`) },
    { href: "#how", label: i18n._(msg`How to use`) },
  ]
  return (
    <nav aria-label={i18n._(msg`Main`)} className={className}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="am-nav inline-flex min-h-11 items-center px-3 text-sm font-semibold text-foreground no-underline"
        >
          {link.label}
        </a>
      ))}
    </nav>
  )
}

function SiteHeader() {
  const { user } = useAuth()
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card">
      <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between gap-3 px-4 desk:h-[72px] desk:px-8">
        <Link to="/" className="flex min-h-11 items-center text-foreground no-underline">
          <Brand />
        </Link>
        <SectionLinks className="hidden items-center gap-1 desk:flex" />
        <div className="flex items-center gap-2">
          <LanguageButton />
          {user ? (
            <Link to="/home" className={buttonVariants({ size: "sm" })}>
              <Trans>Home</Trans>
            </Link>
          ) : (
            <>
              <Link to="/signin" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden desk:inline-flex")}>
                <Trans>Sign in</Trans>
              </Link>
              <Link to="/signup" className={buttonVariants({ size: "sm" })}>
                <Trans>Create account</Trans>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

const BUILDINGS = [
  { x: -20, y: 600, w: 130, h: 300, fill: "#243041" },
  { x: 110, y: 480, w: 90, h: 420, fill: "#375674" },
  { x: 200, y: 650, w: 150, h: 250, fill: "#243041" },
  { x: 350, y: 540, w: 110, h: 360, fill: "#4d7296" },
  { x: 460, y: 690, w: 160, h: 210, fill: "#c69a35" },
  { x: 560, y: 570, w: 80, h: 330, fill: "#243041" },
]

function SkylineArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="-20 470 660 430"
      preserveAspectRatio="xMidYMax meet"
      className="pointer-events-none size-full"
    >
      {BUILDINGS.map((b, i) => {
        const cols = Math.floor((b.w - 18) / 34)
        const rows = Math.floor((b.h - 24) / 44)
        return (
          <g key={b.x} className="am-bar" style={{ animationDelay: `${i * 150}ms` }}>
            <rect x={b.x + 8} y={b.y + 8} width={b.w} height={b.h} fill="rgba(0,0,0,.25)" />
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.fill} />
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={b.x + 18 + c * 34}
                  y={b.y + 24 + r * 44}
                  width={14}
                  height={18}
                  fill="rgba(255,255,255,.16)"
                />
              ))
            )}
          </g>
        )
      })}
    </svg>
  )
}

function Hero() {
  return (
    <section className="overflow-hidden bg-foreground text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-16 pb-12 desk:px-8 desk:pt-28 desk:pb-16">
        <p className="m-0 w-fit border border-white/30 px-3 py-1 text-sm font-semibold text-info-200">
          <Trans>Property and maintenance management</Trans>
        </p>
        <h1 className="m-0 max-w-[22em] text-[30px] leading-[1.4] font-bold desk:text-[52px] desk:leading-[1.3]">
          <Trans>All your places, their maintenance and bookings in one place.</Trans>
        </h1>
        <p className="m-0 max-w-[34em] text-lg text-info-200">
          <Trans>For managers and workers, on phone and desktop.</Trans>
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link to="/signup" className={buttonVariants({ size: "lg" })}>
            <Trans>Create account</Trans>
          </Link>
          <Link
            to="/signin"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-white/45 bg-transparent text-white hover:bg-white/10"
            )}
          >
            <Trans>Sign in</Trans>
          </Link>
        </div>
      </div>
      <div className="h-[220px] desk:h-[300px]">
        <SkylineArt />
      </div>
    </section>
  )
}

function Section({
  id,
  eyebrow,
  title,
  children,
  band = false,
}: {
  id: string
  eyebrow: string
  title: ReactNode
  children: ReactNode
  band?: boolean
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-20 px-4 py-16 desk:px-8 desk:py-24", band && "border-y border-border bg-card")}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex max-w-[44em] flex-col gap-3">
          <p className="m-0 text-sm font-semibold text-primary">{eyebrow}</p>
          <h2 className="m-0 text-[26px] leading-[1.35] font-bold desk:text-[34px]">{title}</h2>
        </header>
        {children}
      </div>
    </section>
  )
}

function InfoCard({
  icon: Icon,
  tone,
  title,
  text,
}: {
  icon: LucideIcon
  tone: Tone
  title: string
  text: string
}) {
  return (
    <article className="am-lift flex flex-col gap-3 border border-border bg-card p-6 shadow-sm">
      <span className={cn("inline-flex size-11 flex-none items-center justify-center [&_svg]:size-5", TONE[tone])}>
        <Icon aria-hidden="true" />
      </span>
      <h3 className="m-0 text-lg leading-[1.4] font-bold">{title}</h3>
      <p className="m-0 text-muted-foreground">{text}</p>
    </article>
  )
}

function Features() {
  const { i18n } = useLingui()
  return (
    <Section
      id="features"
      eyebrow={i18n._(msg`Amlak features`)}
      title={<Trans>Everything you need to run your properties, in one app.</Trans>}
    >
      <div className="grid gap-4 sm:grid-cols-2 desk:grid-cols-4">
        {FEATURES.map((feature) => (
          <InfoCard
            key={feature.title.id}
            icon={feature.icon}
            tone={feature.tone}
            title={i18n._(feature.title)}
            text={i18n._(feature.text)}
          />
        ))}
      </div>
    </Section>
  )
}

function Problem() {
  const { i18n } = useLingui()
  return (
    <Section
      id="problem"
      eyebrow={i18n._(msg`The problem`)}
      title={<Trans>Managing properties the old way wastes time and money.</Trans>}
      band
    >
      <div className="grid gap-4 desk:grid-cols-2">
        {PROBLEMS.map((problem) => (
          <InfoCard
            key={problem.title.id}
            icon={problem.icon}
            tone={problem.tone}
            title={i18n._(problem.title)}
            text={i18n._(problem.text)}
          />
        ))}
      </div>
    </Section>
  )
}

function Solution() {
  const { i18n } = useLingui()
  return (
    <Section
      id="solution"
      eyebrow={i18n._(msg`The solution`)}
      title={<Trans>One platform that brings places, maintenance and money together.</Trans>}
    >
      <div className="flex flex-col gap-4">
        <div className="hidden gap-6 px-6 text-sm font-semibold text-muted-foreground desk:grid desk:grid-cols-[180px_1fr_1fr]">
          <span />
          <span>
            <Trans>Without Amlak</Trans>
          </span>
          <span className="text-good-700">
            <Trans>With Amlak</Trans>
          </span>
        </div>
        {SWAPS.map((row) => (
          <div
            key={row.label.id}
            className="grid gap-3 border border-border bg-card p-5 shadow-sm desk:grid-cols-[180px_1fr_1fr] desk:items-center desk:gap-6 desk:p-6"
          >
            <h3 className="m-0 text-lg font-bold">{i18n._(row.label)}</h3>
            <p className="m-0 flex items-start gap-2.5 text-muted-foreground">
              <X aria-hidden="true" className="mt-1 size-4 flex-none text-crit" />
              <span>{i18n._(row.before)}</span>
            </p>
            <p className="m-0 flex items-start gap-2.5 font-semibold text-good-900">
              <Check aria-hidden="true" className="mt-1 size-4 flex-none text-good" />
              <span>{i18n._(row.after)}</span>
            </p>
          </div>
        ))}
      </div>
    </Section>
  )
}

function HowToUse() {
  const { i18n } = useLingui()
  return (
    <Section
      id="how"
      eyebrow={i18n._(msg`How to use`)}
      title={<Trans>Four steps from signing up to running your properties.</Trans>}
      band
    >
      <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 desk:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title.id} className="flex flex-col gap-3 border border-border bg-background p-6 shadow-sm">
            <span className="font-mono text-3xl font-semibold text-primary tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="m-0 text-lg leading-[1.4] font-bold">{i18n._(step.title)}</h3>
            <p className="m-0 text-muted-foreground">{i18n._(step.text)}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}

const CONTACT_EMAIL = ""

const TEAM_ACCOUNTS = [
  { name: "Abdulrahman Wadani", href: "https://github.com/Abdulrahman-Wadani" },
  { name: "Abdulwahab al matrudi", href: "https://github.com/wahabxvii" },
  { name: "Azzam Al Duyuli", href: "https://github.com/CyberSpace0" },
]

function SiteFooter() {
  return (
    <footer className="bg-foreground px-4 py-14 text-white desk:px-8 desk:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <Brand onDark />

        <div className="flex flex-col gap-6 desk:flex-row desk:items-center desk:justify-between">
          <div className="flex max-w-[34em] flex-col gap-2">
            <h2 className="m-0 text-[26px] leading-[1.35] font-bold desk:text-[32px]">
              <Trans>Start managing your properties today.</Trans>
            </h2>
            <p className="m-0 text-info-200">
              <Trans>Create an account in a minute, then add your first place.</Trans>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup" className={buttonVariants({ size: "lg" })}>
              <Trans>Create account</Trans>
            </Link>
            <Link
              to="/signin"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-white/45 bg-transparent text-white hover:bg-white/10"
              )}
            >
              <Trans>Sign in</Trans>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-white/15 pt-10">
          {CONTACT_EMAIL && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="m-0 text-sm font-semibold text-info-200">
                <Trans>Contact</Trans>
              </h2>
              <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="font-semibold text-white break-all">
                {CONTACT_EMAIL}
              </a>
            </div>
          )}
          <div className="flex flex-col gap-3 desk:flex-row desk:items-center desk:gap-8">
            <h2 className="m-0 text-sm font-semibold text-info-200">
              <Trans>Team accounts</Trans>
            </h2>
            <ul className="m-0 flex list-none flex-wrap items-center gap-x-8 gap-y-3 p-0">
              {TEAM_ACCOUNTS.map((account) => (
                <li key={account.href} className="flex items-center gap-2.5">
                  <span className="font-bold">{account.name}</span>
                  <a
                    href={account.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm text-info-200 underline underline-offset-4"
                  >
                    <Trans>GitHub</Trans>
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
