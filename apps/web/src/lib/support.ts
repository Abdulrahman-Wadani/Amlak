import type { SupportTicket, SupportTicketStatus } from "@amlak/shared"

export type SupportFilter = "ALL" | SupportTicketStatus

/**
 * The support tickets to show for a status filter and a search: the search
 * matches the subject or the description, ignoring case and outer spaces.
 */
export function filterSupportTickets<
  T extends Pick<SupportTicket, "subject" | "description" | "status">,
>(tickets: T[], filter: SupportFilter, query: string): T[] {
  const q = query.trim().toLowerCase()
  return tickets.filter((ticket) => {
    const matchesFilter = filter === "ALL" || ticket.status === filter
    const matchesQuery =
      !q ||
      ticket.subject.toLowerCase().includes(q) ||
      ticket.description.toLowerCase().includes(q)
    return matchesFilter && matchesQuery
  })
}
