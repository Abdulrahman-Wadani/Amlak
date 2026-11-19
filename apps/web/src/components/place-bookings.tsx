import { useMemo, useState } from "react"
import { useEmbedded } from "@/components/panel"
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Trans, useLingui } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CalendarDays, CircleAlert, Plus } from "lucide-react"
import { BookingStatusChip, Meta } from "@/components/place-shared"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  getBookingsForPlace,
  type Booking,
  type BookingWindow,
} from "@/lib/api"
import { LIMITS, tooLong } from "@/lib/limits"
import { AddBookingPopup } from "@/components/booking-form"
import { useAuth } from "@/lib/auth"
import { S } from "@/lib/dom-style"
import { dateFormat, numberFormat } from "@/lib/format"

type Issue = { path: (string | number)[]; message?: string }

const ALL_WINDOW: BookingWindow = { from: "2000-01-01", to: "2099-12-31" }
const PAGE_SIZE = 100

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function stayReason(error: unknown) {
  const details = (error as { details?: { reason?: string } } | undefined)?.details
  return details && typeof details === "object" ? details.reason : undefined
}

function isConflict(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code === "CONFLICT"
  )
}

export function PlaceBookings({ placeId }: { placeId: string }) {
  const embedded = useEmbedded()
  const { i18n } = useLingui()
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [scope, setScope] = useState("all")
  const [pages, setPages] = useState(1)
  const [adding, setAdding] = useState(false)
  const [cancelling, setCancelling] = useState<Booking | null>(null)
  const [confirmStay, setConfirmStay] = useState<
    { booking: Booking; action: "check-in" | "check-out" } | null
  >(null)
  const [reason, setReason] = useState("")
  const [reasonIssues, setReasonIssues] = useState<Issue[]>([])
  const [today] = useState(() => isoDay(new Date()))

  const bookingsQuery = useQuery({
    queryKey: ["bookings", placeId, ALL_WINDOW.from, ALL_WINDOW.to, pages],
    queryFn: async () => {
      const fetched = await Promise.all(
        Array.from({ length: pages }, (_, index) =>
          getBookingsForPlace(accessToken ?? "", placeId, ALL_WINDOW, index + 1),
        ),
      )
      return fetched.flat()
    },
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const cancelMutation = useMutation({
    mutationFn: (input: { bookingId: string; reason: string }) =>
      cancelBooking(accessToken ?? "", input.bookingId, input.reason),
    onSuccess: () => {
      setCancelling(null)
      setReason("")
      setReasonIssues([])
      return queryClient.invalidateQueries({ queryKey: ["bookings", placeId] })
    },
  })

  const stayMutation = useMutation({
    mutationFn: (input: { bookingId: string; action: "check-in" | "check-out" }) =>
      input.action === "check-in"
        ? checkInBooking(accessToken ?? "", input.bookingId)
        : checkOutBooking(accessToken ?? "", input.bookingId),
    onSuccess: () => {
      setConfirmStay(null)
      return queryClient.invalidateQueries({ queryKey: ["bookings", placeId] })
    },
  })

  const monthKeys = useMemo(() => {
    if (!bookingsQuery.data) return []
    return [...new Set(bookingsQuery.data.map((b) => b.check_in_date.slice(0, 7)))].sort()
  }, [bookingsQuery.data])

  const locale = i18n.locale === "ar" ? "ar" : "en"
  const monthName = dateFormat(locale, { month: "long", year: "numeric" })
  const dayName = dateFormat(locale, { month: "long", day: "numeric" })
  const money = numberFormat(locale)

  // shortcut: the month filter runs on loaded pages (100 at a time); move from/to into the query when a place passes that
  const monthRange =
    scope === "all"
      ? null
      : {
          from: `${scope}-01`,
          to: isoDay(new Date(Number(scope.slice(0, 4)), Number(scope.slice(5, 7)), 0)),
        }
  const bookings = bookingsQuery.data
    ? bookingsQuery.data.filter(
        (b) =>
          !monthRange ||
          (b.check_in_date <= monthRange.to && b.check_out_date > monthRange.from),
      )
    : undefined

  // shortcut: hints use local dates only to explain; ready_for_check_in from the API decides what runs
  const staying = bookings?.find((b) => b.status === "CHECKED_IN")

  const stayHint = (booking: Booking) => {
    if (booking.status !== "CONFIRMED" || booking.ready_for_check_in) return null
    if (booking.check_in_date > today)
      return (
        <>
          <Trans>Check-in opens on</Trans>{" "}
          {dayName.format(new Date(`${booking.check_in_date}T00:00:00`))}
        </>
      )
    if (staying && staying.id !== booking.id)
      return <Trans>Another guest has not checked out yet.</Trans>
    return null
  }

  const busy = cancelMutation.isPending || stayMutation.isPending
  const canLoadMore = Boolean(bookings && bookings.length >= pages * PAGE_SIZE)

  // Add booking opens in a popup over this list.
  function openAdd() {
    setAdding(true)
  }

  function openCancel(booking: Booking) {
    cancelMutation.reset()
    setReason("")
    setReasonIssues([])
    setCancelling(booking)
  }

  function handleCancelSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const reasonProblem = reason.trim() ? tooLong(reason, LIMITS.text) : t`Enter the reason for the cancellation`
    if (reasonProblem) {
      setReasonIssues([{ path: ["reason"], message: reasonProblem }])
      return
    }
    setReasonIssues([])
    cancelMutation.mutate({ bookingId: cancelling?.id ?? "", reason: reason.trim() })
  }

  const stayLabel = (booking: Booking) => {
    const from = new Date(`${booking.check_in_date}T00:00:00`)
    const to = new Date(`${booking.check_out_date}T00:00:00`)
    const day = dateFormat(locale, { day: "numeric" })
    const month = dateFormat(locale, { month: "long" })
    const sameMonth =
      from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()
    return sameMonth
      ? `${day.format(from)} – ${day.format(to)} ${month.format(to)}`
      : `${day.format(from)} ${month.format(from)} – ${day.format(to)} ${month.format(to)}`
  }

  return (
    <Card
      className={embedded ? undefined : "am-lift"}
      style={S(
        embedded
          ? "padding: 0; border: 0; box-shadow: none; background: transparent; overflow: visible; gap: 0"
          : "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0",
      )}
    >
      <CardHeader
        style={S(
          `${embedded ? "padding: 0 0 16px" : "padding: 18px 20px; border-bottom: 1px solid var(--border)"}; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap`,
        )}
      >
        <CardTitle className={embedded ? "sr-only" : undefined} style={S("font-size: 17px; font-weight: 750")}>
          <CalendarDays
            size={17}
            style={S("display: inline; vertical-align: middle; margin-inline-end: 7px")}
          />
          <Trans>Bookings</Trans>
          {bookings && (
            <span
              style={S(
                "margin-inline-start: 8px; font-size: 12px; font-weight: 600; color: var(--muted-foreground); border: 1px solid var(--border); padding: 2px 8px",
              )}
            >
              {bookings.length}
            </span>
          )}
        </CardTitle>

        <Select
          value={scope}
          onValueChange={(value) => {
            setScope(String(value ?? "all"))
            setPages(1)
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label={t`Filter bookings by month`}
            style={S("height: 44px; min-width: 190px")}
          >
            <SelectValue>
              {(value: string | null) =>
                value === "all" || !value ? (
                  <Trans>All bookings</Trans>
                ) : (
                  monthName.format(new Date(`${value}-01T00:00:00`))
                )
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <Trans>All bookings</Trans>
            </SelectItem>
            {monthKeys.map((key) => (
              <SelectItem key={key} value={key}>
                {monthName.format(new Date(`${key}-01T00:00:00`))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* At the end of the first row, where every tab keeps its add button. */}
        <Button type="button" variant="outline" style={S("margin-inline-start: auto")} onClick={openAdd}>
          <Plus size={16} />
          <Trans>Add booking</Trans>
        </Button>
      </CardHeader>

      <CardContent style={S(`padding: ${embedded ? "0" : "20px"}; display: flex; flex-direction: column; gap: 18px`)}>
        {bookingsQuery.isError ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>
              <Trans>We could not load the bookings for this property.</Trans>
            </AlertTitle>
          </Alert>
        ) : bookingsQuery.isPending ? (
          <div style={S("display: flex; flex-direction: column; gap: 10px")}>
            <Skeleton style={S("height: 76px")} />
            <Skeleton style={S("height: 76px")} />
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays />
              </EmptyMedia>
              <EmptyTitle>
                {monthRange ? (
                  <Trans>No bookings in this month.</Trans>
                ) : (
                  <Trans>No bookings for this property yet.</Trans>
                )}
              </EmptyTitle>
              <EmptyDescription>
                <Trans>Add a stay to block its dates on the calendar.</Trans>
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div style={S("display: flex; flex-direction: column; gap: 10px")}>
            {bookings.map((booking) => (
              <div
                key={booking.id}
                style={S(
                  "display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; border: 1px solid var(--border); background: var(--card); padding: 14px",
                )}
              >
                <div style={S("display: flex; flex-direction: column; gap: 5px; min-width: 0")}>
                  <span
                    style={S("font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}
                  >
                    {booking.guest_name}
                  </span>
                  {stayHint(booking) && (
                    <span
                      id={`booking-stay-hint-${booking.id}`}
                      style={S("color: var(--muted-foreground); font-size: 12px")}
                    >
                      {stayHint(booking)}
                    </span>
                  )}
                  <span
                    style={S("color: var(--muted-foreground); font-size: 12px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap")}
                  >
                    <CalendarDays size={13} />
                    <span>{stayLabel(booking)}</span>
                    <span>·</span>
                    <span>
                      {booking.guest_count} <Trans>guests</Trans>
                    </span>
                  </span>
                </div>

                <div style={S("display: flex; align-items: center; gap: 10px; flex-wrap: wrap")}>
                  <span style={S("font-size: 14px; font-weight: 700")}>
                    {money.format(booking.total_price)} {booking.currency}
                  </span>
                  <BookingStatusChip status={booking.status} />
                  {booking.status === "CONFIRMED" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="am-btn"
                        disabled={busy || !booking.ready_for_check_in}
                        aria-describedby={
                          booking.ready_for_check_in ? undefined : `booking-stay-hint-${booking.id}`
                        }
                        onClick={() => {
                          stayMutation.reset()
                          setConfirmStay({ booking, action: "check-in" })
                        }}
                      >
                        <Trans>Check in</Trans>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="am-btn"
                        disabled={busy}
                        onClick={() => openCancel(booking)}
                      >
                        <Trans>Cancel booking</Trans>
                      </Button>
                    </>
                  )}
                  {booking.status === "CHECKED_IN" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="am-btn"
                      disabled={busy}
                      onClick={() => {
                        stayMutation.reset()
                        setConfirmStay({ booking, action: "check-out" })
                      }}
                    >
                      <Trans>Check out</Trans>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canLoadMore && (
          <Button
            type="button"
            variant="outline"
            style={S("align-self: flex-start")}
            onClick={() => setPages((previous) => previous + 1)}
          >
            <Trans>Load more</Trans>
          </Button>
        )}

      </CardContent>

      {adding && (
        <AddBookingPopup
          placeId={placeId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            void queryClient.invalidateQueries({ queryKey: ["bookings", placeId] })
          }}
        />
      )}

      <Dialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => {
          if (!open) {
            cancelMutation.reset()
            setCancelling(null)
            setReason("")
            setReasonIssues([])
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="grid-rows-[auto_minmax(0,1fr)] max-h-[calc(100dvh-2rem)] sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>
              <Trans>Cancel this booking?</Trans>
            </DialogTitle>
          </DialogHeader>

          <form
            id="booking-cancel-form"
            onSubmit={handleCancelSubmit}
            noValidate
            className="flex min-h-0 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1">
            {cancelling && (
              <div
                style={S(
                  "display: grid; grid-template-columns: repeat(auto-fit, minmax(104px, 1fr)); gap: 14px 18px; border: 1px solid var(--border); background: var(--muted); padding: 12px 14px; margin-bottom: 16px",
                )}
              >
                <Meta label={<Trans>Guest</Trans>} value={cancelling.guest_name} />
                <Meta label={<Trans>Stay</Trans>} value={stayLabel(cancelling)} />
                <Meta
                  label={<Trans>Total price</Trans>}
                  value={`${money.format(cancelling.total_price)} ${cancelling.currency}`}
                />
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="booking-cancel-reason">
                  <Trans>Cancellation reason</Trans>
                </FieldLabel>
                <Textarea
                  id="booking-cancel-reason"
                  rows={3}
                  maxLength={LIMITS.text}
                  placeholder={t`Example: the guest changed their plans`}
                  value={reason}
                  aria-invalid={reasonIssues.length > 0}
                  onChange={(e) => setReason(e.target.value)}
                />
                <FieldDescription>
                  <Trans>Kept in the booking record.</Trans>
                </FieldDescription>
                <FieldError errors={reasonIssues} />
              </Field>
            </FieldGroup>

            {cancelMutation.isError && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>
                  {isConflict(cancelMutation.error)
                    ? t`This booking can no longer be cancelled.`
                    : t`Could not cancel the booking. Please try again.`}
                </AlertTitle>
              </Alert>
            )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  cancelMutation.reset()
                  setCancelling(null)
                }}
              >
                <Trans>Back</Trans>
              </Button>
              <Button type="submit" form="booking-cancel-form" variant="destructive" disabled={busy}>
                {cancelMutation.isPending ? <Trans>Cancelling…</Trans> : <Trans>Confirm cancel</Trans>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmStay)}
        onOpenChange={(open) => {
          if (!open) {
            stayMutation.reset()
            setConfirmStay(null)
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="grid-rows-[auto_minmax(0,1fr)] max-h-[calc(100dvh-2rem)] sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>
              {confirmStay?.action === "check-out" ? (
                <Trans>Check this guest out?</Trans>
              ) : (
                <Trans>Check this guest in?</Trans>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1">
            {confirmStay && (
              <div
                style={S(
                  "display: grid; grid-template-columns: repeat(auto-fit, minmax(104px, 1fr)); gap: 14px 18px; border: 1px solid var(--border); background: var(--muted); padding: 12px 14px; margin-bottom: 16px",
                )}
              >
                <Meta label={<Trans>Guest</Trans>} value={confirmStay.booking.guest_name} />
                <Meta label={<Trans>Stay</Trans>} value={stayLabel(confirmStay.booking)} />
                <Meta
                  label={<Trans>Total price</Trans>}
                  value={`${money.format(confirmStay.booking.total_price)} ${confirmStay.booking.currency}`}
                />
              </div>
            )}

            {stayMutation.isError && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>
                  {stayReason(stayMutation.error) === "PLACE_OCCUPIED"
                    ? t`Another guest has not checked out yet.`
                    : stayReason(stayMutation.error) === "BEFORE_CHECK_IN_DATE"
                      ? t`Check-in has not opened for this stay yet.`
                      : isConflict(stayMutation.error)
                        ? t`This booking can no longer be moved to another state.`
                        : t`Could not change the booking. Please try again.`}
                </AlertTitle>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                stayMutation.reset()
                setConfirmStay(null)
              }}
            >
              <Trans>Back</Trans>
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                confirmStay &&
                stayMutation.mutate({
                  bookingId: confirmStay.booking.id,
                  action: confirmStay.action,
                })
              }
            >
              {stayMutation.isPending ? (
                <Trans>Saving…</Trans>
              ) : confirmStay?.action === "check-out" ? (
                <Trans>Confirm check-out</Trans>
              ) : (
                <Trans>Confirm check-in</Trans>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
