import { useEffect, useState } from "react"
import { Check } from "lucide-react"

const EVENT = "amlak:toast"

/** Shows the design's brief confirmation ("Ticket approved and sent to Salem.") for a few seconds. */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }))
}

/** Where the confirmations appear: bottom centre, above the phone tabs. Mounted once, in the shell. */
export function Toasts() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const show = (event: Event) => {
      setMessage((event as CustomEvent<string>).detail)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(null), 4000)
    }
    window.addEventListener(EVENT, show)
    return () => {
      window.removeEventListener(EVENT, show)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 flex justify-center desk:bottom-6"
    >
      {message && (
        <div className="am-rise pointer-events-auto flex w-full max-w-[360px] items-center gap-3 bg-foreground px-4 py-3.5 text-[15px] text-white shadow-md">
          <Check aria-hidden="true" className="size-4 flex-none text-good-50" strokeWidth={2} />
          <span className="flex-1">{message}</span>
        </div>
      )}
    </div>
  )
}
