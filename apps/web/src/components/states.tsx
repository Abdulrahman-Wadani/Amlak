import type { ReactNode } from "react"
import { Trans } from "@lingui/react/macro"
import { CircleAlert, Clock3, Info, Inbox, RotateCw, TriangleAlert, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

/**
 * The screen states of the design (Amlak-States): an empty list, a list
 * loading, a list that failed, notice boxes, and the delete confirmation.
 */

/** A list with nothing in it: an icon, a title and one line, centred in a card. */
export function EmptyState({
  title,
  text,
  icon,
  action,
  card = true,
}: {
  title: ReactNode
  text?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  /** false when it already sits inside a card. */
  card?: boolean
}) {
  const body = (
    <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary [&_svg]:size-6"
      >
        {icon ?? <Inbox strokeWidth={1.8} />}
      </span>
      <h2 className="m-0 text-lg leading-[1.4] font-bold">{title}</h2>
      {text && <span className="max-w-[32em] text-sm text-muted-foreground">{text}</span>}
      {action}
    </div>
  )
  return card ? (
    <section className="box-border flex min-w-0 flex-col gap-4 border border-border bg-card p-6 shadow-sm">{body}</section>
  ) : (
    body
  )
}

/** A list loading: grey bars in the shape of its rows. */
export function LoadingList({ rows = 3, card = true }: { rows?: number; card?: boolean }) {
  const body = (
    <div aria-busy="true" aria-live="polite" className="flex flex-col">
      <span className="sr-only">
        <Trans>Loading…</Trans>
      </span>
      <div aria-hidden="true" className="h-[18px] w-[45%] rounded-md bg-secondary" />
      <div aria-hidden="true" className="h-3" />
      {Array.from({ length: rows }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows
        <div key={index} aria-hidden="true" className="flex flex-col gap-2 border-t border-border py-3">
          <div className="h-3.5 w-[70%] rounded-md bg-secondary" />
          <div className="h-3 w-[40%] rounded-md bg-secondary" />
        </div>
      ))}
    </div>
  )
  return card ? (
    <section className="box-border flex min-w-0 flex-col border border-border bg-card p-6 shadow-sm">{body}</section>
  ) : (
    body
  )
}

/** A list that could not load, with Try again. */
export function LoadError({
  title,
  onRetry,
  card = true,
}: {
  title: ReactNode
  onRetry?: () => void
  card?: boolean
}) {
  const body = (
    <div role="alert" className="flex flex-col items-center gap-3 px-2 py-6 text-center">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-crit-50 text-destructive [&_svg]:size-6"
      >
        <WifiOff strokeWidth={1.8} />
      </span>
      <h2 className="m-0 text-lg leading-[1.4] font-bold">{title}</h2>
      <span className="text-sm text-muted-foreground">
        <Trans>Check your connection, then try again.</Trans>
      </span>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          <Trans>Try again</Trans>
        </Button>
      )}
    </div>
  )
  return card ? (
    <section className="box-border flex min-w-0 flex-col gap-4 border border-border bg-card p-6 shadow-sm">{body}</section>
  ) : (
    body
  )
}

const TONES = {
  crit: { box: "border-crit-200 bg-crit-50", text: "text-crit-900", icon: <TriangleAlert /> },
  warn: { box: "border-warn-200 bg-warn-50", text: "text-warn-900", icon: <Clock3 /> },
  info: { box: "border-info-200 bg-info-50", text: "text-info-900", icon: <Info /> },
  good: { box: "border-good-200 bg-good-50", text: "text-good-900", icon: <CircleAlert /> },
} as const

/** A coloured notice: a bold first line and an optional second one (sign-in errors, a status that changed). */
export function Notice({
  tone,
  title,
  children,
  icon,
  live = true,
}: {
  tone: keyof typeof TONES
  title: ReactNode
  children?: ReactNode
  icon?: ReactNode
  live?: boolean
}) {
  const look = TONES[tone]
  return (
    <div
      role={live ? (tone === "crit" ? "alert" : "status") : undefined}
      className={`flex items-start gap-2.5 border px-3.5 py-3 text-sm leading-[1.6] ${look.box}`}
    >
      <span aria-hidden="true" className={`pt-0.5 [&_svg]:size-4 [&_svg]:stroke-[1.8] ${look.text}`}>
        {icon ?? look.icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <strong className={`font-semibold ${look.text}`}>{title}</strong>
        {children && <span className="text-foreground">{children}</span>}
      </div>
    </div>
  )
}

/** The delete confirmation: a title naming what goes, what happens, Cancel and the red button. */
export function ConfirmDialog({
  open,
  title,
  text,
  confirm,
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: ReactNode
  text: ReactNode
  confirm: ReactNode
  busy?: boolean
  error?: ReactNode
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="box-border flex max-w-[calc(100%-2rem)] flex-col gap-3 rounded-[4px] bg-card p-6 ring-0 sm:max-w-[360px]"
      >
        <DialogTitle className="m-0 text-xl leading-[1.4] font-bold">{title}</DialogTitle>
        <DialogDescription className="m-0 text-sm leading-[1.7] text-muted-foreground">{text}</DialogDescription>
        {error && (
          <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" variant="destructive-soft" disabled={busy} onClick={onConfirm}>
            {confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
