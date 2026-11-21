import { describe, expect, it } from "vitest"
import {
  assetInput,
  bookingInput,
  placeInput,
  signInInput,
  signUpInput,
} from "@/lib/validators"

const validBooking = {
  guest_name: "Sara Ahmed",
  guest_phone: "+966500000000",
  guest_count: 2,
  check_in_date: "2026-12-01",
  check_out_date: "2026-12-05",
  total_price: 1500,
}

const validPlace = {
  place_name: "Sea View Villa",
  place_type: "Villa",
  city: "Jeddah",
}

describe("signInInput", () => {
  it("accepts an email and a password", () => {
    expect(signInInput.safeParse({ email: "user@example.com", password: "x" }).success).toBe(true)
  })

  it("normalizes the email to lowercase without outer spaces", () => {
    const result = signInInput.parse({ email: "  User@Example.COM ", password: "x" })
    expect(result.email).toBe("user@example.com")
  })

  it("rejects an empty password", () => {
    expect(signInInput.safeParse({ email: "user@example.com", password: "" }).success).toBe(false)
  })

  it("rejects a malformed email", () => {
    expect(signInInput.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false)
  })
})

describe("signUpInput", () => {
  const valid = {
    fullname: "Sara Ahmed",
    email: "sara@example.com",
    phone: "+966512345678",
    password: "Passw0rd!",
  }

  it("accepts a complete registration", () => {
    expect(signUpInput.safeParse(valid).success).toBe(true)
  })

  it("requires a password of at least 8 characters", () => {
    expect(signUpInput.safeParse({ ...valid, password: "Pa0!" }).success).toBe(false)
  })

  it("requires an uppercase letter, a lowercase letter and a symbol", () => {
    expect(signUpInput.safeParse({ ...valid, password: "password!" }).success).toBe(false)
    expect(signUpInput.safeParse({ ...valid, password: "PASSWORD!" }).success).toBe(false)
    expect(signUpInput.safeParse({ ...valid, password: "Password1" }).success).toBe(false)
  })

  it("accepts only a Saudi mobile number", () => {
    expect(signUpInput.safeParse({ ...valid, phone: "+966512345678" }).success).toBe(true)
    expect(signUpInput.safeParse({ ...valid, phone: "+966412345678" }).success).toBe(false)
    expect(signUpInput.safeParse({ ...valid, phone: "0512345678" }).success).toBe(false)
  })

  it("requires a full name", () => {
    expect(signUpInput.safeParse({ ...valid, fullname: "   " }).success).toBe(false)
  })
})

describe("placeInput", () => {
  it("accepts the required fields", () => {
    expect(placeInput.safeParse(validPlace).success).toBe(true)
  })

  it("requires the name, type and city", () => {
    expect(placeInput.safeParse({ ...validPlace, city: "" }).success).toBe(false)
    expect(placeInput.safeParse({ ...validPlace, place_name: "" }).success).toBe(false)
    expect(placeInput.safeParse({ ...validPlace, place_type: "" }).success).toBe(false)
  })

  it("requires latitude and longitude to be sent together", () => {
    const result = placeInput.safeParse({ ...validPlace, latitude: 21.5 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["latitude"])
    }
  })

  it("accepts coordinates sent as a pair", () => {
    expect(placeInput.safeParse({ ...validPlace, latitude: 21.5, longitude: 39.2 }).success).toBe(
      true,
    )
  })

  it("keeps coordinates in range", () => {
    expect(
      placeInput.safeParse({ ...validPlace, latitude: 91, longitude: 0 }).success,
    ).toBe(false)
    expect(
      placeInput.safeParse({ ...validPlace, latitude: 0, longitude: -181 }).success,
    ).toBe(false)
  })

  it("requires a 3-letter currency code", () => {
    expect(placeInput.safeParse({ ...validPlace, currency: "SAR" }).success).toBe(true)
    expect(placeInput.safeParse({ ...validPlace, currency: "sar" }).success).toBe(false)
    expect(placeInput.safeParse({ ...validPlace, currency: "SARR" }).success).toBe(false)
  })

  it("accepts only IANA time zones", () => {
    expect(placeInput.safeParse({ ...validPlace, timezone: "Asia/Riyadh" }).success).toBe(true)
    expect(placeInput.safeParse({ ...validPlace, timezone: "Mars/Olympus" }).success).toBe(false)
  })

  it("does not allow a negative maintenance budget", () => {
    expect(
      placeInput.safeParse({ ...validPlace, monthly_maintenance_budget: -1 }).success,
    ).toBe(false)
    expect(
      placeInput.safeParse({ ...validPlace, monthly_maintenance_budget: 0 }).success,
    ).toBe(true)
  })
})

describe("assetInput", () => {
  it("accepts a name and a type", () => {
    expect(assetInput.safeParse({ name: "Air conditioner", type: "HVAC" }).success).toBe(true)
  })

  it("requires a name and a type", () => {
    expect(assetInput.safeParse({ name: "", type: "HVAC" }).success).toBe(false)
    expect(assetInput.safeParse({ name: "Fridge", type: " " }).success).toBe(false)
  })

  it("accepts a purchase date in YYYY-MM-DD format only", () => {
    expect(
      assetInput.safeParse({ name: "Fridge", type: "Kitchen", purchase_date: "2026-03-10" }).success,
    ).toBe(true)
    expect(
      assetInput.safeParse({ name: "Fridge", type: "Kitchen", purchase_date: "10/03/2026" }).success,
    ).toBe(false)
  })

  it("accepts a status from the allowed list only", () => {
    expect(assetInput.safeParse({ name: "Fridge", type: "Kitchen", status: "GOOD" }).success).toBe(
      true,
    )
    expect(assetInput.safeParse({ name: "Fridge", type: "Kitchen", status: "BROKEN" }).success).toBe(
      false,
    )
  })
})

describe("bookingInput", () => {
  it("accepts a valid booking", () => {
    expect(bookingInput.safeParse(validBooking).success).toBe(true)
  })

  it("requires check-out to be after check-in", () => {
    const result = bookingInput.safeParse({ ...validBooking, check_out_date: "2026-12-01" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["check_out_date"])
    }
  })

  it("rejects a check-out before check-in", () => {
    expect(
      bookingInput.safeParse({ ...validBooking, check_out_date: "2026-11-30" }).success,
    ).toBe(false)
  })

  it("converts guest count and price sent as text", () => {
    const result = bookingInput.parse({ ...validBooking, guest_count: "3", total_price: "250.5" })
    expect(result.guest_count).toBe(3)
    expect(result.total_price).toBe(250.5)
  })

  it("keeps the guest count between 1 and 100 and a whole number", () => {
    expect(bookingInput.safeParse({ ...validBooking, guest_count: 0 }).success).toBe(false)
    expect(bookingInput.safeParse({ ...validBooking, guest_count: 101 }).success).toBe(false)
    expect(bookingInput.safeParse({ ...validBooking, guest_count: 2.5 }).success).toBe(false)
  })

  it("requires the guest phone to start with + and a country code", () => {
    expect(bookingInput.safeParse({ ...validBooking, guest_phone: "0500000000" }).success).toBe(
      false,
    )
  })

  it("does not allow a negative price", () => {
    expect(bookingInput.safeParse({ ...validBooking, total_price: -10 }).success).toBe(false)
  })

  it("accepts an optional guest email, but rejects a malformed one", () => {
    expect(
      bookingInput.safeParse({ ...validBooking, guest_email: "guest@example.com" }).success,
    ).toBe(true)
    expect(bookingInput.safeParse({ ...validBooking, guest_email: "guest" }).success).toBe(false)
  })
})
