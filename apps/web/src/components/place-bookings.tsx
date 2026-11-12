import { useMemo, useState } from "react"
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Trans, useLingui } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CalendarDays, CircleAlert, Plus, Save } from "lucide-react"
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
import { Input } from "@/components/ui/input"
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
  createBooking,
  getBookingsForPlace,
  updateBooking,
  type Booking,
  type BookingWindow,
} from "@/lib/api"
import { bookingInput, type BookingInput } from "@/lib/validators"
import { useAuth } from "@/lib/auth"
import { S } from "@/lib/dom-style"

type Issue = { path: (string | number)[]; message?: string }

type FieldName = keyof BookingInput

const ALL_WINDOW: BookingWindow = { from: "2000-01-01", to: "2099-12-31" }
const PAGE_SIZE = 100

const EMPTY_FORM = {
  guest_name: "",
  guest_phone: "",
  guest_email: "",
  guest_count: "1",
  check_in_date: "",
  check_out_date: "",
  total_price: "",
  notes: "",
}

function validationMessage(name: FieldName) {
  switch (name) {
    case "guest_name":
      return t`Enter the guest name`
    case "guest_phone":
      return t`Use the international phone format`
    case "guest_email":
      return t`Enter a valid email address`
    case "guest_count":
      return t`Enter the number of guests`
    case "check_in_date":
      return t`Choose the check-in date`
    case "check_out_date":
      return t`Choose a check-out date after the check-in date`
    case "total_price":
      return t`Enter the total price`
    case "notes":
      return t`Notes are too long`
  }
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formFor(booking: Booking | null) {
  if (!booking) return { ...EMPTY_FORM }
  return {
    guest_name: booking.guest_name,
    guest_phone: booking.guest_phone,
    guest_email: booking.guest_email ?? "",
    guest_count: String(booking.guest_count),
    check_in_date: booking.check_in_date,
    check_out_date: booking.check_out_date,
    total_price: String(booking.total_price),
    notes: booking.notes ?? "",
  }
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
  const { i18n } = useLingui()
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [scope, setScope] = useState("all")
  const [pages, setPages] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Booking | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [issues, setIssues] = useState<Issue[]>([])
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

  const saveMutation = useMutation({
    mutationFn: (input: BookingInput) =>
      editing
        ? updateBooking(accessToken ?? "", editing.id, input)
        : createBooking(accessToken ?? "", placeId, input),
    onSuccess: () => {
      setFormOpen(false)
      setEditing(null)
      setIssues([])
      setForm({ ...EMPTY_FORM })
      return queryClient.invalidateQueries({ queryKey: ["bookings", placeId] })
    },
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
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" })
  const dayName = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric" })
  const money = new Intl.NumberFormat(locale)

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

  const busy = saveMutation.isPending || cancelMutation.isPending || stayMutation.isPending
  const canLoadMore = Boolean(bookings && bookings.length >= pages * PAGE_SIZE)

  function openAdd() {
    saveMutation.reset()
    setEditing(null)
    setIssues([])
    setForm({ ...EMPTY_FORM })
    setFormOpen(true)
  }

  function openEdit(booking: Booking) {
    saveMutation.reset()
    setEditing(booking)
    setIssues([])
    setForm(formFor(booking))
    setFormOpen(true)
  }

  function openCancel(booking: Booking) {
    cancelMutation.reset()
    setReason("")
    setReasonIssues([])
    setCancelling(booking)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = bookingInput.safeParse({
      guest_name: form.guest_name.trim(),
      guest_phone: form.guest_phone.trim(),
      ...(form.guest_email.trim() ? { guest_email: form.guest_email.trim() } : {}),
      guest_count: form.guest_count,
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      total_price: form.total_price,
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    })
    if (!parsed.success) {
      setIssues(parsed.error.issues as Issue[])
      return
    }
    setIssues([])
    saveMutation.mutate(parsed.data)
  }

  function handleCancelSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reason.trim().length < 1) {
      setReasonIssues([{ path: ["reason"], message: t`Enter the reason for the cancellation` }])
      return
    }
    setReasonIssues([])
    cancelMutation.mutate({ bookingId: cancelling?.id ?? "", reason: reason.trim() })
  }

  function fieldIssues(name: FieldName) {
    return issues
      .filter((issue) => issue.path[0] === name)
      .map(() => ({ message: validationMessage(name) }))
  }

  const stayLabel = (booking: Booking) => {
    const from = new Date(`${booking.check_in_date}T00:00:00`)
    const to = new Date(`${booking.check_out_date}T00:00:00`)
    const day = new Intl.DateTimeFormat(locale, { day: "numeric" })
    const month = new Intl.DateTimeFormat(locale, { month: "long" })
    const sameMonth =
      from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()
    return sameMonth
      ? `${day.format(from)} – ${day.format(to)} ${month.format(to)}`
      : `${day.format(from)} ${month.format(from)} – ${day.format(to)} ${month.format(to)}`
  }

  return (
    <Card
      className="am-lift"
      style={S("padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0")}
    >
      <CardHeader
        style={S(
          "padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap",
        )}
      >
        <CardTitle style={S("font-size: 17px; font-weight: 750")}>
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
            style={S("height: 40px; min-width: 190px")}
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
      </CardHeader>

      <CardContent style={S("padding: 20px; display: flex; flex-direction: column; gap: 18px")}>
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
                        onClick={() => openEdit(booking)}
                      >
                        <Trans>Edit</Trans>
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

        <div style={S("display: flex; gap: 10px")}>
          <Button type="button" onClick={openAdd}>
            <Plus size={16} />
            <Trans>Add booking</Trans>
          </Button>
        </div>
      </CardContent>

      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent showCloseButton={false} className="grid-rows-[auto_minmax(0,1fr)] max-h-[calc(100dvh-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? <Trans>Edit booking</Trans> : <Trans>Add booking</Trans>}
            </DialogTitle>
          </DialogHeader>

          <form id="booking-form" onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-1">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="booking-guest-name">
                  <Trans>Guest name</Trans>
                </FieldLabel>
                <Input
                  id="booking-guest-name"
                  value={form.guest_name}
                  aria-invalid={fieldIssues("guest_name").length > 0}
                  onChange={(e) => setForm((p) => ({ ...p, guest_name: e.target.value }))}
                />
                <FieldError errors={fieldIssues("guest_name")} />
              </Field>

              <Field>
                <FieldLabel htmlFor="booking-guest-phone">
                  <Trans>Guest phone</Trans>
                </FieldLabel>
                <Input
                  id="booking-guest-phone"
                  type="tel"
                  placeholder="+966512345678"
                  value={form.guest_phone}
                  aria-invalid={fieldIssues("guest_phone").length > 0}
                  onChange={(e) => setForm((p) => ({ ...p, guest_phone: e.target.value }))}
                />
                <FieldDescription>
                  <Trans>Use the international format, e.g. +966512345678</Trans>
                </FieldDescription>
                <FieldError errors={fieldIssues("guest_phone")} />
              </Field>

              <Field>
                <FieldLabel htmlFor="booking-guest-email">
                  <Trans>Guest email</Trans>
                </FieldLabel>
                <Input
                  id="booking-guest-email"
                  type="email"
                  value={form.guest_email}
                  aria-invalid={fieldIssues("guest_email").length > 0}
                  onChange={(e) => setForm((p) => ({ ...p, guest_email: e.target.value }))}
                />
                <FieldError errors={fieldIssues("guest_email")} />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="booking-check-in">
                    <Trans>Check-in</Trans>
                  </FieldLabel>
                  <Input
                    id="booking-check-in"
                    type="date"
                    value={form.check_in_date}
                    aria-invalid={fieldIssues("check_in_date").length > 0}
                    onChange={(e) => setForm((p) => ({ ...p, check_in_date: e.target.value }))}
                  />
                  <FieldError errors={fieldIssues("check_in_date")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="booking-check-out">
                    <Trans>Check-out</Trans>
                  </FieldLabel>
                  <Input
                    id="booking-check-out"
                    type="date"
                    value={form.check_out_date}
                    aria-invalid={fieldIssues("check_out_date").length > 0}
                    onChange={(e) => setForm((p) => ({ ...p, check_out_date: e.target.value }))}
                  />
                  <FieldError errors={fieldIssues("check_out_date")} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="booking-guest-count">
                    <Trans>Guests</Trans>
                  </FieldLabel>
                  <Input
                    id="booking-guest-count"
                    type="number"
                    step="any"
                    value={form.guest_count}
                    aria-invalid={fieldIssues("guest_count").length > 0}
                    onChange={(e) => setForm((p) => ({ ...p, guest_count: e.target.value }))}
                  />
                  <FieldError errors={fieldIssues("guest_count")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="booking-total-price">
                    <Trans>Total price</Trans>
                  </FieldLabel>
                  <Input
                    id="booking-total-price"
                    type="number"
                    step="any"
                    value={form.total_price}
                    aria-invalid={fieldIssues("total_price").length > 0}
                    onChange={(e) => setForm((p) => ({ ...p, total_price: e.target.value }))}
                  />
                  <FieldError errors={fieldIssues("total_price")} />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="booking-notes">
                  <Trans>Notes</Trans>
                </FieldLabel>
                <Textarea
                  id="booking-notes"
                  rows={3}
                  value={form.notes}
                  aria-invalid={fieldIssues("notes").length > 0}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
                <FieldError errors={fieldIssues("notes")} />
              </Field>
            </FieldGroup>

            {saveMutation.isError && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>
                  {isConflict(saveMutation.error)
                    ? t`Those dates are already booked for this property.`
                    : editing
                      ? t`Could not update the booking. Please try again.`
                      : t`Could not save the booking. Please try again.`}
                </AlertTitle>
              </Alert>
            )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setFormOpen(false)}>
                <Trans>Back</Trans>
              </Button>
              <Button type="submit" form="booking-form" disabled={busy}>
                <Save size={16} />
                {saveMutation.isPending ? (
                  <Trans>Saving…</Trans>
                ) : editing ? (
                  <Trans>Save changes</Trans>
                ) : (
                  <Trans>Add booking</Trans>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <div className="min-h-0 flex-1 overflow-y-auto px-1">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-1">
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
