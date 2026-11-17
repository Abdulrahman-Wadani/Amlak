import { describe, expect, it } from "vitest"
import { assetEditProblem } from "@/components/asset-manage"

const today = "2026-11-17"

describe("assetEditProblem", () => {
  it("accepts a valid edit, with or without a purchase date", () => {
    expect(assetEditProblem({ name: "Pump", type: "Pool", purchase_date: "2026-11-17" }, today)).toBeNull()
    expect(assetEditProblem({ name: "Pump", type: "Pool", purchase_date: "" }, today)).toBeNull()
  })

  it("refuses a purchase date in the future", () => {
    expect(assetEditProblem({ name: "Pump", type: "Pool", purchase_date: "2026-11-18" }, today)).toBe(
      "The purchase date cannot be in the future.",
    )
  })

  it("needs a name and a type", () => {
    expect(assetEditProblem({ name: " ", type: "Pool", purchase_date: "" }, today)).toBe("Enter an asset name")
    expect(assetEditProblem({ name: "Pump", type: "", purchase_date: "" }, today)).toBe("Enter a type")
  })
})
