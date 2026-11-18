import { Trans } from "@lingui/react/macro"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

/**
 * Asked before the browser's own location prompt (the design's "Location
 * permission" screen, shown over the form): why the location is needed and
 * that it is not kept.
 */
export function LocationPermission({
  open,
  onAllow,
  onClose,
}: {
  open: boolean
  onAllow: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="box-border flex max-w-[calc(100%-2rem)] flex-col gap-4 rounded-none border border-border bg-card p-5 shadow-sm ring-0 sm:max-w-[520px] desk:p-8"
      >
        <div className="flex flex-col items-center gap-4 px-2 py-6 text-center">
          <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-secondary text-primary">
            <MapPin className="size-9" strokeWidth={1.6} />
          </span>
          <DialogTitle className="m-0 text-2xl leading-[1.4] font-bold">
            <Trans>We need your location to place the property</Trans>
          </DialogTitle>
          <DialogDescription className="m-0 max-w-[26em] text-[15px] leading-[1.8] text-muted-foreground">
            <Trans>
              We use your location once to drop the place’s pin on the map. We do not track your location or keep it
              afterwards.
            </Trans>
          </DialogDescription>
          <span className="text-[13px] text-muted-foreground">
            <Trans>
              The browser asks for permission after you tap the button. You can change it later in the browser settings.
            </Trans>
          </span>
        </div>
        <div className="flex gap-2.5">
          <Button type="button" variant="outline" className="h-13 flex-1" onClick={onClose}>
            <Trans>Not now</Trans>
          </Button>
          <Button type="button" className="h-13 flex-[2]" onClick={onAllow}>
            <Trans>Allow location</Trans>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
