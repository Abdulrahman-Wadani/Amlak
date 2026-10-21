export type Place = {
  id: string
  place_name: string
  place_type: string
  address: string
  city: string
  status: "ACTIVE" | "INACTIVE" | "UNDER_MAINTENANCE"
}

export type Ticket = {
  id: string
  description: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "COMPLETED"
  due_date: string | null
  place: { place_name: string }
  assignee: { fullname: string } | null
}

const places: Place[] = [
  { id: "p1", place_name: "Villa 12", place_type: "Villa", address: "Al Zahra District", city: "Riyadh", status: "UNDER_MAINTENANCE" },
  { id: "p2", place_name: "Warehouse 2", place_type: "Warehouse", address: "Second Industrial City", city: "Dammam", status: "ACTIVE" },
  { id: "p3", place_name: "Store C", place_type: "Store", address: "Olaya Street", city: "Riyadh", status: "INACTIVE" },
]

const tickets: Ticket[] = [
  { id: "t1", description: "AC unit not cooling", priority: "URGENT", status: "APPROVED", due_date: "2026-10-22", place: { place_name: "Villa 12" }, assignee: { fullname: "Ahmed" } },
  { id: "t2", description: "Roof leak after rain", priority: "HIGH", status: "PENDING_REVIEW", due_date: "2026-10-25", place: { place_name: "Villa 12" }, assignee: null },
  { id: "t3", description: "Dock door sensor faulty", priority: "MEDIUM", status: "COMPLETED", due_date: "2026-10-18", place: { place_name: "Warehouse 2" }, assignee: { fullname: "Omar" } },
  { id: "t4", description: "Elevator monthly service", priority: "LOW", status: "APPROVED", due_date: "2026-10-30", place: { place_name: "Store C" }, assignee: { fullname: "Fahd" } },
]

export async function getPlaces(): Promise<Place[]> {
  return places
}

export async function getTickets(): Promise<Ticket[]> {
  return tickets
}
