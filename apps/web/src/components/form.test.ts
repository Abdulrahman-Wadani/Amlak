import { describe, expect, it } from "vitest"
import { convertValues, type FormField } from "@/components/form"

describe("convertValues", () => {
  const fields: FormField[] = [
    { name: "title", label: "Title" },
    { name: "budget", label: "Budget", type: "number" },
    { name: "notes", label: "Notes", type: "textarea" },
    { name: "photos", label: "Photos", type: "file" },
    { name: "untouched", label: "Untouched" },
  ]

  it("turns numbers into numbers, empty fields into undefined and keeps files", () => {
    const photo = new File(["x"], "damage.png", { type: "image/png" })
    expect(convertValues(fields, { title: "Pool", budget: "1000", notes: "", photos: [photo] })).toEqual({
      title: "Pool",
      budget: 1000,
      notes: undefined,
      photos: [photo],
      untouched: undefined,
    })
  })
})
