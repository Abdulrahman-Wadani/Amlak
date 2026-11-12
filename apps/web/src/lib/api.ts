
import type { BookingInput } from "./validators"
import type {
  Asset,
  CreateAssetInput,
  CreatePlaceInput,
  Place,
  WorkerResponse,
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

export async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    credentials: "same-origin",
  })

  const response: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      response &&
      typeof response === "object" &&
      "message" in response
        ? String((response as { message: unknown }).message)
        : `${path} failed with ${res.status}`

    const error = new Error(message) as Error & {
      code?: string
      details?: Record<string, unknown>
    }
    error.code =
      response && typeof response === "object" && "code" in response
        ? String((response as { code: unknown }).code)
        : ""
    error.details =
      response && typeof response === "object" && "details" in response
        ? (response as { details?: Record<string, unknown> }).details
        : undefined

    throw error
  }

  return unwrapResponse<T>(response)
}

// Places
export function getPlaces(token: string): Promise<Place[]> {
  return apiRequest<Place[]>("/places", token).then((data) => {
    if (!Array.isArray(data)) {
      throw new Error("/places returned no list")
    }

    return data.map(normalizePlace)
  })
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

export function getPlaceAssets(
  token: string,
  placeId: string,
): Promise<Asset[]> {
  return apiRequest<Asset[]>(
    `/places/${placeId}/assets`,
    token,
  ).then((data) => {
    if (!Array.isArray(data)) {
      throw new Error("/assets returned no list")
    }

    return data
  })
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

// Create place
export class PlaceNameTakenError extends Error {}

export async function createPlace(
  token: string,
  input: CreatePlaceInput,
): Promise<Place> {
  try {
    const place = await apiRequest<Place | string>(
      "/places",
      token,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    )

    if (typeof place === "string") {
      throw new PlaceNameTakenError(place)
    }

    if (!place || typeof place.id !== "string") {
      throw new Error("place not created")
    }

    return normalizePlace(place)
  } catch (error) {
    if (error instanceof PlaceNameTakenError) {
      throw error
    }

    throw error
  }
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

export async function createBooking(
  token: string,
  placeId: string,
  input: BookingInput,
): Promise<Booking> {
  return apiRequest<Booking>(`/places/${placeId}/bookings`, token, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateBooking(
  token: string,
  bookingId: string,
  input: BookingInput,
): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${bookingId}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  })
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

// Workers
export function getWorkers(
  token: string,
): Promise<WorkerResponse[]> {
  return apiRequest<WorkerResponse[]>("/workers", token).then(
    (data) => {
      if (!Array.isArray(data)) {
        throw new Error("/workers returned no list")
      }

      return data
    },
  )
}

export function getWorkerById(
  token: string,
  id: string,
): Promise<WorkerResponse> {
  return apiRequest<WorkerResponse>(`/workers/${id}`, token).then(
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
): Promise<WorkerResponse> {
  const worker = await apiRequest<WorkerResponse>(
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
    monthly_maintenance_budget: number
    latitude: number | null
    longitude: number | null
    currency: string
    timezone: string
    status: "ACTIVE" | "INACTIVE"
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

export async function deleteWorker(
  token: string,
  workerId: string
): Promise<void> {
  const response = await fetch(`/api/v1/workers/${workerId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      result?.message ?? `Delete failed (${response.status})`
    )
  }
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

export async function getTicketsForPlace(
  token: string,
  placeId: string,
) {
  const response = await fetch(`/api/v1/tickets?place_id=${placeId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "same-origin",
  }).then((res) => res.json())

  return response.data;
}

export async function getTicketById(
  token: string,
  ticketId: string,
) {
  const response = await fetch(`/api/v1/tickets/${ticketId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "same-origin",
  }).then((res) => res.json())

  return response;
}

export async function expenseslist(
  token: string,
  placeId: string,
): Promise<Blob> {
return expense.data;
}

// for test now only
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

  const res = await fetch(`/api/v1/places/${placeId}/tickets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    credentials: "same-origin",
  })

  const response: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      response &&
      typeof response === "object" &&
      "message" in response
        ? String((response as { message: unknown }).message)
        : `Create ticket failed with ${res.status}`

    throw new Error(message)
  }

  return unwrapResponse(response)
}
// maintinance buttons

export interface ApproveTicketInput {
  assignee_id: string;
  due_date: string;
  estimated_cost: number;
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

  const response = await fetch(
    `/api/v1/tickets/${ticketId}/${action}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      },
      body: isFormData ? body : JSON.stringify(body),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || result.error || `Failed to ${action} ticket`,
    );
  }

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



export async function getScheduledMaintenancesForAsset(
  token: string,
  assetId: string,
) {
  return apiRequest(`/assets/${assetId}/maintenance-schedules`, token)
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
  const response = await fetch(
    `/api/v1/assets/${assetId}/maintenance-schedules`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(input),
    }
  )

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Failed to create maintenance schedule"

    throw new Error(message)
  }

  return data
}

export async function handleCancelSchedule(
  token: string,
  scheduleId: string
) {
  const response = await fetch(
    `/api/v1/maintenance-schedules/${scheduleId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "same-origin",
    }
  )
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null)
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Failed to cancel maintenance schedule"

    throw new Error(message)
  }
  return document.location.reload()
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

  const response = await fetch("/api/v1/users/me", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.message || "Failed to update profile")
  }

  return response.json()
}

export async function getProfile(token: string) {
  return apiRequest('/users/me', token)
}