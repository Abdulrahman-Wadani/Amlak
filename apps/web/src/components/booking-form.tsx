import { useEffect, useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CalendarDays, CircleAlert } from "lucide-react"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import {
  createBooking,
  getBooking,
  getPlaces,
  listAllBookingsForPlace,
  type Booking,
} from "@/lib/api"
import { todayIn } from "@/lib/dates"
import { ApiError, errorMessage } from "@/lib/errors"
import { LIMITS, tooLarge, tooLong } from "@/lib/limits"
import { useFormat } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormCancel, FormPopup, useFormPopup } from "@/components/form-popup"
import {
  Bullets,
  Field,
  FieldRow,
  FormButtons,
  NativeSelect,
  Panel,
  PanelTitle,
  PhoneActionBar,
  TwoColumns,
} from "@/components/panel"
import { Notice } from "@/components/states"
import { MonthBookings, isoDay, useStayText } from "@/components/booking-parts"
import { isE164, toE164 } from "@/components/worker-form"

type FieldKey =
  | "place"
  | "in"
  | "out"
  | "name"
  | "phone"
  | "email"
  | "count"
  | "price"
  | "notes"

/**
 * Add booking, shown in a popup over the list: the place and dates, the
 * guest, how many and the price; an overlap names the booking it hits.
 * `placeId` picks the place to start with (the place page's own).
 */
export function BookingForm({ placeId: startPlace }: { placeId?: string }) {
  const { accessToken } = useAuth()
  const popup = useFormPopup()
  const search = { place_id: startPlace }
  const { date, currencyName } = useFormat()
  const stay = useStayText()

  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placeId, setPlaceId] = useState(search.place_id ?? "")
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [count, setCount] = useState("")
  const [price, setPrice] = useState("")
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [conflict, setConflict] = useState<Booking | null>(null)
  const [saving, setSaving] = useState(false)
  const [month, setMonth] = useState<Booking[] | null>(null)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((list) => {
        if (!alive) return
        setPlaces(list)
        if (!search.place_id && list[0])
          setPlaceId((current) => current || list[0].id)
      })
      .catch(() => alive && setPlaces([]))
    return () => {
      alive = false
    }
  }, [accessToken, search.place_id])

  const place = places?.find((p) => p.id === placeId)
  // The month of the chosen arrival, or this month.
  const monthKey = (
    checkIn || (place ? todayIn(place.timezone) : isoDay(new Date()))
  ).slice(0, 7)

  useEffect(() => {
    if (!accessToken || !placeId) return
    let alive = true
    const [y, m] = monthKey.split("-").map(Number)
    listAllBookingsForPlace(accessToken, placeId, {
      from: `${monthKey}-01`,
      to: isoDay(new Date(y, m, 0)),
    })
      .then(
        (list) =>
          alive &&
          setMonth(
            list.sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))
          )
      )
      .catch(() => alive && setMonth([]))
    return () => {
      alive = false
    }
  }, [accessToken, placeId, monthKey])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const number = toE164(phone.trim())
    const guests = Number(count)
    const total = Number(price)
    const next: Partial<Record<FieldKey, string>> = {}
    if (!placeId) next.place = t`Choose the place.`
    if (!checkIn) next.in = t`Choose the check-in date.`
    if (!checkOut) next.out = t`Choose the check-out date.`
    else if (checkIn && checkOut <= checkIn)
      next.out = t`The check-out date must be after the check-in date.`
    if (!name.trim()) next.name = t`Enter the guest's name.`
    else next.name = tooLong(name, LIMITS.guestName)
    if (!phone.trim()) next.phone = t`Enter the mobile number.`
    else if (!isE164(number))
      next.phone = t`Enter a valid mobile number, e.g. 501234567.`
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = t`Enter a valid email address.`
    if (!Number.isInteger(guests) || guests < 1 || guests > LIMITS.guests)
      next.count = t`Enter a whole number from 1 to 100.`
    if (price.trim() === "" || !(total >= 0))
      next.price = t`Enter the total price.`
    else next.price = tooLarge(total)
    next.notes = tooLong(notes, LIMITS.longText)
    setErrors(next)
    setConflict(null)
    if (Object.values(next).some(Boolean)) return

    setSaving(true)
    setFormError("")
    try {
      await createBooking(accessToken, placeId, {
        guest_name: name.trim(),
        guest_phone: number,
        guest_email: email.trim() || undefined,
        guest_count: guests,
        check_in_date: checkIn,
        check_out_date: checkOut,
        total_price: total,
        notes: notes.trim() || undefined,
      })
      popup?.saved()
    } catch (err) {
      const other =
        err instanceof ApiError ? err.details.conflicting_booking_id : undefined
      if (
        err instanceof ApiError &&
        err.code === "CONFLICT" &&
        typeof other === "string"
      ) {
        setErrors({ in: t`Conflicts with another booking` })
        setConflict(await getBooking(accessToken, other).catch(() => null))
        if (!other) setFormError(errorMessage(err))
      } else {
        setFormError(errorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  const save = (
    <Button type="submit" form="booking-form" disabled={saving}>
      {saving ? <Trans>Saving…</Trans> : <Trans>Save booking</Trans>}
    </Button>
  )
  const invalid = (key: FieldKey, id: string) =>
    errors[key]
      ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` }
      : {}

  return (
    <TwoColumns
      main={
        <Panel pad="lg">
          <form
            id="booking-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-5"
          >
            {conflict && (
              <Notice
                tone="crit"
                icon={<CalendarDays />}
                title={
                  <Trans>
                    Conflicts with {conflict.guest_name}’s booking (
                    {stay(conflict, false)}).
                  </Trans>
                }
              >
                <Trans>
                  Pick an arrival date on or after{" "}
                  {date(conflict.check_out_date, {
                    day: "numeric",
                    month: "long",
                  })}
                  . The next stay can start on the same day as a check-out.
                </Trans>
              </Notice>
            )}
            <Field
              id="b-place"
              label={<Trans>Place</Trans>}
              error={errors.place}
            >
              <NativeSelect
                id="b-place"
                value={placeId}
                onChange={setPlaceId}
                invalid={Boolean(errors.place)}
              >
                <option value="" disabled>
                  {t`Choose the place`}
                </option>
                {places?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.place_name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-2 gap-3 desk:gap-4">
              <Field
                id="b-in"
                label={<Trans>Check-in date</Trans>}
                error={
                  errors.in && (
                    <span className="inline-flex items-center gap-1.5">
                      <CircleAlert
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                      {errors.in}
                    </span>
                  )
                }
              >
                <Input
                  id="b-in"
                  type="date"
                  dir="ltr"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  {...invalid("in", "b-in")}
                />
              </Field>
              <Field
                id="b-out"
                label={<Trans>Check-out date</Trans>}
                error={errors.out}
              >
                <Input
                  id="b-out"
                  type="date"
                  dir="ltr"
                  min={checkIn || undefined}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  {...invalid("out", "b-out")}
                />
              </Field>
            </div>
            <Field
              id="b-name"
              label={<Trans>Guest name</Trans>}
              error={errors.name}
            >
              <Input
                id="b-name"
                dir="auto"
                maxLength={LIMITS.guestName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                {...invalid("name", "b-name")}
              />
            </Field>
            <Field
              id="b-phone"
              label={<Trans>Guest phone</Trans>}
              error={errors.phone}
            >
              <div dir="ltr" className="flex gap-2">
                <span className="box-border inline-flex h-11 flex-none items-center border border-border bg-secondary px-3 text-[15px]">
                  +966
                </span>
                <Input
                  id="b-phone"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  {...invalid("phone", "b-phone")}
                />
              </div>
            </Field>
            <Field
              id="b-email"
              label={<Trans>Guest email</Trans>}
              error={errors.email}
            >
              <Input
                id="b-email"
                type="email"
                maxLength={LIMITS.email}
                dir="ltr"
                placeholder={t`Optional`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...invalid("email", "b-email")}
              />
            </Field>
            <FieldRow>
              <Field
                id="b-count"
                label={<Trans>Number of guests</Trans>}
                error={errors.count}
              >
                <Input
                  id="b-count"
                  inputMode="numeric"
                  dir="ltr"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  {...invalid("count", "b-count")}
                />
              </Field>
              <Field
                id="b-price"
                label={<Trans>Total price</Trans>}
                hint={
                  place ? (
                    <Trans>In {currencyName(place.currency)}</Trans>
                  ) : undefined
                }
                error={errors.price}
              >
                <Input
                  id="b-price"
                  inputMode="decimal"
                  dir="ltr"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  {...invalid("price", "b-price")}
                />
              </Field>
            </FieldRow>
            <Field
              id="b-notes"
              label={<Trans>Notes</Trans>}
              error={errors.notes}
            >
              <Textarea
                id="b-notes"
                rows={3}
                dir="auto"
                maxLength={LIMITS.longText}
                {...invalid("notes", "b-notes")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            {formError && (
              <p
                role="alert"
                className="m-0 flex items-center gap-1.5 text-[13px] text-destructive"
              >
                <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                {formError}
              </p>
            )}
            <div className="hidden desk:block">
              <FormButtons>
                <FormCancel to={{ to: "/bookings" }} />
                {save}
              </FormButtons>
            </div>
          </form>
          <PhoneActionBar>{save}</PhoneActionBar>
        </Panel>
      }
      side={
        <>
          {placeId && month && <MonthBookings bookings={month} />}
          <Panel>
            <PanelTitle small>
              <Trans>Before saving</Trans>
            </PanelTitle>
            <Bullets
              items={[
                <Trans key="1">
                  Two bookings at the same place cannot overlap.
                </Trans>,
                <Trans key="2">
                  The worker checks the guest in and out from the booking page.
                </Trans>,
              ]}
            />
          </Panel>
        </>
      }
    />
  )
}

/** The Add booking popup; the page renders it while open and refreshes its list on save. */
export function AddBookingPopup({
  placeId,
  onClose,
  onSaved,
}: {
  placeId?: string
  onClose: () => void
  onSaved: () => void
}) {
  return (
    <FormPopup title={<Trans>Add booking</Trans>} onClose={onClose} onSaved={onSaved}>
      <BookingForm placeId={placeId} />
    </FormPopup>
  )
}
