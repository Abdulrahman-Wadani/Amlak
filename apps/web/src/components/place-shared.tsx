import type { ReactNode } from "react"
import { Trans } from "@lingui/react/macro"
import { S } from "@/lib/dom-style"

function Chip({
  border,
  bg,
  text,
  dot,
  children,
}: {
  border: string
  bg: string
  text: string
  dot: string
  children: ReactNode
}) {
  return (
    <span
      style={S(
        `display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; box-sizing: border-box; border: 1px solid ${border}; background: ${bg}; color: ${text}; font-size: 13px; font-weight: 600; white-space: nowrap; flex: none`
      )}
    >
      <span
        aria-hidden="true"
        style={S(`width: 7px; height: 7px; flex: none; background: ${dot}`)}
      />
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <Chip
        bg="var(--good-50)"
        border="var(--good-200)"
        text="var(--good-700)"
        dot="var(--good)"
      >
        <Trans>Active</Trans>
      </Chip>
    )
  }
  if (status === "UNDER_MAINTENANCE") {
    return (
      <Chip
        bg="var(--warn-50)"
        border="var(--warn-200)"
        text="var(--warn-700)"
        dot="var(--warn)"
      >
        <Trans>Under maintenance</Trans>
      </Chip>
    )
  }
  return (
    <Chip bg="#ffffff" border="var(--border)" text="var(--ink)" dot="#5b636e">
      <Trans>Inactive</Trans>
    </Chip>
  )
}

export function TypeLabel({ type }: { type: string }) {
  switch (type.toUpperCase().replace(/[\s-]+/g, "_")) {
    case "APARTMENT":
      return <Trans>Apartment</Trans>
    case "VILLA":
      return <Trans>Villa</Trans>
    case "REST_HOUSE":
      return <Trans>Rest house</Trans>
    case "ROOM":
      return <Trans>Room</Trans>
    case "CHALET":
      return <Trans>Chalet</Trans>
    default:
      return <>{type}</>
  }
}

export function Meta({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div style={S("display: flex; flex-direction: column; gap: 2px")} data-slot="place-meta">
      <span style={S("color: var(--muted-foreground); font-size: 12px")}>
        {label}
      </span>
      <span style={S("font-weight: 700; font-size: 15px")}>{value}</span>
    </div>
  )
}
