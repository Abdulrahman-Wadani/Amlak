import type {
  Asset,
  CreateAssetInput,
  CreatePlaceInput,
  Place,
} from "@amlak/shared"

function normalizePlace(p: Place): Place {
  return {
    ...p,
    monthly_maintenance_budget: Number(p.monthly_maintenance_budget),
  }
}

async function request<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "same-origin",
  })
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`)
  return (await res.json()) as T
}

export function getPlaces(token: string): Promise<Place[]> {
  return request<Place[]>("/places", token).then((data) => {
    if (!Array.isArray(data)) throw new Error("/places returned no list")
    return data.map(normalizePlace)
  })
}

export function getPlace(token: string, placeId: string): Promise<Place> {
  return request<Place>(`/place/${placeId}`, token).then((data) => {
    // The API answers 201 with {"message":"place not found"} for bad ids.
    if (!data || typeof data.id !== "string") throw new Error("place not found")
    return normalizePlace(data)
  })
}

export function getPlaceAssets(token: string, placeId: string): Promise<Asset[]> {
  return request<{ assets: unknown }>(`/places/${placeId}/assets`, token).then(
    (data) => {
      if (!data || !Array.isArray(data.assets)) {
        throw new Error("/assets returned no list")
      }
      return data.assets as Asset[]
    },
  )
}

export async function createAsset(
  token: string,
  placeId: string,
  input: CreateAssetInput,
): Promise<Asset> {
  const res = await fetch(`/api/v1/places/${placeId}/assets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ ...input, status: input.status ?? "GOOD" }),
  })
  const wrapped: unknown = await res.json().catch(() => null)
  const asset = (wrapped as { assets?: unknown } | null)?.assets
  if (
    !res.ok ||
    !asset ||
    typeof asset !== "object" ||
    typeof (asset as Asset).id !== "string"
  ) {
    throw new Error("asset not created")
  }
  return asset as Asset
}

export class PlaceNameTakenError extends Error {}

export async function createPlace(
  token: string,
  input: CreatePlaceInput,
): Promise<Place> {
  const res = await fetch("/api/v1/place", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  })
  const data: unknown = await res.json().catch(() => null)
  if (typeof data === "string") throw new PlaceNameTakenError(data)
  if (!res.ok || !data || typeof data !== "object" || typeof (data as Place).id !== "string") {
    throw new Error("place not created")
  }
  return normalizePlace(data as Place)
}
