import type { ReactNode } from "react"
import type { TicketStatus } from "@amlak/shared"
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
        bg="var(--info-50)"
        border="var(--info-200)"
        text="var(--info-900)"
        dot="var(--info)"
      >
        <Trans>Under maintenance</Trans>
      </Chip>
    )
  }
  if (status === "OPEN") {
    return (
      <Chip
        bg="var(--warn-50)"
        border="var(--warn-200)"
        text="var(--warn-900)"
        dot="var(--warn)"
      >
        <Trans>Open</Trans>
      </Chip>
    )
  }
  if (status === "RESOLVED") {
    return (
      <Chip
        bg="var(--good-50)"
        border="var(--good-200)"
        text="var(--good-700)"
        dot="var(--good)"
      >
        <Trans>Resolved</Trans>
      </Chip>
    )
  }
  return (
    <Chip bg="var(--secondary)" border="var(--border)" text="var(--muted-foreground)" dot="var(--muted-foreground)">
      <Trans>Inactive</Trans>
    </Chip>
  )
}

export function AssetStatusBadge({ status }: { status: string }) {
  if (status === "GOOD") {
    return (
      <Chip
        bg="var(--good-50)"
        border="var(--good-200)"
        text="var(--good-700)"
        dot="var(--good)"
      >
        <Trans>Good</Trans>
      </Chip>
    )
  }
  if (status === "NEEDS_MAINTENANCE") {
    return (
      <Chip
        bg="var(--warn-50)"
        border="var(--warn-200)"
        text="var(--warn-900)"
        dot="var(--warn)"
      >
        <Trans>Needs maintenance</Trans>
      </Chip>
    )
  }
  if (status === "UNDER_MAINTENANCE") {
    return (
      <Chip
        bg="var(--info-50)"
        border="var(--info-200)"
        text="var(--info-900)"
        dot="var(--info)"
      >
        <Trans>Under maintenance</Trans>
      </Chip>
    )
  }
  return (
    <Chip
      bg="var(--crit-50)"
      border="var(--crit-200)"
      text="var(--crit-900)"
      dot="var(--crit)"
    >
      <Trans>Out of service</Trans>
    </Chip>
  )
}

export function BookingStatusChip({ status }: { status: string }) {
  if (status === "CHECKED_IN") {
    return (
      <Chip
        bg="var(--good-50)"
        border="var(--good-200)"
        text="var(--good-700)"
        dot="var(--good)"
      >
        <Trans>Staying</Trans>
      </Chip>
    )
  }
  if (status === "CHECKED_OUT") {
    return (
      <Chip
        bg="var(--secondary)"
        border="var(--border)"
        text="var(--muted-foreground)"
        dot="var(--muted-foreground)"
      >
        <Trans>Checked out</Trans>
      </Chip>
    )
  }
  if (status === "CANCELLED") {
    return (
      <Chip
        bg="var(--crit-50)"
        border="var(--crit-200)"
        text="var(--crit-900)"
        dot="var(--crit)"
      >
        <Trans>Cancelled</Trans>
      </Chip>
    )
  }
  return (
    <Chip bg="var(--info-50)" border="var(--info-200)" text="var(--info-900)" dot="var(--info)">
      <Trans>Confirmed</Trans>
    </Chip>
  )
}

/** A worker account's status, as on the workers page. */
export function WorkerStatusChip({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <Chip bg="var(--good-50)" border="var(--good-200)" text="var(--good-700)" dot="var(--good)">
        <Trans>Active</Trans>
      </Chip>
    )
  }
  if (status === "DEACTIVATED") {
    return (
      <Chip bg="var(--secondary)" border="var(--border)" text="var(--muted-foreground)" dot="var(--muted-foreground)">
        <Trans>Deactivated</Trans>
      </Chip>
    )
  }
  // INVITED, and PENDING_VERIFICATION, which a worker account does not reach.
  return (
    <Chip bg="var(--info-50)" border="var(--info-200)" text="var(--info-900)" dot="var(--info)">
      <Trans>Invited</Trans>
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

export function PriorityChip({ priority }: { priority: string }) {
  if (priority === "URGENT" || priority === "HIGH") {
    return (
      <Chip
        bg="var(--crit-50)"
        border="var(--crit-200)"
        text="var(--crit-900)"
        dot="var(--crit)"
      >
        {priority === "URGENT" ? <Trans>Urgent</Trans> : <Trans>High</Trans>}
      </Chip>
    )
  }
  return (
    <Chip
      bg="var(--muted)"
      border="var(--border)"
      text="var(--foreground)"
      dot="var(--muted-foreground)"
    >
      {priority === "MEDIUM" ? <Trans>Medium</Trans> : <Trans>Low</Trans>}
    </Chip>
  )
}

export function OverdueChip() {
  return (
    <Chip
      bg="var(--crit-50)"
      border="var(--crit-200)"
      text="var(--crit-900)"
      dot="var(--crit)"
    >
      <Trans>Overdue</Trans>
    </Chip>
  )
}

/**
 * A maintenance ticket's status. (StatusBadge is for places and support
 * tickets.) Every status has its own case, so a new one is a type error here
 * rather than a wrong label.
 */
export function TicketStatusChip({ status }: { status: TicketStatus }) {
  switch (status) {
    case "PENDING_REVIEW":
      return (
        <Chip bg="var(--warn-50)" border="var(--warn-200)" text="var(--warn-900)" dot="var(--warn)">
          <Trans>Pending review</Trans>
        </Chip>
      )
    case "APPROVED":
      return (
        <Chip bg="var(--info-50)" border="var(--info-200)" text="var(--info-900)" dot="var(--info)">
          <Trans>Approved</Trans>
        </Chip>
      )
    case "REJECTED":
      return (
        <Chip bg="var(--secondary)" border="var(--border)" text="var(--muted-foreground)" dot="var(--muted-foreground)">
          <Trans>Rejected</Trans>
        </Chip>
      )
    case "COMPLETED":
      return (
        <Chip bg="var(--good-50)" border="var(--good-200)" text="var(--good-700)" dot="var(--good)">
          <Trans>Completed</Trans>
        </Chip>
      )
  }
}
