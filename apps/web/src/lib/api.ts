import type { Place } from "@amlak/shared"

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
