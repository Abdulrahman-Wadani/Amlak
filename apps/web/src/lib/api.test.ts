import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiAllPages, apiRequest, ticketQuery } from "@/lib/api"
import { ApiError } from "@/lib/errors"

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

describe("ticketQuery", () => {
  it("sends booleans as text, including false, and leaves out empty values", () => {
    expect(ticketQuery({ place_id: "p1", open: true })).toBe("place_id=p1&open=true")
    expect(ticketQuery({ open: false })).toBe("open=false")
    expect(ticketQuery({ status: undefined, assignee_id: "" })).toBe("")
    expect(ticketQuery({ assignee_id: "me", status: "APPROVED", sort: "due_date" })).toBe(
      "assignee_id=me&status=APPROVED&sort=due_date",
    )
  })
})

describe("API requests", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it("apiRequest throws an ApiError with the code and details", async () => {
    fetchMock.mockResolvedValueOnce(
      json(409, { code: "CONFLICT", message: "Server text", details: { fields: { place_name: "taken" } } }),
    )
    const err = (await apiRequest("/places", "t", { method: "POST", body: "{}" }).catch(
      (e: unknown) => e,
    )) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe("CONFLICT")
    expect(err.fields).toEqual(["place_name"])
  })

  it("apiRequest unwraps { data }", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [{ id: "1" }] }))
    await expect(apiRequest("/places", "t")).resolves.toEqual([{ id: "1" }])
  })

  it("apiAllPages reads every page of 100", async () => {
    const page = (n: number, total_pages: number) =>
      json(200, { data: [{ n }], pagination: { page: n, page_size: 100, total: total_pages, total_pages } })
    fetchMock.mockResolvedValueOnce(page(1, 3)).mockResolvedValueOnce(page(2, 3)).mockResolvedValueOnce(page(3, 3))

    const rows = await apiAllPages<{ n: number }>("/dashboard", "t")

    expect(rows.map((r) => r.n)).toEqual([1, 2, 3])
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/dashboard?page=1&page_size=100",
      "/api/v1/dashboard?page=2&page_size=100",
      "/api/v1/dashboard?page=3&page_size=100",
    ])
  })
})
