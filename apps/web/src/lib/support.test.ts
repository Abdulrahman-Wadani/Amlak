import { describe, expect, it } from "vitest"
import type { SupportTicket } from "@amlak/shared"
import { filterSupportTickets } from "@/lib/support"

// A ticket as the API sends it: no fullname, email or phone.
const ticket = (overrides: Partial<SupportTicket>): SupportTicket => ({
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "00000000-0000-4000-8000-000000000002",
  subject: "Cannot upload photo",
  description: "The upload button does nothing on my phone.",
  status: "OPEN",
  admin_response: null,
  resolved_by: null,
  resolved_at: null,
  created_at: "2026-11-17T10:00:00.000Z",
  updated_at: "2026-11-17T10:00:00.000Z",
  ...overrides,
})

const tickets = [
  ticket({ id: "1", subject: "Cannot upload photo" }),
  ticket({ id: "2", subject: "Invoice question", description: "Where do I find invoices?", status: "RESOLVED" }),
]

describe("filterSupportTickets", () => {
  it("does not throw on a ticket while searching", () => {
    expect(() => filterSupportTickets(tickets, "ALL", "upload")).not.toThrow()
  })

  it("searches the subject and the description, ignoring case and outer spaces", () => {
    expect(filterSupportTickets(tickets, "ALL", "  UPLOAD ").map((t) => t.id)).toEqual(["1"])
    expect(filterSupportTickets(tickets, "ALL", "invoices").map((t) => t.id)).toEqual(["2"])
    expect(filterSupportTickets(tickets, "ALL", "nothing like this")).toEqual([])
  })

  it("returns everything for an empty search", () => {
    expect(filterSupportTickets(tickets, "ALL", "")).toHaveLength(2)
  })

  it("filters by status", () => {
    expect(filterSupportTickets(tickets, "OPEN", "").map((t) => t.id)).toEqual(["1"])
    expect(filterSupportTickets(tickets, "RESOLVED", "").map((t) => t.id)).toEqual(["2"])
    expect(filterSupportTickets(tickets, "RESOLVED", "upload")).toEqual([])
  })
})
