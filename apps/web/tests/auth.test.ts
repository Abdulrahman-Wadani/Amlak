import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { storedUser } from "@/lib/auth"
import { authFetch, rememberAccessToken, setSessionHandlers } from "@/lib/http"

const user = {
  id: "u1",
  email: "sara@example.com",
  fullname: "Sara Ahmed",
  role: "MANAGER",
  status: "ACTIVE",
  preferred_language: "en",
}

describe("storedUser", () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => sessionStorage.clear())

  it("returns null when no user is saved for this tab", () => {
    expect(storedUser()).toBeNull()
  })

  it("returns null when the saved value is not valid JSON", () => {
    sessionStorage.setItem("authUser", "{not json")
    expect(storedUser()).toBeNull()
  })
})

describe("authFetch session refresh", () => {
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

  it("retries once with a new token after a 401", async () => {
    const refresh = vi.fn().mockResolvedValue("new-token")
    setSessionHandlers({ refresh, expire: vi.fn() })
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))

    const res = await authFetch("/users/me", "old-token")

    expect(res.status).toBe(200)
    expect(refresh).toHaveBeenCalledTimes(1)
    const retryHeaders = new Headers(fetchMock.mock.calls[1][1].headers)
    expect(retryHeaders.get("Authorization")).toBe("Bearer new-token")
  })

  it("ends the session when the refresh fails", async () => {
    const expire = vi.fn()
    setSessionHandlers({ refresh: vi.fn().mockRejectedValue(new Error("expired")), expire })
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }))

    const res = await authFetch("/users/me", "old-token")

    expect(res.status).toBe(401)
    expect(expire).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("does not retry a successful request", async () => {
    const refresh = vi.fn()
    setSessionHandlers({ refresh, expire: vi.fn() })
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }))

    await authFetch("/users/me", "token")

    expect(refresh).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// The session is no longer kept in sessionStorage: on each page load the app
// asks /auth/refresh once and the refresh cookie decides (lib/auth.tsx).
describe("restoreSession", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

  beforeEach(() => {
    // Each test is a fresh page load: the module remembers its first restore.
    vi.resetModules()
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("asks /auth/refresh with the cookie when the app opens, then loads the user", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: "token-1" }))
      .mockResolvedValueOnce(json(user))
    const auth = await import("@/lib/auth")

    await expect(auth.restoreSession()).resolves.toEqual(user)

    const [refreshUrl, refreshInit] = fetchMock.mock.calls[0]
    expect(refreshUrl).toBe("/api/v1/auth/refresh")
    expect(refreshInit.method).toBe("POST")
    expect(refreshInit.credentials).toBe("same-origin")
    const [meUrl, meInit] = fetchMock.mock.calls[1]
    expect(meUrl).toBe("/api/v1/users/me")
    expect(new Headers(meInit.headers).get("Authorization")).toBe("Bearer token-1")
    expect(auth.storedUser()).toEqual(user)
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it("asks only once per page load", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ access_token: "token-1" }))
      .mockResolvedValueOnce(json(user))
    const auth = await import("@/lib/auth")

    await Promise.all([auth.restoreSession(), auth.restoreSession()])
    await auth.restoreSession()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("ends with no user when the refresh cookie is missing or expired", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(json({ code: "UNAUTHENTICATED", message: "Your session is invalid or has expired" }, 401)),
    )
    const auth = await import("@/lib/auth")

    await expect(auth.restoreSession()).resolves.toBeNull()

    expect(auth.storedUser()).toBeNull()
    expect(fetchMock).toHaveBeenCalled()
    for (const [url] of fetchMock.mock.calls) expect(url).toBe("/api/v1/auth/refresh")
  })
})
