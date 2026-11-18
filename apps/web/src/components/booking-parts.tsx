import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { plural, t } from "@lingui/core/macro"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Booking } from "@/lib/api"
import { useFormat } from "@/lib/format"
import { BookingStatusChip } from "@/components/place-shared"
import { Panel, PanelTitle, ScrollHint, ScrollList } from "@/components/panel"

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

/**
 * A month of a place's bookings: the nights of each stay are shaded and the
 * guest's name is on the arrival day (names on the desktop only).
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
          const day = isoDay(new Date(year, index, i + 1))
          const staying = stays.find((b) => b.check_in_date <= day && day < b.check_out_date)
          const arriving = stays.find((b) => b.check_in_date === day)
          return (
            <div
              key={day}
              className={`box-border flex min-h-11 min-w-0 flex-col items-center gap-1 rounded-[2px] border border-border p-1 desk:min-h-[92px] desk:items-start desk:p-2 ${staying ? "bg-primary/12" : "bg-card"}`}
            >
              <span
                className={`inline-flex size-[26px] items-center justify-center rounded-full text-[13px] ${day === today ? "bg-primary font-bold text-white" : "font-medium text-foreground"}`}
              >
                {i + 1}
              </span>
              {arriving && (
                <span className="hidden w-full truncate text-xs font-semibold text-primary desk:block">{arriving.guest_name}</span>
              )}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

/** The month's bookings as a list that scrolls inside its card. */
export function MonthBookings({ bookings }: { bookings: Booking[] }) {
  const [scrolls, setScrolls] = useState(false)
  const stay = useStayText()
  return (
    <Panel labelledBy="month-bookings">
      <div className="flex flex-col gap-0.5">
        <PanelTitle id="month-bookings">
          <Trans>Bookings this month</Trans>
        </PanelTitle>
        {scrolls && <ScrollHint />}
      </div>
      {bookings.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">
          <Trans>No bookings this month.</Trans>
        </p>
      ) : (
        <ScrollList label={t`Bookings this month`} onScrollable={setScrolls}>
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              to="/booking/$booking_id"
              params={{ booking_id: booking.id }}
              className="am-lift box-border flex min-h-[76px] flex-none snap-start items-center justify-between gap-3 border border-border bg-card p-3.5 text-foreground no-underline"
            >
              <span className="flex min-w-0 flex-col leading-[1.5]">
                <span dir="auto" className="truncate font-semibold">
                  {booking.guest_name}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {stay(booking, booking.status === "CONFIRMED" || booking.status === "CHECKED_IN")}
                </span>
              </span>
              <BookingStatusChip status={booking.status} />
            </Link>
          ))}
        </ScrollList>
      )}
    </Panel>
  )
}
