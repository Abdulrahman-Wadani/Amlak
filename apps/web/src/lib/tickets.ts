import type { Ticket } from "@amlak/shared"

/**
 * Whether this user finishes the ticket: it is approved and assigned to them,
 * whatever their role. A Manager who took the ticket themselves completes it
 * like a worker would; the API checks the same (the assignee only).
 */
export function canCompleteTicket(
  ticket: Pick<Ticket, "status" | "assignee_id"> | null | undefined,
  userId: string | undefined,
): boolean {
  return Boolean(ticket && userId && ticket.status === "APPROVED" && ticket.assignee_id === userId)
}
