import { describe, expect, it } from "vitest"
import { createExpenseSchema } from "@amlak/shared"

const validExpense = {
  category: "MAINTENANCE",
  amount: "320",
  expense_date: "2026-11-10",
}

describe("createExpenseSchema", () => {
  it("accepts a category, amount and date", () => {
    expect(createExpenseSchema.safeParse(validExpense).success).toBe(true)
  })

  it("turns the amount text into a number", () => {
    expect(createExpenseSchema.parse(validExpense).amount).toBe(320)
    expect(createExpenseSchema.parse({ ...validExpense, amount: "320.50" }).amount).toBe(320.5)
  })

  it("allows at most 2 decimal places", () => {
    expect(createExpenseSchema.safeParse({ ...validExpense, amount: "12.345" }).success).toBe(false)
  })

  it("rejects an amount that is not a plain number", () => {
    expect(createExpenseSchema.safeParse({ ...validExpense, amount: "abc" }).success).toBe(false)
    expect(createExpenseSchema.safeParse({ ...validExpense, amount: "-5" }).success).toBe(false)
  })

  it("rejects an amount of zero", () => {
    expect(createExpenseSchema.safeParse({ ...validExpense, amount: "0" }).success).toBe(false)
  })

  it("accepts only the listed categories", () => {
    expect(createExpenseSchema.safeParse({ ...validExpense, category: "CLEANING" }).success).toBe(
      true,
    )
    expect(createExpenseSchema.safeParse({ ...validExpense, category: "RENT" }).success).toBe(false)
  })

  it("requires the date in YYYY-MM-DD format", () => {
    expect(createExpenseSchema.safeParse({ ...validExpense, expense_date: "10-11-2026" }).success).toBe(
      false,
    )
  })

  it("accepts an optional ticket id only when it is a UUID", () => {
    expect(
      createExpenseSchema.safeParse({
        ...validExpense,
        ticket_id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5f6e7a8b9c",
      }).success,
    ).toBe(true)
    expect(createExpenseSchema.safeParse({ ...validExpense, ticket_id: "42" }).success).toBe(false)
  })
})
