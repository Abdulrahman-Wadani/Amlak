import type { ReactNode } from "react"
import { Trans } from "@lingui/react/macro"
import { Globe } from "lucide-react"
import { LANGUAGE_NAMES, useLanguage } from "@/lib/i18n"

/**
 * The signed-out screens (sign in, sign up, verify, forgot, reset, set up):
 * the navy brand panel with the skyline, the language button, and the form
 * card. Below 1120px the brand becomes a short header the card overlaps.
 */
export function AuthLayout({ children, headline = true }: { children: ReactNode; headline?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-[15px] leading-[1.6] text-foreground desk:flex-row desk:flex-wrap">
      {/* The desktop's brand panel. */}
      <aside className="relative hidden min-h-80 flex-[2_1_420px] flex-col gap-10 overflow-hidden bg-foreground px-14 pt-12 pb-14 text-white desk:flex">
        <Skyline className="absolute inset-0 size-full" />
        <div className="relative">
          <Wordmark size="desk" />
        </div>
        {headline && <Headline />}
      </aside>

      {/* The phone's brand header. */}
      <header className="relative flex flex-none flex-col gap-6 overflow-hidden bg-foreground px-5 pt-4 text-white desk:hidden">
        <div className="relative flex min-h-11 items-center justify-between gap-3">
          <Wordmark size="phone" />
          <LanguageButton onDark />
        </div>
        {headline && (
          <p className="relative m-0 max-w-[22em] text-xl leading-[1.5] font-bold">
            <Trans>All your places, their maintenance and bookings in one place.</Trans>
          </p>
        )}
        <SkylineStrip className="relative -mx-5 block h-[106px] w-[calc(100%+2.5rem)]" />
      </header>

      <main className="flex flex-[3_1_480px] flex-col gap-6 px-4 pb-14 desk:px-8 desk:pt-6">
        <div className="hidden justify-end desk:flex">
          <LanguageButton />
        </div>
        <div className="relative -mt-9 flex flex-1 items-start justify-center desk:mt-0 desk:items-center">{children}</div>
      </main>
    </div>
  )
}

/** The white card of a signed-out screen, with its title and one line under it. */
export function AuthCard({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <section className="box-border flex w-full max-w-[460px] min-w-0 flex-col gap-7 border border-border bg-card p-5 shadow-sm desk:p-9">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-2xl leading-[1.3] font-bold desk:text-[30px]">{title}</h1>
        {subtitle && <p className="m-0 text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Headline() {
  return (
    <div className="relative flex max-w-[22em] flex-col gap-2.5">
      <p className="m-0 text-[30px] leading-[1.4] font-bold">
        <Trans>All your places, their maintenance and bookings in one place.</Trans>
      </p>
      <p className="m-0 text-base text-info-200">
        <Trans>For managers and workers, on phone and desktop.</Trans>
      </p>
    </div>
  )
}

function Wordmark({ size }: { size: "desk" | "phone" }) {
  const desk = size === "desk"
  return (
    <span className={`flex items-center ${desk ? "gap-[13px]" : "gap-2.5"}`}>
      <span
        aria-hidden="true"
        className={`flex flex-none items-center justify-center bg-white leading-none font-extrabold text-foreground ${desk ? "size-10 text-[22px]" : "size-[30px] text-base"}`}
      >
        <Trans comment="Brand glyph: negative-space letter inside the white tile; Arabic uses the letter أ">A</Trans>
      </span>
      <span className={`leading-none font-extrabold text-white ${desk ? "text-[31px]" : "text-[23px]"}`}>
        <Trans comment="Brand wordmark, Latin letters only in English">Amlak</Trans>
      </span>
    </span>
  )
}

/** Switches the interface to the other language; written in that language. */
export function LanguageButton({ onDark = false }: { onDark?: boolean }) {
  const { lang, setLang } = useLanguage()
  const other = lang === "ar" ? "en" : "ar"
  return (
    <button
      type="button"
      lang={other}
      onClick={() => setLang(other)}
      className={`am-btn am-ghost inline-flex h-11 cursor-pointer items-center gap-2 border bg-transparent px-3.5 text-sm font-semibold ${onDark ? "border-white/45 text-white" : "border-border text-foreground"}`}
    >
      <Globe aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
      {LANGUAGE_NAMES[other]}
    </button>
  )
}

// The buildings: where each stands in a 600 by 900 picture, and its colour.
const BUILDINGS = [
  { x: -20, y: 600, w: 130, h: 300, fill: "#243041" },
  { x: 110, y: 480, w: 90, h: 420, fill: "#375674" },
  { x: 200, y: 650, w: 150, h: 250, fill: "#243041" },
  { x: 350, y: 540, w: 110, h: 360, fill: "#4d7296" },
  { x: 460, y: 690, w: 160, h: 210, fill: "#c69a35" },
  { x: 560, y: 570, w: 80, h: 330, fill: "#243041" },
]

function Buildings() {
  return (
    <>
      {BUILDINGS.map((b) => {
        const cols = Math.floor((b.w - 18) / 34)
        const rows = Math.floor((b.h - 24) / 44)
        return (
          <g key={b.x}>
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
              )),
            )}
          </g>
        )
      })}
    </>
  )
}

function Skyline({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 600 900" preserveAspectRatio="xMidYMax slice" className={`pointer-events-none ${className}`}>
      <Buildings />
    </svg>
  )
}

/** The tops of the buildings, for the phone header. */
function SkylineStrip({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="-20 470 660 200" preserveAspectRatio="xMidYMin slice" className={`pointer-events-none ${className}`}>
      <Buildings />
    </svg>
  )
}
