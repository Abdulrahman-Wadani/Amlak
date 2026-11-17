import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { CircleAlert } from "lucide-react"
import type { Place } from "@amlak/shared"
import { storedUser, useAuth } from "@/lib/auth"
import { getPlaces, listAllBookingsForPlace, type Booking } from "@/lib/api"
import { groupBookings, UPCOMING_DAYS, type BookingGroups } from "@/lib/bookings"
import { addDays, todayIn } from "@/lib/dates"
import { S } from "@/lib/dom-style"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { BookingStatusChip } from "@/components/place-shared"
import "@/styles/motion.css"

export const Route = createFileRoute("/_authenticated/bookings")({
  // Bookings belong to places; Admins have none (the API refuses them).
  beforeLoad: () => {
    if (storedUser()?.role === "ADMIN") {
      throw redirect({ to: "/admin" })
    }
  },
  component: BookingsPage,
})

const ALL_PLACES = "ALL"
// Requests sent at once when loading every place.
const PARALLEL = 4

type PlaceBookings = {
  place: Place
  today: string
  groups: BookingGroups | null
  failed: boolean
}

/** Runs `task` for each item, at most `limit` at a time. */
async function eachLimited<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++]
      await task(item)
    }
  })
  await Promise.all(workers)
}

function BookingsPage() {
  const { accessToken } = useAuth()
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placesError, setPlacesError] = useState(false)
  const [selected, setSelected] = useState(ALL_PLACES)
  const [byPlace, setByPlace] = useState<Record<string, PlaceBookings>>({})
  // Places already requested, so a place is loaded once even while the
  // list re-renders with each result.
  const requested = useRef(new Set<string>())

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((list) => alive && setPlaces(list))
      .catch(() => alive && setPlacesError(true))
    return () => {
      alive = false
    }
  }, [accessToken])

  const shown = useMemo(
    () => (places ?? []).filter((p) => selected === ALL_PLACES || p.id === selected),
    [places, selected],
  )

  // There is no endpoint for every place's bookings, so each shown place is
  // loaded on its own. A guest leaving today is outside a window that starts
  // today, so the window starts yesterday in the place's time zone.
  useEffect(() => {
    if (!accessToken) return
    const missing = shown.filter((p) => !requested.current.has(p.id))
    if (missing.length === 0) return
    for (const place of missing) requested.current.add(place.id)
    void eachLimited(missing, PARALLEL, async (place) => {
      const today = todayIn(place.timezone)
      const lastDay = addDays(today, UPCOMING_DAYS)
      let entry: PlaceBookings
      try {
        const bookings = await listAllBookingsForPlace(accessToken, place.id, {
          from: addDays(today, -1),
          to: lastDay,
        })
        entry = { place, today, groups: groupBookings(bookings, today, lastDay), failed: false }
      } catch {
        entry = { place, today, groups: null, failed: true }
      }
      setByPlace((prev) => ({ ...prev, [place.id]: entry }))
    })
  }, [accessToken, shown])

  const loaded = shown.map((p) => byPlace[p.id]).filter(Boolean)
  const loading = places === null || loaded.length < shown.length
  const failedPlaces = loaded.filter((entry) => entry.failed)
  const rows = (key: keyof BookingGroups) =>
    loaded.flatMap((entry) => (entry.groups ? entry.groups[key].map((booking) => ({ booking, place: entry.place })) : []))

  return (
    <div
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 1000px",
      )}
    >
      <div style={S("display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px")}>
        <div style={S("display: flex; flex-direction: column; gap: 6px")}>
          <h1 style={S("font-size: 30px; font-weight: 800; margin: 0")}>
            <Trans>Bookings</Trans>
          </h1>
          <p style={S("margin: 0; color: var(--muted-foreground)")}>
            <Trans>Today's arrivals and departures, and stays starting in the next {UPCOMING_DAYS} days.</Trans>
          </p>
        </div>

        <div style={S("display: flex; flex-direction: column; gap: 6px; min-width: 220px")}>
          <Label htmlFor="booking-place">
            <Trans>Place</Trans>
          </Label>
          <select
            id="booking-place"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={!places || places.length === 0}
            style={S(
              "height: 40px; padding: 0 10px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font: inherit",
            )}
          >
            <option value={ALL_PLACES}>{t`All places`}</option>
            {places?.map((place) => (
              <option key={place.id} value={place.id}>
                {place.place_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {placesError && (
        <ErrorLine>
          <Trans>We could not load your places.</Trans>
        </ErrorLine>
      )}

      {failedPlaces.length > 0 && (
        <ErrorLine>
          <Trans>We could not load the bookings for:</Trans>{" "}
          {failedPlaces.map((entry) => entry.place.place_name).join(", ")}
        </ErrorLine>
      )}

      {places?.length === 0 && (
        <p style={S("margin: 0; color: var(--muted-foreground)")}>
          <Trans>You have no places yet.</Trans>
        </p>
      )}

      {(places?.length ?? 1) > 0 && (
        <>
          <BookingSection
            title={<Trans>Check-ins today</Trans>}
            empty={<Trans>No guests arrive today.</Trans>}
            loading={loading}
            rows={rows("checkIns")}
          />
          <BookingSection
            title={<Trans>Check-outs today</Trans>}
            empty={<Trans>No guests leave today.</Trans>}
            loading={loading}
            rows={rows("checkOuts")}
          />
          <BookingSection
            title={<Trans>Upcoming</Trans>}
            empty={<Trans>No stays start in the next {UPCOMING_DAYS} days.</Trans>}
            loading={loading}
            rows={rows("upcoming")}
          />
        </>
      )}
    </div>
  )
}

function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
      <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function BookingSection({
  title,
  empty,
  loading,
  rows,
}: {
  title: ReactNode
  empty: ReactNode
  loading: boolean
  rows: { booking: Booking; place: Place }[]
}) {
  const { i18n } = useLingui()
  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.locale === "ar" ? "ar" : "en", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    [i18n.locale],
  )
  const day = (date: string) => dateFormat.format(new Date(date))

  return (
    <section style={S("display: flex; flex-direction: column; gap: 10px")}>
      <h2 style={S("font-size: 18px; font-weight: 750; margin: 0")}>
        {title} {!loading && <span style={S("color: var(--muted-foreground); font-weight: 500")}>({rows.length})</span>}
      </h2>

      {loading && rows.length === 0 ? (
        <Skeleton style={S("height: 64px")} />
      ) : rows.length === 0 ? (
        <p style={S("margin: 0; color: var(--muted-foreground); font-size: 14px")}>{empty}</p>
      ) : (
        <ul style={S("list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px")}>
          {rows.map(({ booking, place }) => (
            <li key={booking.id}>
              <Link
                to="/place/$place_id"
                params={{ place_id: place.id }}
                className="am-lift"
                style={S(
                  "display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; text-decoration: none; color: inherit; background: var(--card); border: 1px solid var(--border)",
                )}
              >
                <span style={S("display: flex; flex-direction: column; gap: 3px; min-width: 0")}>
                  <span style={S("font-weight: 700")}>{booking.guest_name}</span>
                  <span style={S("font-size: 13px; color: var(--muted-foreground)")}>
                    {place.place_name}
                    {" · "}
                    <span dir="auto">
                      {day(booking.check_in_date)} – {day(booking.check_out_date)}
                    </span>
                    {" · "}
                    <Trans>{booking.guest_count} guests</Trans>
                  </span>
                </span>
                <BookingStatusChip status={booking.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
