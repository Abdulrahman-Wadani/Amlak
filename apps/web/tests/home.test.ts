import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getDashboard } from "@/lib/api"

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

describe("getDashboard (home page data)", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("requests /dashboard with no query when no options are given", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [] }))

    await getDashboard("t")

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/dashboard")
  })

  it("passes the place filter and paging to the query", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [] }))

    await getDashboard("t", { place_id: "p1", page: 3, page_size: 10 })

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/dashboard?place_id=p1&page=3&page_size=10")
  })

  it("sends the access token with the request", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [] }))

    await getDashboard("secret-token")

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe(
      "Bearer secret-token",
    )
  })
})
