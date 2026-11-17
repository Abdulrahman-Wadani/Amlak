
import { useEffect, useRef, useState } from "react"
import { TomTomConfig } from "@tomtom-org/maps-sdk/core"
import { TomTomMap } from "@tomtom-org/maps-sdk/map"
import { reverseGeocode } from "@tomtom-org/maps-sdk/services"
import { Marker } from "maplibre-gl"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { i18n } from "@lingui/core"
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
}

export default function LocationPicker({
  onLocationSelect,
  initialLocation,
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const markerRef = useRef<Marker | null>(null)
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
      marker.remove()
      markerRef.current = null
      map.mapLibreMap.remove()
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={mapContainer}
        className="h-[400px] w-full overflow-hidden rounded-lg border"
      />

      <p className="text-sm text-muted-foreground">
        <Trans>Click on the map or drag the marker to choose a location.</Trans>
      </p>

      {loading && (
        <p className="text-sm"><Trans>Getting the address…</Trans></p>
      )}

      {selectedAddress && (
        <div className="rounded-md border p-3">
          <p className="text-sm font-semibold"><Trans>Selected address</Trans></p>
          <p className="text-sm">{selectedAddress}</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
