import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { t } from "@lingui/core/macro"
import { Camera, X } from "lucide-react"
import { LocationPermission } from "@/components/location-permission"

const ASKED = "amlak.cameraAsked"

export function askedBefore(): boolean {
  try {
    return localStorage.getItem(ASKED) === "1"
  } catch {
    return false
  }
}

export function rememberAsked() {
  try {
    localStorage.setItem(ASKED, "1")
  } catch {
    // Private windows may refuse storage; the camera step shows again next time.
  }
}

/**
 * "Take a photo" and the photos taken: a dashed button that opens the
 * camera (after the design's camera permission step, the first time) and
 * square previews with a delete button each.
 */
export function PhotoPicker({
  photos,
  onChange,
  label,
  hint,
  max = 5,
  error,
}: {
  photos: File[]
  onChange: (photos: File[]) => void
  /** The button's text, e.g. "Take a photo" or "Photo after repair". */
  label: ReactNode
  hint?: ReactNode
  max?: number
  error?: ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const [asking, setAsking] = useState(false)
  const urls = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos])
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls])

  function open() {
    if (askedBefore()) input.current?.click()
    else setAsking(true)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-describedby={hint || error ? `${id}-note` : undefined}
        disabled={photos.length >= max}
        onClick={open}
        className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 border-[1.5px] border-dashed border-primary bg-primary/6 text-[15px] font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Camera aria-hidden="true" className="size-6" strokeWidth={1.8} />
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(event) => {
          const chosen = Array.from(event.target.files ?? [])
          onChange([...photos, ...chosen].slice(0, max))
          event.target.value = ""
        }}
      />
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={urls[index]} className="relative">
              <img
                src={urls[index]}
                alt={t`Photo ${index + 1}`}
                className="block aspect-square w-full border border-border bg-secondary object-cover"
              />
              <button
                type="button"
                aria-label={t`Delete photo ${index + 1}`}
                onClick={() => onChange(photos.filter((item) => item !== photo))}
                className="absolute end-1 top-1 flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
              >
                <span className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-foreground">
                  <X aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
      {error ? (
        <span id={`${id}-note`} role="alert" className="text-[13px] text-destructive">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-note`} className="text-[13px] text-muted-foreground">
          {hint}
        </span>
      ) : null}
      <LocationPermission
        kind="camera"
        open={asking}
        onClose={() => setAsking(false)}
        onAllow={() => {
          rememberAsked()
          setAsking(false)
          input.current?.click()
        }}
      />
    </div>
  )
}

/** Photos already on a ticket, as square tiles that open the full photo. */
export function PhotoTiles({ urls, label }: { urls: string[]; label: (n: number) => string }) {
  if (urls.length === 0) return null
  // Thumbnails of one size whatever the photo's shape; each opens the full photo.
  return (
    <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
      {urls.map((url, index) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noreferrer" className="am-lift block">
            <img src={url} alt={label(index + 1)} className="block size-28 border border-border bg-secondary object-cover desk:size-36" />
          </a>
        </li>
      ))}
    </ul>
  )
}

