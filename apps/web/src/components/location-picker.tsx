
import { useEffect, useRef, useState } from "react"
import { TomTomConfig } from "@tomtom-org/maps-sdk/core"
import { TomTomMap } from "@tomtom-org/maps-sdk/map"
import { reverseGeocode } from "@tomtom-org/maps-sdk/services"
import { Marker } from "maplibre-gl"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { i18n } from "@lingui/core"
import { MapPin } from "lucide-react"
import "maplibre-gl/dist/maplibre-gl.css"

export interface LocationData {
  latitude: number
  longitude: number
  address: string
  city: string
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void
  initialLocation?: {
    latitude: number
    longitude: number
  }
  /** Moves the pin here (e.g. the device's location); a new object moves it again. */
  focus?: { latitude: number; longitude: number } | null
}

export default function LocationPicker({
  onLocationSelect,
  initialLocation,
  focus,
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const markerRef = useRef<Marker | null>(null)
  const moveRef = useRef<((lng: number, lat: number) => void) | null>(null)
  const callbackRef = useRef(onLocationSelect)

  const [loading, setLoading] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    callbackRef.current = onLocationSelect
  }, [onLocationSelect])

  useEffect(() => {
    if (!mapContainer.current) return

    const apiKey = import.meta.env.VITE_TOMTOM_API_KEY

    if (!apiKey) {
      setError(t`The map is not available: the TomTom key is missing.`)
      return
    }

    TomTomConfig.instance.put({
      apiKey,
      // Street and place names on the map follow the interface language.
      language: i18n.locale === "ar" ? "ar" : "en-US",
    })

    const map = new TomTomMap({
      mapLibre: {
        container: mapContainer.current,
        center: initialLocation
          ? [initialLocation.longitude, initialLocation.latitude]
          : [45, 24],
        zoom: initialLocation ? 14 : 5,
      },
    })

    // A map that fails to load (bad key, blocked network) used to show an empty box.
    // Say so, and keep the details in the console for debugging.
    let mapLoaded = false
    map.mapLibreMap.once("load", () => {
      mapLoaded = true
    })
    map.mapLibreMap.on("error", (event) => {
      console.error("TomTom map error:", event.error)
      if (!mapLoaded) setError(t`The map could not load. Check the connection and the TomTom key.`)
    })

    const marker = new Marker({ draggable: true })
    markerRef.current = marker

    let active = true

    const selectLocation = async (lng: number, lat: number) => {
      setLoading(true)
      setError("")

      marker.setLngLat([lng, lat]).addTo(map.mapLibreMap)

      try {
        const result = await reverseGeocode({
          position: [lng, lat],
        })

        if (!active) return

        const address = result.properties?.address
        const fullAddress = address?.freeformAddress || ""
        const city =
          address?.municipality ||
          address?.localName ||
          ""

        setSelectedAddress(fullAddress)

        callbackRef.current({
          latitude: lat,
          longitude: lng,
          address: fullAddress,
          city,
        })

        if (!fullAddress) {
          setError(t`No address was found for this location.`)
        }
      } catch (err) {
        if (active) {
          setError(t`Could not get the address.`)
          console.error(err)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    moveRef.current = (lng, lat) => {
      map.mapLibreMap.jumpTo({ center: [lng, lat], zoom: 15 })
      void selectLocation(lng, lat)
    }

    map.mapLibreMap.on("click", (event) => {
      void selectLocation(event.lngLat.lng, event.lngLat.lat)
    })

    marker.on("dragend", () => {
      const position = marker.getLngLat()
      void selectLocation(position.lng, position.lat)
    })

    if (initialLocation) {
      void selectLocation(
        initialLocation.longitude,
        initialLocation.latitude,
      )
    }

    return () => {
      active = false
      moveRef.current = null
      marker.remove()
      markerRef.current = null
      map.mapLibreMap.remove()
    }
  }, [])

  useEffect(() => {
    if (focus) moveRef.current?.(focus.longitude, focus.latitude)
  }, [focus])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-[200px] w-full overflow-hidden border border-dashed border-border bg-secondary">
        <div ref={mapContainer} className="absolute inset-0" />
        {/* Without a map (no key), the box says what it is for, as in the design. */}
        {!import.meta.env.VITE_TOMTOM_API_KEY && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[13px] text-muted-foreground">
            <MapPin aria-hidden="true" className="size-6" strokeWidth={1.8} />
            <span>
              <Trans>Map to pick the location</Trans>
            </span>
          </div>
        )}
      </div>

      <p className="m-0 text-[13px] text-muted-foreground">
        <Trans>Click on the map or drag the marker to choose a location.</Trans>
      </p>

      {loading && (
        <p className="m-0 text-[13px]"><Trans>Getting the address…</Trans></p>
      )}

      {selectedAddress && (
        <p className="m-0 text-[13px]">
          <span className="font-semibold"><Trans>Selected address</Trans></span>{" "}
          {selectedAddress}
        </p>
      )}

      {error && (
        <p className="m-0 text-[13px] text-destructive">{error}</p>
      )}
    </div>
  )
}
