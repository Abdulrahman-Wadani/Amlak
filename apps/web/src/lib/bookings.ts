import type { Booking } from "@/lib/api"

export const UPCOMING_DAYS = 30

export interface BookingGroups {
  checkIns: Booking[]
  checkOuts: Booking[]
  upcoming: Booking[]
}

/**
 * Splits one place's bookings by its local `today`, as the dashboard
 * counts them: CONFIRMED guests arriving today, CHECKED_IN guests leaving
 * today, and stays that are not cancelled and start in the next
 * UPCOMING_DAYS days.
 */
export function groupBookings(bookings: Booking[], today: string, lastDay: string): BookingGroups {
  return {
    checkIns: bookings.filter((b) => b.status === "CONFIRMED" && b.check_in_date === today),
    checkOuts: bookings.filter((b) => b.status === "CHECKED_IN" && b.check_out_date === today),
    upcoming: bookings
      .filter((b) => b.status !== "CANCELLED")
      .filter((b) => b.check_in_date > today && b.check_in_date <= lastDay)
      .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)),
  }
}
