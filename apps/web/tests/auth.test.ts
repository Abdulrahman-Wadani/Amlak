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

  it("returns the user saved in sessionStorage", () => {
    sessionStorage.setItem("authUser", JSON.stringify(user))
    expect(storedUser()).toEqual(user)
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
