
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

async function apiRequest<T>(
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

    throw new Error(message)
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
  return [{
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
      "place_id": "8cab34c5-291f-4ba7-b3fc-6834d54fba50",
      "asset_id": "e99bdd97-4e6b-4eb4-94ff-13a208b4fee5",
      "periodic_maintenance_id": null,
      "ticket_type": "CORRECTIVE",
      "priority": "HIGH",
      "status": "APPROVED",
      "description": "هواء المكيف خربان",
      "reporter_id": "d20242bc-2813-4a7d-9ec7-eb60e1a0db94",
      "assignee_id": "d20242bc-2813-4a7d-9ec7-eb60e1a0db94",
      "due_date": "2026-10-14",
      "is_overdue": true,
      "estimated_cost": 350,
      "actual_cost": 500,
      "reviewed_by": "d20242bc-2813-4a7d-9ec7-eb60e1a0db94",
      "reviewed_at": "2026-10-11T12:00:00Z",
      "rejection_reason": "تحت المراجعة",
      "completed_at": "2026-10-15T10:00:00Z",
      "completion_notes": "الامور تحت السيطرة",
      "created_at": "2026-10-11T09:30:00Z",
      "updated_at": "2026-10-11T12:00:00Z"
    }]
}

export async function getTicketById(
  token: string,
  ticketId: string,
) {
  return [{
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
      "place_id": "8cab34c5-291f-4ba7-b3fc-6834d54fba50",
      "asset_id": "e99bdd97-4e6b-4eb4-94ff-13a208b4fee5",
      "periodic_maintenance_id": null,
      "ticket_type": "CORRECTIVE",
      "priority": "HIGH",
      "status": "APPROVED",
      "description": "هواء المكيف خربان",
      "reporter_id": "d20242bc-2813-4a7d-9ec7-eb60e1a0db94",
      "assignee_id": "d20242bc-2813-4a7d-9ec7-eb60e1a0db94",
      "due_date": "2026-10-14",
      "is_overdue": true,
      "estimated_cost": 350,
      "actual_cost": 500,
      "reviewed_by": "d20242bc-2813-4a7d-9ec7-eb60e1a0db94",
      "reviewed_at": "2026-10-11T12:00:00Z",
      "rejection_reason": "تحت المراجعة",
      "completed_at": "2026-10-15T10:00:00Z",
      "completion_notes": "الامور تحت السيطرة",
      "created_at": "2026-10-11T09:30:00Z",
      "updated_at": "2026-10-11T12:00:00Z"
    }]
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

