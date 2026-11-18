import { describe, expect, it } from "vitest"
import { currentTab, desktopNav, mobileTabs, sectionOf, type Role } from "@/lib/nav"

const targets = (items: { to: string }[]) => items.map((item) => item.to)

describe("navigation per role", () => {
  it("gives each role the design's top bar links", () => {
    expect(targets(desktopNav("MANAGER"))).toEqual(["/home", "/places", "/tickets", "/bookings", "/expenses", "/workers"])
    expect(targets(desktopNav("WORKER"))).toEqual(["/home", "/places", "/tickets", "/bookings"])
    expect(targets(desktopNav("ADMIN"))).toEqual(["/admin", "/support", "/announcements", "/content"])
  })

  it("gives each role five bottom tabs ending with Account", () => {
    expect(targets(mobileTabs("MANAGER"))).toEqual(["/home", "/places", "/tickets", "/bookings", "/profile"])
    expect(targets(mobileTabs("WORKER"))).toEqual(["/home", "/places", "/tickets", "/bookings", "/profile"])
    expect(targets(mobileTabs("ADMIN"))).toEqual(["/admin", "/support", "/announcements", "/content", "/profile"])
  })
})

describe("sectionOf", () => {
  it.each([
    ["/home", "home"],
    ["/places", "places"],
    ["/place/abc", "places"],
    ["/place/asset/abc", "places"],
    ["/tickets", "tickets"],
    ["/ticket/abc", "tickets"],
    ["/bookings", "bookings"],
    ["/expenses", "finance"],
    ["/reports", "finance"],
    ["/workers", "workers"],
    ["/worker/abc", "workers"],
    ["/profile", "account"],
    ["/admin/abc", "users"],
    ["/support/abc", "support"],
    ["/announcements", "announcements"],
    ["/content/abc", "content"],
    ["/notifications", null],
  ])("puts %s in %s", (path, section) => {
    expect(sectionOf(path)).toBe(section)
  })
})

describe("currentTab", () => {
  it("marks Account for a manager's finance and workers pages, which are reached from Account", () => {
    expect(currentTab("MANAGER", "finance")).toBe("account")
    expect(currentTab("MANAGER", "workers")).toBe("account")
    expect(currentTab("MANAGER", "places")).toBe("places")
  })

  it("marks no tab for pages outside the tabs", () => {
    for (const role of ["MANAGER", "WORKER"] as Role[]) {
      const sections = mobileTabs(role).map((item) => item.section)
      expect(sections).not.toContain(currentTab(role, sectionOf("/support")))
      expect(currentTab(role, sectionOf("/notifications"))).toBeNull()
    }
  })
})
