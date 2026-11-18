import { useState, type ReactNode } from "react"
import { useNavigate, type LinkProps } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/states"

/**
 * An "add" form shown as a popup over the list it belongs to. Closing it
 * (the X, Escape, or a click outside) goes to `back`, the list page. If the
 * user has typed or picked anything, closing asks first, so nothing is lost
 * by accident.
 */
export function FormPopup({
  title,
  back,
  children,
}: {
  title: ReactNode
  back: LinkProps
  children: ReactNode
}) {
  const navigate = useNavigate()
  const [dirty, setDirty] = useState(false)
  const [askingDiscard, setAskingDiscard] = useState(false)

  const leave = () => void navigate(back as Parameters<typeof navigate>[0])

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (open) return
        if (dirty) setAskingDiscard(true)
        else leave()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* Any change inside the form (typing, picking, choosing a file) marks it as dirty. */}
        <div onChangeCapture={() => setDirty(true)} onInputCapture={() => setDirty(true)}>
          {children}
        </div>
        {askingDiscard && (
          <ConfirmDialog
            open
            title={<Trans>Discard what you entered?</Trans>}
            text={<Trans>The details you typed will be lost.</Trans>}
            confirm={<Trans>Discard</Trans>}
            onConfirm={leave}
            onClose={() => setAskingDiscard(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
