import type { ReactNode } from "react"
import { Trans } from "@lingui/react/macro"
import { Badge } from "@/components/ui/badge"
import { S } from "@/lib/dom-style"


export function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <Badge style={S("height: auto; padding: 4px 10px")}>
        <Trans>Active</Trans>
      </Badge>
    )
  }
  if (status === "UNDER_MAINTENANCE") {
    return (
      <Badge variant="secondary" style={S("height: auto; padding: 4px 10px")}>
        <Trans>Under maintenance</Trans>
      </Badge>
    )
  }
  return (
    <Badge variant="outline" style={S("height: auto; padding: 4px 10px")}>
      <Trans>Inactive</Trans>
    </Badge>
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
