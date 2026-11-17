import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { Pager } from "@/components/pager"

const renderPager = (page: number, totalPages: number, onPage = vi.fn()) => {
  render(
    <I18nProvider i18n={i18n}>
      <Pager page={page} totalPages={totalPages} onPage={onPage} />
    </I18nProvider>,
  )
  return onPage
}

describe("Pager", () => {
  it("renders nothing for a single page", () => {
    renderPager(1, 1)
    expect(screen.queryByRole("navigation")).toBeNull()
  })

  it("shows the page and moves between pages", () => {
    const onPage = renderPager(2, 3)
    expect(screen.getByText("Page 2 of 3")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "Previous" }))
    expect(onPage.mock.calls).toEqual([[3], [1]])
  })

  it("disables Previous on the first page and Next on the last", () => {
    renderPager(1, 2)
    expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false)
  })
})
