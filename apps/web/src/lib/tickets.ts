import type { Ticket } from "@amlak/shared"

/** Earliest due date first; tickets without one go last, oldest first. */
export function byDueDate(
  a: Pick<Ticket, "due_date" | "created_at">,
  b: Pick<Ticket, "due_date" | "created_at">,
): number {
  if (a.due_date === b.due_date) return a.created_at.localeCompare(b.created_at)
  if (!a.due_date) return 1
  if (!b.due_date) return -1
  return a.due_date.localeCompare(b.due_date)
}
