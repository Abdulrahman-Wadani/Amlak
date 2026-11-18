import { useId, useState, type ReactNode } from "react"
import { Trans } from "@lingui/react/macro"
import { ChevronDown, ChevronUp, TriangleAlert } from "lucide-react"

const MONO = "font-mono tabular-nums"

/**
 * A home card: one number and one line, with "Details" opening the breakdown
 * in place (the design's progressive disclosure). With `icon` and
 * `compactOnPhone`, the phone shows the icon, title and line in a row with
 * the number at the end, as on the manager's phone home.
 */
export function StatCard({
  title,
  value,
  note,
  icon,
  iconTone,
  compactOnPhone = false,
  bar,
  details,
}: {
  title: ReactNode
  value: ReactNode
  note: ReactNode
  icon?: ReactNode
  iconTone?: "warn" | "info" | "good"
  compactOnPhone?: boolean
  /** A 0-100 progress bar under the note. */
  bar?: number | null
  details?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const tone =
    iconTone === "warn"
      ? "bg-warn-50 text-warn"
      : iconTone === "good"
        ? "bg-good-50 text-good"
        : "bg-info-50 text-info"
  const iconBox = icon && (
    <span aria-hidden="true" className={`inline-flex size-10 flex-none items-center justify-center ${tone} [&_svg]:size-5`}>
      {icon}
    </span>
  )
  const progress = bar != null && (
    <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden bg-secondary">
      <div className="am-fill h-full bg-good" style={{ width: `${Math.min(100, Math.max(0, bar))}%` }} />
    </div>
  )
  return (
    <section
      className={`box-border flex min-w-0 flex-col border border-border bg-card shadow-sm ${compactOnPhone ? "gap-1 p-[18px] desk:gap-2 desk:p-6" : "gap-2 p-6"}`}
    >
      {compactOnPhone && (
        <div className="flex flex-col desk:hidden">
          <div className="flex items-center gap-3.5">
            {iconBox}
            <div className="flex min-w-0 flex-1 flex-col leading-[1.45]">
              <span className="text-sm text-muted-foreground">{title}</span>
              <span className="text-[13px] text-muted-foreground">{note}</span>
            </div>
            <span className={`text-[30px] leading-none font-bold ${MONO}`}>{value}</span>
          </div>
          {progress}
        </div>
      )}
      <div className={`flex-col gap-1.5 ${compactOnPhone ? "hidden desk:flex" : "flex"}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] text-muted-foreground">{title}</span>
          {iconBox}
        </div>
        <span className={`text-[40px] leading-[1.15] font-bold ${MONO}`}>{value}</span>
        <span className="text-sm text-muted-foreground">{note}</span>
        {progress}
      </div>
      {details && (
        <>
          <button
            type="button"
            className="am-disclose -ms-3 inline-flex h-11 cursor-pointer items-center gap-1.5 self-start border-0 bg-transparent px-3 text-sm font-semibold text-primary"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((v) => !v)}
          >
            <span>{open ? <Trans>Hide details</Trans> : <Trans>Details</Trans>}</span>
            <ChevronDown aria-hidden="true" className={`size-4 ${open ? "rotate-180" : ""}`} strokeWidth={1.8} />
          </button>
          {open && (
            <div id={id} className="am-reveal flex flex-col border-t border-border pt-2">
              {details}
            </div>
          )}
        </>
      )}
    </section>
  )
}

/** A row inside a card's details: a bold line, a grey line, and something at the end. */
export function DetailRow({ title, sub, end }: { title: ReactNode; sub?: ReactNode; end?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <div className="flex min-w-0 flex-col leading-[1.5]">
        <span className="font-semibold">{title}</span>
        {sub && <span className="text-[13px] text-muted-foreground">{sub}</span>}
      </div>
      {end}
    </div>
  )
}

/** Priority as text, not a badge (design system): High and Urgent stand out. */
export function PriorityText({ priority }: { priority: string }) {
  if (priority === "URGENT" || priority === "HIGH") {
    const urgent = priority === "URGENT"
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap ${urgent ? "text-crit-900" : "text-warn-900"}`}>
        {urgent ? (
          <TriangleAlert aria-hidden="true" className="size-4" strokeWidth={1.8} />
        ) : (
          <ChevronUp aria-hidden="true" className="size-4" strokeWidth={1.8} />
        )}
        {urgent ? <Trans>Urgent</Trans> : <Trans>High</Trans>}
      </span>
    )
  }
  return (
    <span className="whitespace-nowrap text-muted-foreground">
      {priority === "MEDIUM" ? <Trans>Medium</Trans> : <Trans>Low</Trans>}
    </span>
  )
}

/** A place's status as a dot and text, as on the home place cards. */
export function PlaceStatusText({ status }: { status: string }) {
  const [text, dot, label] =
    status === "ACTIVE"
      ? ["text-good-700", "bg-good", <Trans key="a">Active</Trans>]
      : status === "UNDER_MAINTENANCE"
        ? ["text-warn-900", "bg-warn", <Trans key="m">Under maintenance</Trans>]
        : ["text-muted-foreground", "bg-muted-foreground", <Trans key="i">Inactive</Trans>]
  return (
    <span className={`mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold ${text}`}>
      <span aria-hidden="true" className={`size-2 flex-none rounded-full ${dot}`} />
      {label}
    </span>
  )
}

/** A link at the end of a card's details ("Review tickets", "Open my tasks"). */
export function DetailsLink({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 pt-2 text-sm font-semibold">{children}</span>
}
