import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createExpense, deleteExpense, expenseslist, getFinancialReport } from "@/lib/api"

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

const expense = { id: "e1", category: "MAINTENANCE", amount: 320 }

describe("expense API calls", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("lists a place's expenses with the filters that are set", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [expense] }))

    await expenseslist("t", "p1", { from: "2026-11-01", to: "2026-11-30", category: "CLEANING" })

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/v1/places/p1/expenses?page=1&page_size=100&from=2026-11-01&to=2026-11-30&category=CLEANING",
    )
  })

  it("leaves out filters that are not set", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [] }))

    await expenseslist("t", "p1")

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/places/p1/expenses?page=1&page_size=100")
  })

  it("creates an expense as multipart form data, without a JSON content type", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: expense }))
    const receipt = new File(["x"], "receipt.jpg", { type: "image/jpeg" })

    await createExpense("t", "p1", {
      category: "MAINTENANCE",
      amount: 320,
      expense_date: "2026-11-10",
      description: "Pump repair",
      receipt,
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v1/places/p1/expenses")
    expect(init.method).toBe("POST")
    expect(init.body).toBeInstanceOf(FormData)
    const form = init.body as FormData
    expect(form.get("category")).toBe("MAINTENANCE")
    expect(form.get("amount")).toBe("320")
    expect(form.get("expense_date")).toBe("2026-11-10")
    expect(form.get("description")).toBe("Pump repair")
    expect(form.get("receipt")).toBeInstanceOf(File)
    expect(new Headers(init.headers).has("Content-Type")).toBe(false)
  })

  it("deletes an expense with DELETE /expenses/:id", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await deleteExpense("t", "e1")

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/expenses/e1")
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE")
  })

  it("requests the financial report for a period, optionally for one place", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { places: [], totals_by_currency: [] } }))

    await getFinancialReport("t", { from: "2026-11-01", to: "2026-11-30", place_id: "p1" })

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/v1/reports/financial?from=2026-11-01&to=2026-11-30&place_id=p1",
    )
  })
})
