import { describe, expect, it } from "vitest"
import type { DashboardPlace } from "@/lib/api"
import { placeCounts } from "@/lib/places"

describe("placeCounts", () => {
  it("adds up every asset status and the open tickets", () => {
    const row = {
      place_id: "p1",
      place_name: "Test Chalet",
      status: "ACTIVE",
      assets: { GOOD: 2, NEEDS_MAINTENANCE: 1, UNDER_MAINTENANCE: 1, OUT_OF_SERVICE: 1 },
      open_tickets: { PENDING_REVIEW: 22, APPROVED: 22, overdue: 6 },
      today: { check_ins: 1, check_outs: 1 },
      maintenance_budget: null,
    } satisfies DashboardPlace

    // overdue tickets are already APPROVED, so they are not added again.
    expect(placeCounts([row])).toEqual({ p1: { assets: 5, openTickets: 44 } })
  })
})
