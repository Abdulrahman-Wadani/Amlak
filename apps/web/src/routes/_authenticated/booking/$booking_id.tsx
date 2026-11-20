import { useCallback, useEffect, useState } from "react"
import { createFileRoute, useParams } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Check, LogOut } from "lucide-react"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { cancelBooking, checkInBooking, checkOutBooking, getBooking, getPlace, type Booking } from "@/lib/api"
import { todayIn } from "@/lib/dates"
import { errorMessage } from "@/lib/errors"
import { LIMITS, tooLong } from "@/lib/limits"
import { useFormat } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Page } from "@/components/page"
import { Field, InfoRows, Panel, PhoneActionBar, TwoColumns } from "@/components/panel"
import { BookingStatusChip } from "@/components/place-shared"
import { LoadError, Notice } from "@/components/states"
import { toast } from "@/components/toast"
import { nightsBetween } from "@/components/booking-parts"

export const Route = createFileRoute("/_authenticated/booking/$booking_id")({
  component: BookingPage,
})

/** A booking: the stay and the guest, and checking in, checking out or cancelling. */
function BookingPage() {
  const { booking_id } = useParams({ from: "/_authenticated/booking/$booking_id" })
  const { accessToken } = useAuth()
  const { date, number, dateFormat } = useFormat()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")

  const load = useCallback(async () => {
    if (!accessToken) return
    const found = await getBooking(accessToken, booking_id)
    setBooking(found)
    return found
  }, [accessToken, booking_id])

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    load()
      .then(async (found) => {
        if (!found) return
        const p = await getPlace(accessToken, found.place_id)
        if (alive) setPlace(p)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, load])

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true)
    setError("")
    try {
      await action()
      toast(done)
      await load()
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (!accessToken || !booking) return
    const reasonProblem = reason.trim() ? tooLong(reason, LIMITS.text) : t`Write the reason.`
    if (reasonProblem) {
      setReasonError(reasonProblem)
      return
    }
    setReasonError("")
    if (await run(() => cancelBooking(accessToken, booking.id, reason.trim()), t`Booking cancelled.`)) setCancelling(false)
  }

  const day = (value: string) => date(value, { weekday: "long", day: "numeric", month: "long" })
  const moment = (value: string) => dateFormat({ weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date(value))
  const title = booking ? t`${booking.guest_name}’s booking` : undefined
  const today = place ? todayIn(place.timezone) : ""

  if (failed) {
    return (
      <Page title={<Trans>Booking</Trans>} parent={{ label: <Trans>Bookings</Trans>, link: { to: "/bookings" } }}>
        <LoadError title={<Trans>Could not load this booking</Trans>} onRetry={() => window.location.reload()} />
      </Page>
    )
  }

  const checkIn = booking && accessToken && (
    <Button
      type="button"
      className="h-14 w-full"
      disabled={busy || !booking.ready_for_check_in}
      onClick={() => void run(() => checkInBooking(accessToken, booking.id), t`Guest checked in.`)}
    >
      <Check aria-hidden="true" />
      <Trans>Check in guest</Trans>
    </Button>
  )
  const checkOut = booking && accessToken && (
    <Button
      type="button"
      className="h-14 w-full"
      disabled={busy}
      onClick={() => void run(() => checkOutBooking(accessToken, booking.id), t`Guest checked out.`)}
    >
      <LogOut aria-hidden="true" className="rtl:rotate-180" />
      <Trans>Check out guest</Trans>
    </Button>
  )

  return (
    <Page
      title={title ?? <Skeleton className="h-7 w-72" />}
      phoneTitle={<Trans>Booking</Trans>}
      parent={{ label: <Trans>Bookings</Trans>, link: { to: "/bookings" } }}
      phoneEnd="none"
      tabs={false}
    >
      {booking === null ? (
        <Skeleton className="h-96" />
      ) : (
        <TwoColumns
          main={
            <Panel className="gap-2">
              <div className="flex items-start justify-between gap-3 pb-1">
                <div className="flex min-w-0 flex-col leading-[1.5]">
                  <span dir="auto" className="font-semibold">
                    {booking.guest_name}
                  </span>
                  <span className="text-[13px] text-muted-foreground">{place?.place_name}</span>
                </div>
                <BookingStatusChip status={booking.status} />
              </div>
              <InfoRows
                rows={[
                  { label: <Trans>Check-in</Trans>, value: day(booking.check_in_date) },
                  { label: <Trans>Check-out</Trans>, value: day(booking.check_out_date) },
                  {
                    label: <Trans>Nights</Trans>,
                    value: <span className="font-mono tabular-nums">{number(nightsBetween(booking.check_in_date, booking.check_out_date))}</span>,
                  },
                  { label: <Trans>Guests</Trans>, value: <span className="font-mono tabular-nums">{number(booking.guest_count)}</span> },
                  { label: <Trans>Phone</Trans>, value: <bdi dir="ltr">{booking.guest_phone}</bdi> },
                  ...(booking.guest_email ? [{ label: <Trans>Email</Trans>, value: <bdi dir="ltr">{booking.guest_email}</bdi> }] : []),
                  {
                    label: <Trans>Total price</Trans>,
                    value: (
                      <span className="whitespace-nowrap">
                        <span className="font-mono tabular-nums">{number(booking.total_price, { maximumFractionDigits: 2 })}</span>{" "}
                        <span className="text-xs">{booking.currency}</span>
                      </span>
                    ),
                  },
                  ...(booking.notes ? [{ label: <Trans>Notes</Trans>, value: <span dir="auto">{booking.notes}</span> }] : []),
                ]}
              />
            </Panel>
          }
          side={
            <Panel className="gap-3">
              {booking.status === "CONFIRMED" && (
                <>
                  {booking.ready_for_check_in ? (
                    <Notice tone="good" icon={<Check />} title={<Trans>The place is ready for arrival.</Trans>}>
                      <Trans>No guest is staying now, and the arrival day has come.</Trans>
                    </Notice>
                  ) : (
                    <Notice tone="info" title={<Trans>Not ready for check-in yet.</Trans>}>
                      {booking.check_in_date > today ? (
                        <Trans>Check-in opens on {day(booking.check_in_date)}.</Trans>
                      ) : (
                        <Trans>Another guest has not checked out yet.</Trans>
                      )}
                    </Notice>
                  )}
                  <div className="hidden desk:block">{checkIn}</div>
                  <span className="text-[13px] text-muted-foreground">
                    <Trans>The check-out button appears after check-in.</Trans>
                  </span>
                  <Button type="button" variant="destructive" className="w-full" disabled={busy} onClick={() => setCancelling(true)}>
                    <Trans>Cancel booking</Trans>
                  </Button>
                  <PhoneActionBar>{checkIn}</PhoneActionBar>
                </>
              )}
              {booking.status === "CHECKED_IN" && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {booking.checked_in_at ? (
                      <Trans>
                        Checked in {moment(booking.checked_in_at)}, leaves {day(booking.check_out_date)}.
                      </Trans>
                    ) : (
                      <Trans>Leaves {day(booking.check_out_date)}.</Trans>
                    )}
                  </span>
                  <div className="hidden desk:block">{checkOut}</div>
                  <PhoneActionBar>{checkOut}</PhoneActionBar>
                </>
              )}
              {booking.status === "CHECKED_OUT" && (
                <Notice tone="info" icon={<LogOut />} title={<Trans>The guest has checked out.</Trans>}>
                  {booking.checked_out_at && <Trans>Checked out {moment(booking.checked_out_at)}.</Trans>}
                </Notice>
              )}
              {booking.status === "CANCELLED" && (
                <Notice tone="crit" title={<Trans>This booking is cancelled.</Trans>}>
                  {booking.cancellation_reason && <span dir="auto">{booking.cancellation_reason}</span>}
                </Notice>
              )}
              {error && (
                <p role="alert" className="m-0 text-[13px] text-destructive">
                  {error}
                </p>
              )}
            </Panel>
          }
        />
      )}
      <Dialog open={cancelling} onOpenChange={(open) => !open && !busy && setCancelling(false)}>
        <DialogContent showCloseButton={false} className="box-border flex flex-col gap-3 rounded-[4px] bg-card p-6 ring-0 sm:max-w-[440px]">
          <DialogTitle className="m-0 text-xl leading-[1.4] font-bold">
            <Trans>Cancel this booking?</Trans>
          </DialogTitle>
          <Field id="cancel-reason" required label={<Trans>Reason for cancelling</Trans>} error={reasonError}>
            <Textarea id="cancel-reason" rows={3} dir="auto" maxLength={LIMITS.text} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setCancelling(false)}>
              <Trans>Back</Trans>
            </Button>
            <Button type="button" variant="destructive-soft" disabled={busy} onClick={() => void cancel()}>
              <Trans>Cancel booking</Trans>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
