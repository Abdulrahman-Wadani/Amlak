import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { authFetch, rememberAccessToken, setSessionHandlers } from "@/lib/http"

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

/** The Authorization header of each fetch call, in order. */
function authHeaders(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(
    ([, init]) => new Headers((init as RequestInit).headers).get("Authorization"),
  )
}

describe("authFetch", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setSessionHandlers(null)
    rememberAccessToken(null)
  })

  it("sends the token and returns the response", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [] }))

    const res = await authFetch("/places", "token-1")

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/places")
    expect(authHeaders(fetchMock)).toEqual(["Bearer token-1"])
  })

  it("refreshes once after a 401 and retries with the new token", async () => {
    const refresh = vi.fn().mockResolvedValue("token-2")
    const expire = vi.fn()
    setSessionHandlers({ refresh, expire })
    rememberAccessToken("token-1")
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(200))

    const res = await authFetch("/places", "token-1")

    expect(res.status).toBe(200)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(expire).not.toHaveBeenCalled()
    expect(authHeaders(fetchMock)).toEqual(["Bearer token-1", "Bearer token-2"])
  })

  it("retries only once: a second 401 is returned as it is", async () => {
    const refresh = vi.fn().mockResolvedValue("token-2")
    setSessionHandlers({ refresh, expire: vi.fn() })
    rememberAccessToken("token-1")
    fetchMock.mockResolvedValue(json(401))

    const res = await authFetch("/places", "token-1")

    expect(res.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("ends the session when the refresh fails", async () => {
    const refresh = vi.fn().mockRejectedValue(new Error("refresh failed"))
    const expire = vi.fn()
    setSessionHandlers({ refresh, expire })
    rememberAccessToken("token-1")
    fetchMock.mockResolvedValueOnce(json(401))

    const res = await authFetch("/places", "token-1")

    expect(res.status).toBe(401)
    expect(expire).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("uses a token that another request already refreshed, without refreshing again", async () => {
    const refresh = vi.fn()
    setSessionHandlers({ refresh, expire: vi.fn() })
    // This request was sent with token-1; meanwhile token-2 arrived.
    rememberAccessToken("token-2")
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(200))

    const res = await authFetch("/places", "token-1")

    expect(res.status).toBe(200)
    expect(refresh).not.toHaveBeenCalled()
    expect(authHeaders(fetchMock)).toEqual(["Bearer token-1", "Bearer token-2"])
  })

  it("does not refresh a request sent without a token", async () => {
    const refresh = vi.fn()
    setSessionHandlers({ refresh, expire: vi.fn() })
    fetchMock.mockResolvedValueOnce(json(401))

    const res = await authFetch("/content?language=en&slug=about", null)

    expect(res.status).toBe(401)
    expect(refresh).not.toHaveBeenCalled()
    expect(authHeaders(fetchMock)).toEqual([null])
  })

  it("sets a JSON Content-Type for a string body, and none for FormData", async () => {
    fetchMock.mockResolvedValue(json(200))

    await authFetch("/tickets/1/approve", "t", { method: "POST", body: JSON.stringify({ a: 1 }) })
    const form = new FormData()
    form.append("description", "Leak")
    await authFetch("/places/1/tickets", "t", { method: "POST", body: form })

    const contentTypes = fetchMock.mock.calls.map(([, init]) =>
      new Headers((init as RequestInit).headers).get("Content-Type"),
    )
    expect(contentTypes).toEqual(["application/json", null])
    // The FormData itself is sent, so the browser can add the multipart boundary.
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(form)
  })

  it("sends the FormData again on the retry", async () => {
    setSessionHandlers({ refresh: vi.fn().mockResolvedValue("token-2"), expire: vi.fn() })
    rememberAccessToken("token-1")
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(201))
    const form = new FormData()
    form.append("description", "Leak")

    const res = await authFetch("/places/1/tickets", "token-1", { method: "POST", body: form })

    expect(res.status).toBe(201)
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(form)
  })
})
