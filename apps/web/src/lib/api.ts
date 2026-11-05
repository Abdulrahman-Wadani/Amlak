
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
const expense = {
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c60",
      "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "ticket_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
      "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
      "category": "MAINTENANCE",
      "description": "AC capacitor and refrigerant",
      "amount": 420,
      "currency": "SAR",
      "expense_date": "2026-10-13",
      "receipt_url": "https://amlak-uploads.s3.amazonaws.com/receipts/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c60/3e4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6a7b.jpg?X-Amz-Signature=...",
      "created_at": "2026-10-13T18:00:00Z",
      "updated_at": "2026-10-13T18:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
};
export async function expenseslist(
  token: string,
  placeId: string,
): Promise<Blob> {
return expense.data;
}
