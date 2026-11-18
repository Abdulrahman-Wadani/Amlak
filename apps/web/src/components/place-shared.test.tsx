import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { TicketStatus } from "@amlak/shared"
import { TicketStatusChip } from "@/components/place-shared"

describe("TicketStatusChip", () => {
  it.each<[TicketStatus, string]>([
    ["PENDING_REVIEW", "Pending review"],
    ["APPROVED", "Approved"],
    ["REJECTED", "Rejected"],
    ["COMPLETED", "Completed"],
  ])("shows %s as %s", (status, label) => {
    render(
      <I18nProvider i18n={i18n}>
        <TicketStatusChip status={status} />
      </I18nProvider>,
    )
    expect(screen.getByText(label)).toBeTruthy()
  })
})
