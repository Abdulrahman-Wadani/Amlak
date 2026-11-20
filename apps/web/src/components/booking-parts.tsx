import { Link } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { plural, t } from "@lingui/core/macro"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Booking } from "@/lib/api"
import { useFormat } from "@/lib/format"
import { Panel } from "@/components/panel"

export function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Nights between two YYYY-MM-DD days. */
export function nightsBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000)
}

/** "21 to 24 October, 3 nights" (the months named when they differ). */
export function useStayText() {
  const { dateFormat } = useFormat()
  return (booking: Pick<Booking, "check_in_date" | "check_out_date">, withNights = true) => {
    // "17 – 19 November", written the way the language writes a range of days.
    const range = dateFormat({ day: "numeric", month: "long" }).formatRange(
      new Date(`${booking.check_in_date}T00:00:00`),
      new Date(`${booking.check_out_date}T00:00:00`),
    )
    if (!withNights) return range
    const nights = nightsBetween(booking.check_in_date, booking.check_out_date)
    const count = plural(nights, { one: "one night", other: "# nights" })
    return t`${range}, ${count}`
  }
}

/** The colours of a stay in the calendar, those of the booking status chips. */
const STAY_TONE: Record<string, string> = {
  CONFIRMED: "bg-info text-white desk:border-info",
  CHECKED_IN: "bg-good text-white desk:border-good",
  CHECKED_OUT: "bg-muted-foreground/50 desk:border-border desk:bg-secondary desk:text-muted-foreground",
}

/**
 * A month of a place's bookings. Each night of a stay has a bar in the
 * booking's status colour, with the guest's name where the stay starts and at
 * the start of each week (names on the desktop; a thin bar on the phone). A
 * day of a stay opens its booking. The key under the month names the colours.
 */
export function MonthCalendar({
  month,
  bookings,
  today,
  onMonth,
}: {
  month: Date
  bookings: Booking[]
  today: string
  onMonth: (month: Date) => void
}) {
  const { dateFormat } = useFormat()
  const stay = useStayText()
  const year = month.getFullYear()
  const index = month.getMonth()
  const first = new Date(year, index, 1)
  const days = new Date(year, index + 1, 0).getDate()
  const title = dateFormat({ month: "long", year: "numeric" }).format(first)
  const longDay = dateFormat({ weekday: "long" })
  const shortDay = dateFormat({ weekday: "short" })
  // Sunday first, as in the design; 4 Jan 2026 was a Sunday.
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2026, 0, 4 + i))
  const stays = bookings.filter((b) => b.status !== "CANCELLED")

  return (
    <Panel className="gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label={t`Previous month`}
          onClick={() => onMonth(new Date(year, index - 1, 1))}
          className="am-icon inline-flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-foreground"
        >
          <ChevronLeft aria-hidden="true" className="size-5 rtl:rotate-180" strokeWidth={1.8} />
        </button>
        <h2 aria-live="polite" className="m-0 text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          aria-label={t`Next month`}
          onClick={() => onMonth(new Date(year, index + 1, 1))}
          className="am-icon inline-flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-foreground"
        >
          <ChevronRight aria-hidden="true" className="size-5 rtl:rotate-180" strokeWidth={1.8} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 desk:gap-1.5">
        {weekdays.map((day) => (
          <div key={day.getDay()} className="pb-1 text-center text-xs font-semibold text-muted-foreground">
            <span className="hidden desk:inline">{longDay.format(day)}</span>
            <span className="desk:hidden">{shortDay.format(day)}</span>
          </div>
        ))}
        {Array.from({ length: first.getDay() }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: empty cells before the 1st
          <div key={`gap-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(year, index, i + 1)
          const day = isoDay(date)
          const next = isoDay(new Date(year, index, i + 2))
          const booking = stays.find((b) => b.check_in_date <= day && day < b.check_out_date)
          // The bar's ends are rounded where the stay starts or ends, and it
          // breaks at the end of a week or month, where the name shows again.
          const starts = booking && (booking.check_in_date === day || date.getDay() === 0 || i === 0)
          const ends = booking && (booking.check_out_date === next || date.getDay() === 6 || i === days - 1)
          return (
            <div
              key={day}
              className={`relative box-border flex min-h-11 min-w-0 flex-col items-center gap-1 rounded-[2px] border border-border bg-card p-1 desk:min-h-[92px] desk:items-stretch desk:p-2 ${day < today ? "text-muted-foreground" : "text-foreground"}`}
            >
              <span
                className={`inline-flex size-[26px] flex-none items-center justify-center self-center rounded-full text-[13px] desk:self-end ${day === today ? "bg-primary font-bold text-white" : "font-medium"}`}
              >
                {i + 1}
              </span>
              {booking && (
                <Link
                  to="/booking/$booking_id"
                  params={{ booking_id: booking.id }}
                  aria-label={t`${booking.guest_name}, ${stay(booking)}`}
                  title={`${booking.guest_name} · ${stay(booking)}`}
                  className={`mt-auto box-border block h-1.5 w-full min-w-0 truncate border-0 text-xs leading-[22px] font-semibold no-underline after:absolute after:inset-0 after:content-[''] desk:h-6 desk:border desk:px-1.5 ${STAY_TONE[booking.status] ?? STAY_TONE.CONFIRMED} ${starts ? "rounded-s-[3px]" : "desk:border-s-0"} ${ends ? "rounded-e-[3px]" : "desk:border-e-0"}`}
                >
                  <span aria-hidden="true" className="hidden desk:inline">
                    {starts ? <bdi>{booking.guest_name}</bdi> : null}
                  </span>
                </Link>
              )}
            </div>
          )
        })}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[13px] text-muted-foreground">
        {(
          [
            ["CONFIRMED", "bg-info", <Trans key="c">Confirmed</Trans>],
            ["CHECKED_IN", "bg-good", <Trans key="s">Staying</Trans>],
            ["CHECKED_OUT", "bg-muted-foreground/50", <Trans key="o">Checked out</Trans>],
          ] as const
        ).map(([key, swatch, label]) => (
          <li key={key} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className={`size-3 rounded-[2px] ${swatch}`} />
            {label}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

