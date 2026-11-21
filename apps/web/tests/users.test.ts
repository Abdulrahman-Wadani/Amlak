import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getProfile, getUsers, updateUser } from "@/lib/api"

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

const user = {
  id: "u1",
  email: "sara@example.com",
  fullname: "Sara Ahmed",
  phone: "+966512345678",
  role: "WORKER",
  status: "ACTIVE",
  preferred_language: "en",
}

describe("user API calls", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("reads the signed-in user's profile from /users/me", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: user }))

    const profile = await getProfile("t")

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/users/me")
    expect(profile.email).toBe("sara@example.com")
  })

  it("lists users from /users", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [user] }))

    const users = await getUsers("t")

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/users")
    expect(users).toEqual([user])
  })

  it("updates a user with PUT and sends the payload as JSON", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { ...user, role: "MANAGER" } }))
    const payload = {
      fullname: "Sara Ahmed",
      phone: "+966512345678",
      role: "MANAGER" as const,
      status: "ACTIVE" as const,
      preferred_language: "en" as const,
    }

    const updated = await updateUser("t", "u1", payload)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v1/users/u1")
    expect(init.method).toBe("PUT")
    expect(JSON.parse(init.body)).toEqual(payload)
    expect(updated.role).toBe("MANAGER")
  })

  it("accepts a user update response that is not wrapped in data", async () => {
    fetchMock.mockResolvedValueOnce(json(200, user))

    const updated = await updateUser("t", "u1", {
      fullname: "Sara",
      phone: null,
      role: "WORKER",
      status: "ACTIVE",
      preferred_language: "en",
    })

    expect(updated.id).toBe("u1")
  })
})
