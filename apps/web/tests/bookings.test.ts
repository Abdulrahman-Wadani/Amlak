import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cancelBooking, checkInBooking, checkOutBooking, createBooking, getBookingsForPlace } from "@/lib/api"

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

const booking = { id: "b1", status: "CONFIRMED" }

describe("booking API calls", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("creates a booking under its place", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: booking }))
    const input = {
      guest_name: "Sara Ahmed",
      guest_phone: "+966500000000",
      guest_count: 2,
      check_in_date: "2026-12-01",
      check_out_date: "2026-12-05",
      total_price: 1500,
    }

    await createBooking("t", "p1", input)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v1/places/p1/bookings")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual(input)
  })

  it("checks a guest in with POST /bookings/:id/check-in", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { ...booking, status: "CHECKED_IN" } }))

    const result = await checkInBooking("t", "b1")

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/bookings/b1/check-in")
    expect(fetchMock.mock.calls[0][1].method).toBe("POST")
    expect(result.status).toBe("CHECKED_IN")
  })

  it("checks a guest out with POST /bookings/:id/check-out", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { ...booking, status: "CHECKED_OUT" } }))

    const result = await checkOutBooking("t", "b1")

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/bookings/b1/check-out")
    expect(result.status).toBe("CHECKED_OUT")
  })

  it("cancels a booking and sends the reason", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { ...booking, status: "CANCELLED" } }))

    await cancelBooking("t", "b1", "Guest changed plans")

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v1/bookings/b1/cancel")
    expect(JSON.parse(init.body)).toEqual({ reason: "Guest changed plans" })
  })

  it("lists a place's bookings for a date window, 100 per page", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [booking] }))

    await getBookingsForPlace("t", "p1", { from: "2026-11-01", to: "2026-11-30" }, 2)

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/v1/places/p1/bookings?from=2026-11-01&to=2026-11-30&page=2&page_size=100",
    )
  })

  it("throws when the list response is not an array", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { not: "a list" } }))

    await expect(getBookingsForPlace("t", "p1", { from: "a", to: "b" })).rejects.toThrow(
      "/bookings returned no list",
    )
  })
})
