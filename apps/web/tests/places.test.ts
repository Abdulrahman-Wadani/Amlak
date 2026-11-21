import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPlace, listAllBookingsForPlace } from "@/lib/api"

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

const place = {
  id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5f6e7a8b9c",
  owner_id: "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  place_name: "Sea View Villa",
  place_type: "Villa",
  city: "Jeddah",
  status: "ACTIVE",
  currency: "SAR",
  timezone: "Asia/Riyadh",
  monthly_maintenance_budget: "1500",
}

describe("createPlace", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("sends the place as JSON to POST /places with the bearer token", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: place }))

    await createPlace("token-1", { place_name: "Sea View Villa", place_type: "Villa", city: "Jeddah" })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v1/places")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({
      place_name: "Sea View Villa",
      place_type: "Villa",
      city: "Jeddah",
    })
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-1")
  })

  it("returns the budget as a number", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: place }))

    const created = await createPlace("t", { place_name: "x", place_type: "y", city: "z" })

    expect(created.monthly_maintenance_budget).toBe(1500)
  })

  it("throws when the response has no place id", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: {} }))

    await expect(createPlace("t", { place_name: "x", place_type: "y", city: "z" })).rejects.toThrow(
      "place not created",
    )
  })
})

describe("listAllBookingsForPlace", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("requests the bookings that overlap the date window, page by page", async () => {
    const page = (total_pages: number, n: number) =>
      json(200, {
        data: [{ id: `b${n}` }],
        pagination: { page: n, page_size: 100, total: total_pages, total_pages },
      })
    fetchMock.mockResolvedValueOnce(page(2, 1)).mockResolvedValueOnce(page(2, 2))

    const rows = await listAllBookingsForPlace("t", "p1", { from: "2026-11-01", to: "2026-11-30" })

    expect(rows.map((b: { id: string }) => b.id)).toEqual(["b1", "b2"])
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/v1/places/p1/bookings?from=2026-11-01&to=2026-11-30&page=1&page_size=100",
    )
  })
})
