
import { authFetch } from "./http"
import { apiError, readApiError } from "./errors"
import type { CreateBookingInput } from "@amlak/shared"
import type {
  Asset,
  CreateAssetInput,
  CreateSupportTicketInput,
  CreatePlaceInput,
  Expense,
  ExpenseCategory,
  Place,
  PlaceStatus,
  PlaceWorker,
  Schedule,
  SupportTicket,
  Ticket,
  TicketStatus,
  UpdateAssetInput,
  User,
  Worker,
} from "@amlak/shared"

// API response types
interface ApiResponse<T> {
  data: T
  message?: string
  pagination?: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

function normalizePlace(p: Place): Place {
  return {
    ...p,
    monthly_maintenance_budget: Number(
      p.monthly_maintenance_budget,
    ),
  }
}

// Extract data from the API response.
// Supports both { data: ... } and the old direct response.
function unwrapResponse<T>(response: unknown): T {
  if (
    response !== null &&
    typeof response === "object" &&
    "data" in response
  ) {
    return (response as ApiResponse<T>).data
  }

  return response as T
}

export interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

/** A list endpoint's page: the rows and the pagination the API sends. */
export interface PageOf<T> {
  data: T[]
  pagination: Pagination
}

/** GET a paginated list and keep its pagination (apiRequest drops it). */
export async function apiPage<T>(path: string, token: string): Promise<PageOf<T>> {
  const res = await authFetch(path, token)
  const body = (await res.json().catch(() => null)) as PageOf<T> | null
  if (!res.ok) throw apiError(res.status, body)
  if (!body || !Array.isArray(body.data) || !body.pagination) {
    throw new Error(`${path} returned no list`)
  }
  return body
}

/**
 * Every page of a list, for screens that sort by a field the API does not
 * order by. Stops after `maxPages` pages of 100.
 */
export async function apiAllPages<T>(
  path: string,
  token: string,
  maxPages = 20,
): Promise<T[]> {
  const join = path.includes("?") ? "&" : "?"
  const rows: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const result = await apiPage<T>(`${path}${join}page=${page}&page_size=100`, token)
    rows.push(...result.data)
    if (page >= result.pagination.total_pages) break
  }
  return rows
}

export async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await authFetch(path, token, options)

  const response: unknown = await res.json().catch(() => null)

  if (!res.ok) throw apiError(res.status, response)

  return unwrapResponse<T>(response)
}

// Places
/** Every place (the API sends 20 a page by default; this reads all pages, 100 at a time). */
export function getPlaces(token: string): Promise<Place[]> {
  return apiAllPages<Place>("/places", token).then((data) => data.map(normalizePlace))
}

export function getPlace(
  token: string,
  placeId: string,
): Promise<Place> {
  return apiRequest<Place>(`/places/${placeId}`, token).then(
    (data) => {
      if (!data || typeof data.id !== "string") {
        throw new Error("place not found")
      }

      return normalizePlace(data)
    },
  )
}

/** Every asset of a place (all pages, 100 at a time). */
export function getPlaceAssets(
  token: string,
  placeId: string,
): Promise<Asset[]> {
  return apiAllPages<Asset>(`/places/${placeId}/assets`, token)
}

export async function createAsset(
  token: string,
  placeId: string,
  input: CreateAssetInput,
): Promise<Asset> {
  const asset = await apiRequest<Asset>(
    `/places/${placeId}/assets`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        ...input,
        status: input.status ?? "GOOD",
      }),
    },
  )

  if (!asset || typeof asset.id !== "string") {
    throw new Error("asset not created")
  }

  return asset
}

export function updateAsset(
  token: string,
  assetId: string,
  input: UpdateAssetInput,
): Promise<Asset> {
  return apiRequest<Asset>(`/assets/${assetId}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export async function deleteAsset(token: string, assetId: string): Promise<void> {
  const response = await authFetch(`/assets/${assetId}`, token, {
    method: "DELETE",
  })
  if (!response.ok) throw await readApiError(response)
}

// Tickets
export interface TicketListQuery {
  status?: TicketStatus
  assignee_id?: string
  place_id?: string
  asset_id?: string
  /** newest (the default): last created first. due_date: soonest due first, none last. */
  sort?: "newest" | "due_date"
  /** true: PENDING_REVIEW and APPROVED, as the dashboard's open_tickets; false: the rest. */
  open?: boolean
}

export function ticketQuery(query: TicketListQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    // Booleans are sent as "true" or "false"; empty values are left out.
    if (value !== undefined && value !== "") params.set(key, String(value))
  }
  return params.toString()
}

/** Every ticket matching the query (all pages, 100 at a time). */
export function listAllTickets(token: string, query: TicketListQuery): Promise<Ticket[]> {
  const params = ticketQuery(query)
  return apiAllPages<Ticket>(`/tickets${params ? `?${params}` : ""}`, token)
}

/** One page of tickets, in the order `query.sort` asks for. */
export function listTickets(
  token: string,
  query: TicketListQuery,
  page: number,
  pageSize = 20,
): Promise<PageOf<Ticket>> {
  const params = ticketQuery(query)
  return apiPage<Ticket>(
    `/tickets?${params}${params ? "&" : ""}page=${page}&page_size=${pageSize}`,
    token,
  )
}


// Create place. A taken name is a 409 CONFLICT with details.fields.place_name.
export async function createPlace(
  token: string,
  input: CreatePlaceInput,
): Promise<Place> {
  const place = await apiRequest<Place>("/places", token, {
    method: "POST",
    body: JSON.stringify(input),
  })

  if (!place || typeof place.id !== "string") {
    throw new Error("place not created")
  }

  return normalizePlace(place)
}

// shortcut: packages/shared has no bookings.ts on this branch; when it lands,
// delete this shape and import Booking from @amlak/shared.
export type BookingStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"

export interface Booking {
  id: string
  place_id: string
  checked_in_at?: string | null
  checked_out_at?: string | null
  guest_name: string
  guest_phone: string
  guest_email: string | null
  guest_count: number
  check_in_date: string
  check_out_date: string
  total_price: number
  currency: string
  status: BookingStatus
  notes: string | null
  ready_for_check_in: boolean
  cancellation_reason: string | null
}

export interface BookingWindow {
  from: string
  to: string
}

export async function getBookingsForPlace(
  token: string,
  placeId: string,
  window: BookingWindow,
  page = 1,
): Promise<Booking[]> {
  const query = new URLSearchParams({
    from: window.from,
    to: window.to,
    page: String(page),
    page_size: "100",
  })

  return apiRequest<Booking[]>(
    `/places/${placeId}/bookings?${query.toString()}`,
    token,
  ).then((data) => {
    if (!Array.isArray(data)) {
      throw new Error("/bookings returned no list")
    }

    return data
  })
}

/** Every booking of a place that overlaps the window (pages of 100). */
export function listAllBookingsForPlace(
  token: string,
  placeId: string,
  window: BookingWindow,
): Promise<Booking[]> {
  const query = new URLSearchParams({ from: window.from, to: window.to })
  return apiAllPages<Booking>(
    `/places/${placeId}/bookings?${query.toString()}`,
    token,
  )
}

export async function createBooking(
  token: string,
  placeId: string,
  input: CreateBookingInput,
): Promise<Booking> {
  return apiRequest<Booking>(`/places/${placeId}/bookings`, token, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

/** One booking (Managers, and Workers of its place). */
export function getBooking(token: string, bookingId: string): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${bookingId}`, token)
}

export function checkInBooking(token: string, bookingId: string): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${bookingId}/check-in`, token, {
    method: "POST",
  })
}

export function checkOutBooking(token: string, bookingId: string): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${bookingId}/check-out`, token, {
    method: "POST",
  })
}

export function cancelBooking(
  token: string,
  bookingId: string,
  reason: string,
): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${bookingId}/cancel`, token, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}

/** The workers assigned to a place (Manager only), at most 100. */
export function getPlaceWorkers(
  token: string,
  placeId: string,
): Promise<PlaceWorker[]> {
  return apiRequest<PlaceWorker[]>(
    `/places/${placeId}/workers?page_size=100`,
    token,
  ).then((data) => {
    if (!Array.isArray(data)) {
      throw new Error("/places/{placeId}/workers returned no list")
    }

    return data
  })
}

/** Assigns one of the Manager's workers to a place. */
export async function assignPlaceWorker(token: string, placeId: string, workerId: string): Promise<void> {
  const response = await authFetch(`/places/${placeId}/workers`, token, {
    method: "POST",
    body: JSON.stringify({ worker_id: workerId }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw apiError(response.status, result)
}

/** Ends a worker's assignment to a place. */
export async function unassignPlaceWorker(token: string, placeId: string, workerId: string): Promise<void> {
  const response = await authFetch(`/places/${placeId}/workers/${workerId}`, token, { method: "DELETE" })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw apiError(response.status, result)
}

/** A place's dashboard row (its maintenance budget for this month, for Managers). */
export async function getPlaceHealth(token: string, placeId: string): Promise<DashboardPlace | null> {
  const result = await apiPage<DashboardPlace>(`/dashboard?place_id=${placeId}`, token)
  return result.data[0] ?? null
}

// Workers
/** Every worker of the Manager (all pages, 100 at a time). */
export function getWorkers(token: string): Promise<Worker[]> {
  return apiAllPages<Worker>("/workers", token)
}

export function getWorkerById(
  token: string,
  id: string,
): Promise<Worker> {
  return apiRequest<Worker>(`/workers/${id}`, token).then(
    (data) => {
      if (!data || typeof data.id !== "string") {
        throw new Error("worker not found")
      }

      return data
    },
  )
}

export async function createWorker(
  accessToken: string,
  payload: {
    fullname: string
    email: string
    phone: string
    preferred_language?: "ar" | "en"
  },
): Promise<Worker> {
  const worker = await apiRequest<Worker>(
    "/workers",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  )

  if (!worker || typeof worker.id !== "string") {
    throw new Error("worker not created")
  }

  return worker
}

// Update place
export async function updatePlace(
  accessToken: string,
  placeId: string,
  data: {
    place_name: string
    place_type: string
    city: string
    address: string | null
    description: string | null
    monthly_maintenance_budget: number | null
    latitude: number | null
    longitude: number | null
    status: PlaceStatus
    // No currency or timezone: the API sets them at creation only.
  },
): Promise<Place> {
  const place = await apiRequest<Place>(
    `/places/${placeId}`,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  )

  if (!place || typeof place.id !== "string") {
    throw new Error("Failed to update place")
  }

  return normalizePlace(place)
}

/** Changes a worker's name or phone, or deactivates (DEACTIVATED) or reactivates (ACTIVE) the account. */
export async function updateWorker(
  token: string,
  workerId: string,
  input: { fullname?: string; phone?: string; status?: "ACTIVE" | "DEACTIVATED" },
): Promise<Worker> {
  return apiRequest<Worker>(`/workers/${workerId}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export async function deleteWorker(
  token: string,
  workerId: string
): Promise<void> {
  const response = await authFetch(`/workers/${workerId}`, token, {
    method: "DELETE",
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) throw apiError(response.status, result)
}

export async function getAssetById(
  token: string,
  assetId: string,
): Promise<Asset> {
  return apiRequest<Asset>(`/assets/${assetId}`, token).then(
    (data) => {
      if (!data || typeof data.id !== "string") {
        throw new Error("asset not found")
      }

      return data
    },
  )
}

/** One ticket, with its photos (signed links that work for an hour). */
export function getTicketById(token: string, ticketId: string): Promise<Ticket> {
  return apiRequest<Ticket>(`/tickets/${ticketId}`, token)
}

// Finanace

export interface ExpenseListResponse {
  data: Expense[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

export interface ExpenseInput {
  category: ExpenseCategory
  amount: number
  expense_date: string
  description?: string
  ticket_id?: string
  receipt?: File | null
}

export interface FinancialReportPlace {
  place_id: string
  place_name: string
  currency: string
  total_income: number
  total_expenses: number
  profit: number
  expenses_by_category: Record<ExpenseCategory, number>
}

export interface FinancialReportTotal {
  currency: string
  total_income: number
  total_expenses: number
  profit: number
}

export interface FinancialReport {
  period: {
    from: string
    to: string
  }
  places: FinancialReportPlace[]
  totals_by_currency: FinancialReportTotal[]
}

export interface FinancialReportParams {
  from: string
  to: string
  place_id?: string
}

async function expenseMultipartRequest<T>(
  path: string,
  token: string,
  method: "POST" | "PUT",
  input: Partial<ExpenseInput>,
): Promise<T> {
  const formData = new FormData()

  if (input.category) formData.append("category", input.category)
  if (input.amount !== undefined) {
    formData.append("amount", String(input.amount))
  }
  if (input.expense_date) {
    formData.append("expense_date", input.expense_date)
  }
  if (input.description !== undefined) {
    formData.append("description", input.description)
  }
  if (input.ticket_id !== undefined) {
    formData.append("ticket_id", input.ticket_id)
  }
  if (input.receipt) {
    formData.append("receipt", input.receipt)
  }

  const response = await authFetch(path, token, {
    method,
    body: formData,
  })

  const result: unknown = await response.json().catch(() => null)

  if (!response.ok) throw apiError(response.status, result)

  return unwrapResponse<T>(result)
}

export async function expenseslist(
  token: string,
  placeId: string,
  params: {
    from?: string
    to?: string
    category?: ExpenseCategory
    page?: number
    page_size?: number
  } = {},
): Promise<Expense[]> {
  const query = new URLSearchParams()

  query.set("page", String(params.page ?? 1))
  query.set("page_size", String(params.page_size ?? 100))

  if (params.from) query.set("from", params.from)
  if (params.to) query.set("to", params.to)
  if (params.category) query.set("category", params.category)

  const result = await apiRequest<Expense[]>(
    `/places/${placeId}/expenses?${query.toString()}`,
    token,
  )

  if (!Array.isArray(result)) {
    throw new Error("Invalid expenses response")
  }

  return result
}

export async function getExpenseById(
  token: string,
  expenseId: string,
): Promise<Expense> {
  const expense = await apiRequest<Expense>(
    `/expenses/${expenseId}`,
    token,
  )

  if (!expense || typeof expense.id !== "string") {
    throw new Error("Expense not found")
  }

  return expense
}

export async function createExpense(
  token: string,
  placeId: string,
  input: ExpenseInput,
): Promise<Expense> {
  const expense = await expenseMultipartRequest<Expense>(
    `/places/${placeId}/expenses`,
    token,
    "POST",
    input,
  )

  if (!expense || typeof expense.id !== "string") {
    throw new Error("Expense was not created")
  }

  return expense
}

export async function updateExpense(
  token: string,
  expenseId: string,
  input: Partial<ExpenseInput>,
): Promise<Expense> {
  const expense = await expenseMultipartRequest<Expense>(
    `/expenses/${expenseId}`,
    token,
    "PUT",
    input,
  )

  if (!expense || typeof expense.id !== "string") {
    throw new Error("Expense was not updated")
  }

  return expense
}

export async function deleteExpense(
  token: string,
  expenseId: string,
): Promise<void> {
  const response = await authFetch(`/expenses/${expenseId}`, token, {
    method: "DELETE",
  })

  if (!response.ok) throw await readApiError(response)
}

export async function getFinancialReport(
  token: string,
  params: FinancialReportParams,
): Promise<FinancialReport> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
  })

  if (params.place_id) {
    query.set("place_id", params.place_id)
  }

  const report = await apiRequest<FinancialReport>(
    `/reports/financial?${query.toString()}`,
    token,
  )

  if (!report || !Array.isArray(report.places)) {
    throw new Error("Invalid financial report response")
  }

  return report
}


export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export interface CreateTicketInput {
  asset_id?: string
  priority?: TicketPriority
  description?: string
  photos?: File[]
}

export async function createTicket(
  token: string,
  placeId: string,
  input: CreateTicketInput,
) {
  const formData = new FormData()

  if (input.asset_id) {
    formData.append("asset_id", input.asset_id)
  }

  if (input.priority) {
    formData.append("priority", input.priority)
  }

  if (input.description) {
    formData.append("description", input.description)
  }

  for (const photo of input.photos ?? []) {
    formData.append("photos", photo)
  }

  const res = await authFetch(`/places/${placeId}/tickets`, token, {
    method: "POST",
    body: formData,
  })

  const response: unknown = await res.json().catch(() => null)

  if (!res.ok) throw apiError(res.status, response)

  return unwrapResponse(response)
}
// maintinance buttons

export interface ApproveTicketInput {
  assignee_id: string;
  due_date: string;
  estimated_cost?: number;
}

export interface RejectTicketInput {
  reason: string;
}

export interface ReassignTicketInput {
  assignee_id: string;
  due_date: string;
}

export interface CompleteTicketInput {
  actual_cost: number;
  completion_notes?: string;
  photos: File[];
}

async function ticketRequest<T>(
  token: string,
  ticketId: string,
  action: string,
  body: object | FormData,
): Promise<T> {
  const isFormData = body instanceof FormData;

  const response = await authFetch(`/tickets/${ticketId}/${action}`, token, {
    method: "POST",
    body: isFormData ? body : JSON.stringify(body),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) throw apiError(response.status, result)

  return result as T;
}

// 1. Approve ticket
export async function approveTicket(
  token: string,
  ticketId: string,
  input: ApproveTicketInput,
) {
  return ticketRequest(
    token,
    ticketId,
    "approve",
    input,
  );
}

// 2. Reject ticket
export async function rejectTicket(
  token: string,
  ticketId: string,
  input: RejectTicketInput,
) {
  return ticketRequest(
    token,
    ticketId,
    "reject",
    input,
  );
}

// 3. Reassign ticket
export async function reassignTicket(
  token: string,
  ticketId: string,
  input: ReassignTicketInput,
) {
  return ticketRequest(
    token,
    ticketId,
    "reassign",
    input,
  );
}

// 4. Complete ticket
export async function completeTicket(
  token: string,
  ticketId: string,
  input: CompleteTicketInput,
) {
  const formData = new FormData();

  formData.append("actual_cost", String(input.actual_cost));

  if (input.completion_notes) {
    formData.append("completion_notes", input.completion_notes);
  }

  input.photos.forEach((photo) => {
    formData.append("photos", photo);
  });

  return ticketRequest(
    token,
    ticketId,
    "complete",
    formData,
  );
}



export function getScheduledMaintenancesForAsset(
  token: string,
  assetId: string,
): Promise<Schedule[]> {
  return apiRequest<Schedule[]>(`/assets/${assetId}/maintenance-schedules`, token)
}


export type IntervalUnit = "DAY" | "WEEK" | "MONTH" | "YEAR"

export interface CreateMaintenanceScheduleInput {
  description: string
  interval_count: number
  interval_unit: IntervalUnit
  next_due_date: string
  lead_days?: number
  default_assignee_id?: string
}

export async function createMaintenanceSchedule(
  token: string,
  assetId: string,
  input: CreateMaintenanceScheduleInput
) {
  const response = await authFetch(
    `/assets/${assetId}/maintenance-schedules`,
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  )

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) throw apiError(response.status, data)

  return data
}

export async function handleCancelSchedule(
  token: string,
  scheduleId: string
) {
  const response = await authFetch(
    `/maintenance-schedules/${scheduleId}`,
    token,
    { method: "DELETE" }
  )
  if (!response.ok) throw await readApiError(response)
  // 204: the schedule is stopped. The caller refreshes its list.
}


export async function updateProfile(
  accessToken: string,
  data: {
    fullname: string
    phone: string | null
    preferred_language: string
    picture?: File | null
  }
) {
  const formData = new FormData()

  formData.append("fullname", data.fullname)
  formData.append("phone", data.phone || "")
  formData.append("preferred_language", data.preferred_language)

  if (data.picture) {
    formData.append("picture", data.picture)
  }

  const response = await authFetch("/users/me", accessToken, {
    method: "PUT",
    body: formData,
  })

  if (!response.ok) throw await readApiError(response)

  return response.json()
}

export function getProfile(token: string): Promise<User> {
  return apiRequest<User>("/users/me", token)
}

export function getUsers(token: string): Promise<User[]> {
  return apiRequest<User[]>("/users", token)
}

export type UserResponse = {
  id: string
  email: string
  fullname: string
  phone: string | null
  picture_url: string | null
  role: "ADMIN" | "MANAGER" | "WORKER"
  status:
    | "INVITED"
    | "PENDING_VERIFICATION"
    | "ACTIVE"
    | "DEACTIVATED"
  preferred_language: "ar" | "en"
  email_verified_at: string | null
  manager_id: string | null
  created_at: string
  updated_at: string
}

type UserApiResponse = {
  data?: UserResponse
  message?: string
}

export async function getUserById(
  accessToken: string,
  userId: string,
): Promise<UserResponse> {
  const response = await authFetch(`/users/${userId}`, accessToken)

  const result = (await response.json().catch(() => null)) as
    | UserApiResponse
    | UserResponse
    | null

  if (!response.ok) throw apiError(response.status, result)

  if (!result) {
    throw new Error("Invalid user response")
  }

  const user =
    "data" in result && result.data
      ? result.data
      : (result as UserResponse)

  return user
}

export type UpdateUserInput = {
  fullname: string
  phone: string | null
  role: UserResponse["role"]
  status: UserResponse["status"]
  preferred_language: UserResponse["preferred_language"]
}

export async function updateUser(
  accessToken: string,
  userId: string,
  payload: UpdateUserInput,
): Promise<UserResponse> {
  const response = await authFetch(`/users/${userId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

  const result = (await response.json().catch(() => null)) as
    | UserApiResponse
    | UserResponse
    | null

  if (!response.ok) throw apiError(response.status, result)

  if (!result) {
    throw new Error("Invalid update response")
  }

  return "data" in result && result.data
    ? result.data
    : (result as UserResponse)
}

/** Every support ticket the user can see (their own, or all for an Admin). */
export async function getSupportTicket(token: string) {
  return apiAllPages<SupportTicket>("/support-tickets", token)
}

export function createSupportTicket(
  token: string,
  input: CreateSupportTicketInput,
): Promise<SupportTicket> {
  return apiRequest<SupportTicket>("/support-tickets", token, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function getSupportTicketById(token: string, ticketId: string): Promise<SupportTicket> {
  return apiRequest<SupportTicket>(`/support-tickets/${ticketId}`, token)
}

export async function resolveSupportTicket(
  token: string,
  ticketId: string,
  admin_response: string
) {
  const response = await authFetch(
    `/support-tickets/${ticketId}/resolve`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ admin_response }),
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) throw apiError(response.status, result)

  return result;
}


export type ContentLanguage = "ar" | "en"

export interface WebContent {
  id: string
  author_id: string
  title: string
  language: ContentLanguage
  slug: string
  body: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface ContentPagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface ContentListResponse {
  data: WebContent[]
  pagination: ContentPagination
}

export interface GetContentsParams {
  language?: ContentLanguage
  slug?: string
  page?: number
  page_size?: number
}

export interface CreateContentInput {
  title: string
  language: ContentLanguage
  slug: string
  body: string
  is_published?: boolean
}

export interface UpdateContentInput {
  title?: string
  slug?: string
  body?: string
  is_published?: boolean
}

export async function getContents(
  token: string,
  params: GetContentsParams = {},
): Promise<ContentListResponse> {
  const query = new URLSearchParams()

  if (params.language) query.set("language", params.language)
  if (params.slug) query.set("slug", params.slug)
  if (params.page) query.set("page", String(params.page))
  if (params.page_size) query.set("page_size", String(params.page_size))

  const response = await authFetch(
    `/content${query.size ? `?${query.toString()}` : ""}`,
    token,
  )

  const result = await response.json().catch(() => null)

  if (!response.ok) throw apiError(response.status, result)

  if (!result || !Array.isArray(result.data) || !result.pagination) {
    throw new Error("Invalid content list response")
  }

  return result
}

/**
 * A published page by language and slug, for visitors who are not signed
 * in, so no token. Resolves with null when there is no such page.
 */
export async function getPublicContent(
  language: ContentLanguage,
  slug: string,
): Promise<WebContent | null> {
  const query = new URLSearchParams({ language, slug })
  const response = await fetch(`/api/v1/content?${query.toString()}`, {
    credentials: "same-origin",
  })
  const result = (await response.json().catch(() => null)) as
    | ContentListResponse
    | null
  if (!response.ok) throw apiError(response.status, result)
  if (!result || !Array.isArray(result.data)) {
    throw new Error("/content returned no list")
  }
  return result.data.find((page) => page.slug === slug) ?? null
}

export async function getContentById(
  token: string,
  contentId: string,
): Promise<WebContent> {
  return apiRequest<WebContent>(`/content/${contentId}`, token).then(
    (content) => {
      if (!content || typeof content.id !== "string") {
        throw new Error("Content not found")
      }

      return content
    },
  )
}

export async function createContent(
  token: string,
  input: CreateContentInput,
): Promise<WebContent> {
  return apiRequest<WebContent>("/content", token, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateContent(
  token: string,
  contentId: string,
  input: UpdateContentInput,
): Promise<WebContent> {
  return apiRequest<WebContent>(`/content/${contentId}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export async function deleteContent(
  token: string,
  contentId: string,
): Promise<void> {
  const response = await authFetch(`/content/${contentId}`, token, {
    method: "DELETE",
  })

  if (!response.ok) throw await readApiError(response)
}


export interface DashboardPlace {
  place_id: string
  place_name: string
  status: string

  assets: {
    GOOD: number
    NEEDS_MAINTENANCE: number
    UNDER_MAINTENANCE: number
    OUT_OF_SERVICE: number
  }

  open_tickets: {
    PENDING_REVIEW: number
    APPROVED: number
    overdue: number
  }

  today: {
    check_ins: number
    check_outs: number
  }

  maintenance_budget: {
    currency: string
    budget: number
    spent: number
    remaining: number
  } | null
}

export interface DashboardResponse {
  data: DashboardPlace[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

/** Every place's dashboard row, in pages of 100 (one request for up to 100 places). */
export function getDashboardRows(token: string): Promise<DashboardPlace[]> {
  return apiAllPages<DashboardPlace>("/dashboard", token)
}

/** How many workers are assigned to a place (Manager only). Reads only the total. */
export async function countPlaceWorkers(token: string, placeId: string): Promise<number> {
  const result = await apiPage<PlaceWorker>(`/places/${placeId}/workers?page_size=1`, token)
  return result.pagination.total
}

export async function getDashboard(
  token: string,
  params?: {
    place_id?: string
    page?: number
    page_size?: number
  }
): Promise<DashboardResponse> {
  const query = new URLSearchParams()

  if (params?.place_id) query.set("place_id", params.place_id)
  if (params?.page) query.set("page", String(params.page))
  if (params?.page_size) query.set("page_size", String(params.page_size))

  const response = await authFetch(
    `/dashboard${query.toString() ? `?${query.toString()}` : ""}`,
    token,
  )

  const result = await response.json().catch(() => null)

  if (!response.ok) throw apiError(response.status, result)

  return result
}


export interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  sender_id: string | null
  created_at: string
  updated_at: string
}

export interface NotificationsResponse {
  data: Notification[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
  unread_count: number
}

export interface SendAnnouncementInput {
  role?: "ADMIN" | "MANAGER" | "WORKER"
  user_ids?: string[]
  title_en: string
  message_en: string
  title_ar: string
  message_ar: string
}

export async function getNotifications(
  token: string,
  params?: {
    is_read?: boolean
    page?: number
    page_size?: number
  }
): Promise<NotificationsResponse> {
  const query = new URLSearchParams()

  if (params?.is_read !== undefined) {
    query.set("is_read", String(params.is_read))
  }

  if (params?.page !== undefined) {
    query.set("page", String(params.page))
  }

  if (params?.page_size !== undefined) {
    query.set("page_size", String(params.page_size))
  }

  const response = await authFetch(
    `/notifications${query.toString() ? `?${query}` : ""}`,
    token,
  )

  const result = await response.json().catch(() => null)

  if (!response.ok) throw apiError(response.status, result)

  return result
}

export async function markNotificationAsRead(
  token: string,
  notificationId: string
): Promise<Notification> {
  const response = await authFetch(
    `/notifications/${notificationId}/read`,
    token,
    { method: "POST" }
  )

  const result = await response.json().catch(() => null)

  if (!response.ok) throw apiError(response.status, result)

  return result
}

export async function sendAnnouncement(
  token: string,
  input: SendAnnouncementInput
): Promise<{ recipient_count: number }> {
  const response = await authFetch("/notifications", token, {
    method: "POST",
    body: JSON.stringify(input),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) throw apiError(response.status, result)

  return result
}