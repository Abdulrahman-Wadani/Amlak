import { describe, expect, it } from "vitest"
import { canCompleteTicket } from "@/lib/tickets"

describe("canCompleteTicket", () => {
  const approved = { status: "APPROVED" as const, assignee_id: "u1" }

  it("lets the assignee of an approved ticket complete it, whatever their role", () => {
    // The same check for a worker and for a manager who assigned themselves.
    expect(canCompleteTicket(approved, "u1")).toBe(true)
  })

  it("does not let anyone else complete it", () => {
    expect(canCompleteTicket(approved, "u2")).toBe(false)
    expect(canCompleteTicket(approved, undefined)).toBe(false)
  })

  it("only completes approved tickets", () => {
    for (const status of ["PENDING_REVIEW", "REJECTED", "COMPLETED"] as const) {
      expect(canCompleteTicket({ status, assignee_id: "u1" }, "u1")).toBe(false)
    }
  })

  it("needs a ticket with an assignee", () => {
    expect(canCompleteTicket(null, "u1")).toBe(false)
    expect(canCompleteTicket({ status: "APPROVED", assignee_id: null }, "u1")).toBe(false)
  })
})
