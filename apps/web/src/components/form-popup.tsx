import { createContext, useContext, useRef, useState, type ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/states"
import { PopupSections } from "@/components/panel"
import { cn } from "cn"

type FormPopupControls = {
  /** Close as the user asked (Cancel): asks first if anything was entered. */
  cancel: () => void
  /** The form was saved: close without asking and let the page refresh its list. */
  saved: () => void
}

const FormPopupContext = createContext<FormPopupControls | null>(null)

/** The popup a form sits in, or null when the form is a page of its own. */
export function useFormPopup(): FormPopupControls | null {
  return useContext(FormPopupContext)
}

/**
 * An "add" form shown as a popup over the list it belongs to. Closing it (the
 * X, Escape, a click outside or Cancel) asks first if the user has typed or
 * picked anything, so nothing is lost by accident. After a save it closes and
 * `onSaved` refreshes the list; errors show inside it.
 *
 * The page renders it only while open, so each opening starts empty.
 */
export function FormPopup({
  title,
  onClose,
  onSaved,
  children,
}: {
  title: ReactNode
  onClose: () => void
  onSaved: () => void
  children: ReactNode
}) {
  // A ref, not state: it is read only on close, and re-rendering the popup on
  // the first keystroke would drop that keystroke from the form.
  const dirty = useRef(false)
  const [askingDiscard, setAskingDiscard] = useState(false)

  const cancel = () => {
    if (dirty.current) setAskingDiscard(true)
    else onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) cancel()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* Any change inside the form (typing, picking, choosing a file) marks it as dirty. */}
        <div
          onChangeCapture={() => {
            dirty.current = true
          }}
          onInputCapture={() => {
            dirty.current = true
          }}
          className="min-w-0"
        >
          <FormPopupContext.Provider value={{ cancel, saved: onSaved }}>
            <PopupSections>{children}</PopupSections>
          </FormPopupContext.Provider>
        </div>
        {askingDiscard && (
          <ConfirmDialog
            open
            title={<Trans>Discard what you entered?</Trans>}
            text={<Trans>The details you typed will be lost.</Trans>}
            confirm={<Trans>Discard</Trans>}
            onConfirm={onClose}
            onClose={() => setAskingDiscard(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** A form's Cancel: closes the popup it sits in, or goes back to `to` on a page of its own. */
export function FormCancel({ to }: { to: LinkProps }) {
  const popup = useFormPopup()
  if (popup) {
    return (
      <Button type="button" variant="outline" onClick={popup.cancel}>
        <Trans>Cancel</Trans>
      </Button>
    )
  }
  return (
    <Link {...to} className={cn(buttonVariants({ variant: "outline" }))}>
      <Trans>Cancel</Trans>
    </Link>
  )
}
