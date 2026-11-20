import { useEffect, useState } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CalendarX } from "lucide-react"
import { listAllBookingsForPlace, type Booking } from "@/lib/api"
import { useFormat } from "@/lib/format"
import { Notice } from "@/components/states"
import { useStayText } from "@/components/booking-parts"

/**
 * What a corrective ticket's repair day does to the place's bookings, read
 * before the Manager saves it (the API applies the same rules): a guest
 * staying that day blocks the day, and confirmed bookings covering it will be
 * cancelled. Preventive tickets leave bookings alone.
 */
export function useRepairDay(token: string | null, corrective: boolean, placeId: string, day: string) {
  const [found, setFound] = useState<{ day: string; bookings: Booking[] } | null>(null)

  useEffect(() => {
    if (!token || !corrective || !placeId || !day) return
    let alive = true
    listAllBookingsForPlace(token, placeId, { from: day, to: day })
      .then((list) => alive && setFound({ day, bookings: list }))
      .catch(() => alive && setFound({ day, bookings: [] }))
    return () => {
      alive = false
    }
  }, [token, corrective, placeId, day])

  const covering = found && found.day === day ? found.bookings.filter((b) => b.check_in_date <= day && day < b.check_out_date) : []
  return {
    staying: covering.find((b) => b.status === "CHECKED_IN") ?? null,
    cancels: covering.filter((b) => b.status === "CONFIRMED"),
  }
}

/** The notice under the due date: the day is taken by a staying guest, or bookings will be cancelled. */
export function RepairDayNotice({ staying, cancels }: { staying: Booking | null; cancels: Booking[] }) {
  const { date } = useFormat()
  const stay = useStayText()
  if (staying) {
    const leaves = date(staying.check_out_date, { day: "numeric", month: "long" })
    return (
      <Notice tone="crit" icon={<CalendarX />} title={<Trans>A guest is staying on this day</Trans>}>
        <Trans>
          <bdi>{staying.guest_name}</bdi> stays until {leaves}. Choose a day from {leaves} on.
        </Trans>
      </Notice>
    )
  }
  if (cancels.length === 0) return null
  return (
    <Notice tone="warn" icon={<CalendarX />} title={<Trans>The booking on this day will be cancelled</Trans>}>
      {cancels.map((booking) => (
        <span key={booking.id} className="block">
          {t`${booking.guest_name}, ${stay(booking, false)}`}
        </span>
      ))}
      <span className="block text-muted-foreground">
        <Trans>The assignee gets a notice with the guest’s phone number to contact them.</Trans>
      </span>
    </Notice>
  )
}
