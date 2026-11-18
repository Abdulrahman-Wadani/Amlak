import { useEffect, useRef, useState, type ReactNode } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFormat } from "@/lib/format"

/**
 * The pieces the place, asset and worker screens share: the white card
 * sections, the two-column layout, label-and-value rows, a list that scrolls
 * inside its card, filter tabs and the list footer.
 */

/** A white card section with the hard shadow. `pad` is 24px, or 28px for a form card. */
export function Panel({
  children,
  className = "",
  pad = "md",
  labelledBy,
}: {
  children: ReactNode
  className?: string
  pad?: "md" | "lg"
  labelledBy?: string
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`box-border flex min-w-0 flex-col gap-3 border border-border bg-card shadow-sm ${pad === "lg" ? "p-5 desk:p-7" : "p-5 desk:p-6"} ${className}`}
    >
      {children}
    </section>
  )
}

/** A card's title (18px), or 16px in a side card. */
export function PanelTitle({ children, id, small = false }: { children: ReactNode; id?: string; small?: boolean }) {
  return (
    <h2 id={id} className={`m-0 leading-[1.4] font-bold ${small ? "text-base" : "text-lg"}`}>
      {children}
    </h2>
  )
}

/** The main column and the side column; the side column goes under the main one when there is no room. */
export function TwoColumns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 desk:gap-6">{main}</div>
      <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-4 desk:gap-6">{side}</div>
    </div>
  )
}

/** Label-and-value rows with a line between them (place information, asset details). */
export function InfoRows({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="m-0 flex flex-col">
      {rows.map((row, index) => (
        <div
          // The rows are fixed for a given screen.
          // biome-ignore lint/suspicious/noArrayIndexKey: the order never changes
          key={index}
          className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-t-0"
        >
          <dt className="text-sm text-muted-foreground">{row.label}</dt>
          <dd className="m-0 min-w-0 text-end font-medium [overflow-wrap:anywhere]">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * A list that scrolls inside its card when it is taller than 304px, fading
 * at the bottom. `hint` receives whether it scrolls, for the "Scroll to see
 * the rest" line in the card's header.
 */
export function ScrollList({
  label,
  children,
  onScrollable,
}: {
  label: string
  children: ReactNode
  onScrollable: (scrolls: boolean) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrolls, setScrolls] = useState(false)
  const report = useRef(onScrollable)
  report.current = onScrollable

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const next = element.scrollHeight > element.clientHeight + 1
      setScrolls(next)
      report.current(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    for (const child of Array.from(element.children)) observer.observe(child)
    return () => observer.disconnect()
  })

  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region must be reachable by keyboard
    <div
      ref={ref}
      role="region"
      aria-label={label}
      tabIndex={scrolls ? 0 : undefined}
      className={`box-border flex max-h-[304px] flex-none snap-y snap-mandatory flex-col gap-3 overflow-y-auto overscroll-contain [scrollbar-width:thin] ${scrolls ? "pb-10 [mask-image:linear-gradient(to_bottom,#000_calc(100%-40px),transparent)]" : ""}`}
    >
      {children}
    </div>
  )
}

/** The grey "Scroll to see the rest" line under a card title. */
export function ScrollHint() {
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
      <ChevronDown aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
      <Trans>Scroll to see the rest</Trans>
    </span>
  )
}

/** Square bullets, as in the side cards ("Before saving", "What a worker sees"). */
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm leading-[1.6]">
      {items.map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list
        <li key={index} className="flex items-start gap-2.5">
          <span aria-hidden="true" className="mt-[9px] size-1.5 flex-none bg-muted-foreground" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** A round initial (36px), for workers. */
export function Initial({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="inline-flex flex-none items-center justify-center rounded-full bg-secondary text-[15px] font-bold text-primary"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

/** Filter buttons with a count each (places, workers). They wrap; on the phone they scroll sideways in their row. */
export function FilterTabs<K extends string>({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string
  tabs: { key: K; label: ReactNode; count: number }[]
  value: K
  onChange: (key: K) => void
}) {
  const { number } = useFormat()
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex max-w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 [scrollbar-width:none] desk:mx-0 desk:max-w-full desk:flex-wrap desk:overflow-visible desk:px-0"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className="am-tab"
          aria-pressed={value === tab.key}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          <span className="am-tab-count">{number(tab.count)}</span>
        </button>
      ))}
    </div>
  )
}

/** "1 to 12 of 30 places" with Previous and Next, under a list shown a page at a time. */
export function ListFooter({
  page,
  pageSize,
  total,
  range,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  /** The text for the shown range, e.g. t`${from} to ${to} of ${total} places`. */
  range: (from: string, to: string, total: string) => string
  onPage: (page: number) => void
}) {
  const { number } = useFormat()
  if (total === 0) return null
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <nav aria-label={t`Pages`} className="flex flex-wrap items-center justify-between gap-3">
      <span aria-live="polite" className="text-sm text-muted-foreground">
        {range(number(from), number(to), number(total))}
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Trans>Previous</Trans>
        </Button>
        <Button type="button" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <Trans>Next</Trans>
        </Button>
      </div>
    </nav>
  )
}

/** A form field: the label above, a grey hint or a red error under it. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-error`} role="alert" className="text-[13px] text-destructive">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </div>
  )
}

/** Fields side by side (two at 1440, one under the other on the phone). */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">{children}</div>
}

/** A native select drawn like the inputs, with the chevron at the end. */
export function NativeSelect({
  id,
  value,
  onChange,
  children,
  disabled,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
  disabled?: boolean
  invalid?: boolean
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="box-border h-11 w-full appearance-none border border-input bg-card ps-3.5 pe-11 text-[15px] text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(77,114,150,.2)] disabled:bg-secondary disabled:text-muted-foreground aria-invalid:border-destructive"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute end-3.5 top-3 size-5 text-muted-foreground"
        strokeWidth={1.8}
      />
    </div>
  )
}

/** The form's buttons, at the end of the row. */
export function FormButtons({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-3">{children}</div>
}

/**
 * The phone's bottom bar for a form's main buttons (Send report, Approve),
 * in place of the tabs. On the desktop the buttons stay in the form.
 */
export function PhoneActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden="true" className="h-[calc(76px+env(safe-area-inset-bottom))] desk:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-border bg-card px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] desk:hidden [&>*]:flex-1">
        {children}
      </div>
    </>
  )
}

/** A choice of a few options as large buttons in a grid (priority). */
export function Segmented<K extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { key: K; label: ReactNode }[]
  value: K
  onChange: (key: K) => void
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const on = option.key === value
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.key)}
            className={`am-seg flex h-12 cursor-pointer items-center justify-center gap-1.5 border px-3 text-[15px] ${on ? "border-primary bg-primary/8 font-semibold text-primary" : "border-border bg-card font-medium text-foreground"}`}
          >
            {on && <Check aria-hidden="true" className="size-4" strokeWidth={1.8} />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
