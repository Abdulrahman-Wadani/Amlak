import { describe, expect, it } from "vitest"
import { addDays, todayIn } from "@/lib/dates"

describe("addDays", () => {
  it("adds and subtracts days across months and years", () => {
    expect(addDays("2026-11-17", 30)).toBe("2026-12-17")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29")
  })
})

describe("todayIn", () => {
  it("uses the place's time zone", () => {
    // 22:30 UTC on Nov 17 is already Nov 18 in Riyadh (UTC+3).
    const now = new Date("2026-11-17T22:30:00Z")
    expect(todayIn("Asia/Riyadh", now)).toBe("2026-11-18")
    expect(todayIn("UTC", now)).toBe("2026-11-17")
  })

  it("falls back to UTC for an unknown time zone", () => {
    expect(todayIn("Not/AZone", new Date("2026-11-17T10:00:00Z"))).toBe("2026-11-17")
  })
})
