import { describe, expect, it } from "vitest"
import { S } from "@/lib/dom-style"

describe("S", () => {
  it("turns a CSS declaration list into a style object", () => {
    expect(S("display: block; flex: none; width: 18px")).toEqual({
      display: "block",
      flex: "none",
      width: "18px",
    })
  })

  it("converts hyphenated property names to camelCase", () => {
    expect(S("background-color: red; margin-top: 4px")).toEqual({
      backgroundColor: "red",
      marginTop: "4px",
    })
  })

  it("keeps colons inside a value", () => {
    expect(S("background: url(https://example.com/a.png)")).toEqual({
      background: "url(https://example.com/a.png)",
    })
  })

  it("skips declarations without a colon and empty entries", () => {
    expect(S("color: blue; broken; ; height: 2px;")).toEqual({
      color: "blue",
      height: "2px",
    })
  })

  it("returns an empty object for an empty string", () => {
    expect(S("")).toEqual({})
  })
})
