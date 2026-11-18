import { describe, expect, it } from "vitest"
import { LIMITS, tooLarge, tooLong } from "@/lib/limits"

describe("tooLong", () => {
  it("accepts text up to the limit, spaces at the ends not counted", () => {
    expect(tooLong("a".repeat(LIMITS.name), LIMITS.name)).toBeUndefined()
    expect(tooLong(`  ${"a".repeat(LIMITS.name)}  `, LIMITS.name)).toBeUndefined()
    expect(tooLong("", LIMITS.name)).toBeUndefined()
    expect(tooLong(null, LIMITS.name)).toBeUndefined()
  })

  it("refuses one character more, naming the limit", () => {
    expect(tooLong("a".repeat(LIMITS.text + 1), LIMITS.text)).toBe("Use 1000 characters or fewer.")
  })
})

describe("tooLarge", () => {
  it("accepts amounts up to the money limit", () => {
    expect(tooLarge(LIMITS.money)).toBeUndefined()
    expect(tooLarge("10000000")).toBeUndefined()
    expect(tooLarge("")).toBeUndefined()
    expect(tooLarge(undefined)).toBeUndefined()
  })

  it("refuses more than the limit, with the limit in Western digits", () => {
    expect(tooLarge(LIMITS.money + 0.01)).toBe("Enter 10,000,000 or less.")
    expect(tooLarge("20000000")).toBe("Enter 10,000,000 or less.")
  })
})
