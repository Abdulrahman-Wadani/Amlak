import { describe, expect, it } from "vitest"
import type { Booking } from "@/lib/api"
import { groupBookings } from "@/lib/bookings"

const booking = (id: string, status: Booking["status"], check_in_date: string, check_out_date: string): Booking => ({
  id,
  place_id: "p1",
  guest_name: id,
  guest_phone: "+966500000000",
  guest_email: null,
  guest_count: 2,
  check_in_date,
  check_out_date,
  total_price: 100,
  currency: "SAR",
  status,
  notes: null,
  ready_for_check_in: false,
  cancellation_reason: null,
})

const today = "2026-11-17"
const lastDay = "2026-12-17"

describe("groupBookings", () => {
  const groups = groupBookings(
    [
      booking("arriving", "CONFIRMED", today, "2026-11-19"),
      booking("already-in", "CHECKED_IN", today, "2026-11-18"),
      booking("leaving", "CHECKED_IN", "2026-11-15", today),
      booking("left", "CHECKED_OUT", "2026-11-15", today),
      booking("cancelled-today", "CANCELLED", today, "2026-11-20"),
      booking("later", "CONFIRMED", "2026-11-25", "2026-11-26"),
      booking("sooner", "CONFIRMED", "2026-11-20", "2026-11-21"),
      booking("cancelled-later", "CANCELLED", "2026-11-22", "2026-11-23"),
      booking("too-far", "CONFIRMED", "2026-12-18", "2026-12-20"),
    ],
    today,
    lastDay,
  )

  it("counts CONFIRMED bookings that start today as check-ins", () => {
    expect(groups.checkIns.map((b) => b.id)).toEqual(["arriving"])
  })

  it("counts CHECKED_IN bookings that end today as check-outs", () => {
    expect(groups.checkOuts.map((b) => b.id)).toEqual(["leaving"])
  })

  it("lists stays that start after today and up to the last day, soonest first, without cancelled ones", () => {
    expect(groups.upcoming.map((b) => b.id)).toEqual(["sooner", "later"])
  })
})
