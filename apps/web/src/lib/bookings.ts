import type { Booking } from "@/lib/api"

export const UPCOMING_DAYS = 30

export interface BookingGroups {
  checkIns: Booking[]
  checkOuts: Booking[]
  upcoming: Booking[]
}

/**
 * Splits one place's bookings by its local `today`: guests arriving today,
 * guests leaving today, and arrivals in the next UPCOMING_DAYS days.
 * Cancelled bookings are left out.
 */
export function groupBookings(bookings: Booking[], today: string, lastDay: string): BookingGroups {
  const live = bookings.filter((b) => b.status !== "CANCELLED")
  return {
    checkIns: live.filter((b) => b.check_in_date === today),
    checkOuts: live.filter((b) => b.check_out_date === today),
    upcoming: live
      .filter((b) => b.check_in_date > today && b.check_in_date <= lastDay)
      .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)),
  }
}
