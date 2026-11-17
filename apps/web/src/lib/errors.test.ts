import { describe, expect, it } from "vitest"
import { ApiError, apiError, errorMessage, fieldLabel, readApiError } from "@/lib/errors"

const body = (code: string, message: string, details?: unknown) => ({ code, message, details })

describe("apiError", () => {
  it("reads code, message and details from the body", () => {
    const err = apiError(409, body("CONFLICT", "Server text", { fields: { slug: "Choose another slug" } }))
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(409)
    expect(err.code).toBe("CONFLICT")
    expect(err.message).toBe("Server text")
    expect(err.fields).toEqual(["slug"])
  })

  it("falls back to a code from the status when the body has none", () => {
    expect(apiError(404, null).code).toBe("NOT_FOUND")
    expect(apiError(502, "<html>").code).toBe("INTERNAL_ERROR")
  })

  it("reads a response without a JSON body", async () => {
    const err = await readApiError(new Response(null, { status: 403 }))
    expect(err.code).toBe("FORBIDDEN")
  })
})

describe("errorMessage", () => {
  it("never shows the server's message", () => {
    const err = apiError(500, body("SOMETHING_NEW", "Internal details from the server"))
    expect(errorMessage(err)).toBe("Something went wrong. Try again.")
  })

  it("translates by code", () => {
    expect(errorMessage(apiError(403, body("FORBIDDEN", "x")))).toBe("You do not have permission to do this.")
    expect(errorMessage(apiError(404, body("NOT_FOUND", "x")))).toBe("We could not find it. It may have been deleted.")
    expect(errorMessage(apiError(401, body("INVALID_CREDENTIALS", "x")))).toBe("The email or password is not correct.")
    expect(errorMessage(apiError(429, body("RATE_LIMITED", "x")))).toBe("Too many attempts. Wait a little and try again.")
  })

  it("names the fields of a validation error", () => {
    const err = apiError(422, body("VALIDATION_ERROR", "Some fields are invalid", {
      fields: { email: "Invalid email", phone: "Invalid phone", "photos.0": "Too big" },
    }))
    expect(errorMessage(err)).toBe("Check these fields: Email, Phone number, Photos.")
  })

  it("uses the conflicting field", () => {
    expect(errorMessage(apiError(409, body("CONFLICT", "x", { fields: { place_name: "taken" } })))).toBe(
      "That place name is already taken.",
    )
    expect(errorMessage(apiError(409, body("CONFLICT", "x", { fields: { email: "taken" } })))).toBe(
      "This email is already registered.",
    )
    expect(errorMessage(apiError(409, body("CONFLICT", "x", { ticket_ids: ["1"] })))).toBe(
      "Open maintenance tickets are in the way. Complete, reject or reassign them first.",
    )
  })

  it("uses details.reason", () => {
    expect(
      errorMessage(apiError(403, body("ACCOUNT_NOT_ACTIVE", "x", { reason: "EMAIL_NOT_VERIFIED" }))),
    ).toBe("Verify your email first — we sent a 6-digit code.")
    expect(errorMessage(apiError(409, body("CONFLICT", "x", { reason: "PLACE_OCCUPIED" })))).toBe(
      "Another guest is staying at the place. Check them out first.",
    )
  })

  it("gives a general message for errors that are not from the API", () => {
    expect(errorMessage(new TypeError("Failed to fetch"))).toBe("Something went wrong. Try again.")
    expect(errorMessage("oops")).toBe("Something went wrong. Try again.")
  })

  it("has a label for unknown fields", () => {
    expect(fieldLabel("something_new")).toBe("another field")
  })
})
