import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Plus } from "lucide-react"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getPlaces, listAllBookingsForPlace, type Booking } from "@/lib/api"
import { todayIn } from "@/lib/dates"
import { Button } from "@/components/ui/button"
import { Page } from "@/components/page"
import { AddBookingPopup } from "@/components/booking-form"
import { Field, NativeSelect, Panel, TwoColumns } from "@/components/panel"
import { EmptyState, LoadError, LoadingList } from "@/components/states"
import { MonthBookings, MonthCalendar, isoDay } from "@/components/booking-parts"

export const Route = createFileRoute("/_authenticated/bookings")({
  component: BookingsPage,
})

/** A place's bookings, a month at a time: the calendar and the month's list. */
function BookingsPage() {
  const { accessToken, user } = useAuth()
  const isManager = user?.role === "MANAGER"
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placeId, setPlaceId] = useState("")
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((list) => {
        if (!alive) return
        setPlaces(list)
        if (list[0]) setPlaceId((current) => current || list[0].id)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !placeId) return
    let alive = true
    setBookings(null)
    setFailed(false)
    const from = isoDay(month)
    const to = isoDay(new Date(month.getFullYear(), month.getMonth() + 1, 0))
    listAllBookingsForPlace(accessToken, placeId, { from, to })
      .then((list) => alive && setBookings(list.sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, placeId, month, reload])

  const place = places?.find((p) => p.id === placeId)
  const [adding, setAdding] = useState(false)

  return (
    <Page
      title={<Trans>Bookings</Trans>}
      phoneActions={false}
      phoneEnd={placeId ? { label: t`Add booking`, icon: "plus", onClick: () => setAdding(true) } : "bell"}
      actions={
        placeId && (
          <Button type="button" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            <Trans>Add booking</Trans>
          </Button>
        )
      }
    >
      {adding && (
        <AddBookingPopup
          placeId={placeId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            setReload((n) => n + 1)
          }}
        />
      )}
      {places !== null && places.length === 0 ? (
        <EmptyState
          title={<Trans>No places yet</Trans>}
          text={
            isManager ? (
              <Trans>Add a place first; its bookings show here.</Trans>
            ) : (
              <Trans>Places your manager assigns you to show here.</Trans>
            )
          }
        />
      ) : (
        // One card holds the place, the calendar and the month's bookings.
        <Panel className="gap-5" holdsSections>
          <div className="w-full desk:max-w-[320px]">
            <Field id="booking-place" label={<Trans>Place</Trans>}>
              <NativeSelect id="booking-place" value={placeId} onChange={setPlaceId} disabled={!places}>
                {places?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.place_name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          {failed ? (
            <LoadError title={<Trans>Could not load bookings</Trans>} onRetry={() => setReload((n) => n + 1)} />
          ) : bookings === null || !place ? (
            <LoadingList />
          ) : (
            <TwoColumns
              main={
                <MonthCalendar month={month} bookings={bookings} today={todayIn(place.timezone)} onMonth={setMonth} />
              }
              side={<MonthBookings bookings={bookings} />}
            />
          )}
        </Panel>
      )}
    </Page>
  )
}
