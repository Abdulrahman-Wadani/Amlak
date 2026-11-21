import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createTicket, listTickets } from "@/lib/api"

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

describe("ticket API calls", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("creates a ticket as multipart form data with every photo", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: { id: "t1" } }))
    const photos = [
      new File(["a"], "leak-1.jpg", { type: "image/jpeg" }),
      new File(["b"], "leak-2.jpg", { type: "image/jpeg" }),
    ]

    await createTicket("tok", "p1", {
      asset_id: "a1",
      priority: "HIGH",
      description: "Water leak under the sink",
      photos,
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v1/places/p1/tickets")
    expect(init.method).toBe("POST")
    const form = init.body as FormData
    expect(form.get("asset_id")).toBe("a1")
    expect(form.get("priority")).toBe("HIGH")
    expect(form.get("description")).toBe("Water leak under the sink")
    expect(form.getAll("photos")).toHaveLength(2)
  })

  it("lists tickets for a place with the query and page", async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, {
        data: [{ id: "t1" }],
        pagination: { page: 2, page_size: 20, total: 21, total_pages: 2 },
      }),
    )

    const result = await listTickets("t", { place_id: "p1", open: true, sort: "due_date" }, 2)

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/v1/tickets?place_id=p1&open=true&sort=due_date&page=2&page_size=20",
    )
    expect(result.pagination.total).toBe(21)
  })
})
