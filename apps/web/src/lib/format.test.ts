import { describe, expect, it } from "vitest"
import { formatDate, formatMoney, formatNumber, intlLocale } from "@/lib/format"

const ARABIC_INDIC = /[\u0660-\u0669\u06F0-\u06F9]/

describe("intlLocale", () => {
  it("uses Western digits for Arabic", () => {
    expect(intlLocale("ar")).toBe("ar-u-nu-latn")
    expect(intlLocale("en")).toBe("en")
  })
})

describe("formatNumber and formatMoney", () => {
  it("writes Arabic numbers with Western digits", () => {
    const ar = formatNumber(1234567.5, "ar")
    expect(ar).not.toMatch(ARABIC_INDIC)
    expect(ar.replace(/\D/g, "")).toBe("12345675")
    expect(formatNumber(1234567.5, "en")).toBe("1,234,567.5")
  })

  it("formats whole amounts without decimals", () => {
    expect(formatMoney(7500, "SAR", "en", { maximumFractionDigits: 0 }).replace(/\s/g, " ")).toBe("SAR 7,500")
  })

  it("formats amounts with their currency", () => {
    // Intl puts a no-break space after the code.
    expect(formatMoney(1150, "SAR", "en").replace(/\s/g, " ")).toBe("SAR 1,150.00")
    const ar = formatMoney(1150, "SAR", "ar")
    expect(ar).not.toMatch(ARABIC_INDIC)
    expect(ar).toContain("1,150")
  })
})

describe("formatDate", () => {
  it("writes Arabic dates with Western digits and Arabic month names", () => {
    const ar = formatDate("2026-11-10", "ar", { year: "numeric", month: "long", day: "numeric" })
    expect(ar).not.toMatch(ARABIC_INDIC)
    expect(ar).toContain("10")
    expect(ar).toContain("\u0646\u0648\u0641\u0645\u0628\u0631") // "November" in Arabic
    expect(ar).toContain("2026")
  })

  it("shows a plain day as that day in any time zone", () => {
    expect(formatDate("2026-11-10", "en", { year: "numeric", month: "short", day: "numeric" })).toBe("Nov 10, 2026")
  })

  it("formats times", () => {
    const time = formatDate(new Date(2026, 10, 10, 16, 5), "ar", { hour: "numeric", minute: "2-digit" })
    expect(time).not.toMatch(ARABIC_INDIC)
    expect(time).toContain("4:05")
  })

  it("returns an empty string for an invalid date", () => {
    expect(formatDate("not a date", "en")).toBe("")
  })
})
