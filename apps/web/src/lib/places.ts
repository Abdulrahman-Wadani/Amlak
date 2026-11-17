import type { DashboardPlace } from "@/lib/api"

export interface PlaceCounts {
  /** Assets in every status. */
  assets: number
  /** Tickets waiting for review or approved, as the dashboard counts them. */
  openTickets: number
}

/** The places page's counts, from the dashboard's rows (one per place). */
export function placeCounts(rows: DashboardPlace[]): Record<string, PlaceCounts> {
  return Object.fromEntries(
    rows.map((row) => [
      row.place_id,
      {
        assets:
          row.assets.GOOD +
          row.assets.NEEDS_MAINTENANCE +
          row.assets.UNDER_MAINTENANCE +
          row.assets.OUT_OF_SERVICE,
        openTickets: row.open_tickets.PENDING_REVIEW + row.open_tickets.APPROVED,
      },
    ]),
  )
}
