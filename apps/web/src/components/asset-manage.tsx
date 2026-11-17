import { useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert, PencilLine, Trash2 } from "lucide-react"
import { ASSET_STATUSES, type Asset, type AssetStatus } from "@amlak/shared"
import { deleteAsset, updateAsset } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function statusLabel(status: AssetStatus): string {
  switch (status) {
    case "GOOD":
      return t`Good`
    case "NEEDS_MAINTENANCE":
      return t`Needs maintenance`
    case "UNDER_MAINTENANCE":
      return t`Under maintenance`
    case "OUT_OF_SERVICE":
      return t`Out of service`
  }
}

/** Why an asset edit is refused before sending it, or null when it is fine. */
export function assetEditProblem(
  values: { name: string; type: string; purchase_date: string },
  today: string,
): string | null {
  if (!values.name.trim()) return t`Enter an asset name`
  if (!values.type.trim()) return t`Enter a type`
  // Both are YYYY-MM-DD strings, which compare correctly as text.
  if (values.purchase_date && values.purchase_date > today) {
    return t`The purchase date cannot be in the future.`
  }
  return null
}

const fieldStyle = S(
  "height: 40px; padding: 0 10px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font: inherit",
)

/**
 * Edit and delete buttons for an asset, with their dialogs. Managers only:
 * the API refuses PUT and DELETE /assets/{assetId} to everyone else.
 */
export function AssetManage({
  token,
  asset,
  today,
  onUpdated,
  onDeleted,
}: {
  token: string
  asset: Asset
  today: string
  onUpdated: (asset: Asset) => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState(asset.name)
  const [type, setType] = useState(asset.type)
  const [status, setStatus] = useState<AssetStatus>(asset.status)
  const [purchaseDate, setPurchaseDate] = useState(asset.purchase_date ?? "")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  function openEdit() {
    setName(asset.name)
    setType(asset.type)
    setStatus(asset.status)
    setPurchaseDate(asset.purchase_date ?? "")
    setError("")
    setEditing(true)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = assetEditProblem(
      { name, type, purchase_date: purchaseDate },
      today,
    )
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError("")
    try {
      const updated = await updateAsset(token, asset.id, {
        name: name.trim(),
        type: type.trim(),
        status,
        // null clears the date.
        purchase_date: purchaseDate || null,
      })
      onUpdated(updated)
      setEditing(false)
    } catch {
      setError(t`Could not save the asset.`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setError("")
    try {
      await deleteAsset(token, asset.id)
      setDeleting(false)
      onDeleted()
    } catch (err) {
      setError(
        err instanceof Error && /open maintenance tickets/i.test(err.message)
          ? t`This asset has open maintenance tickets. Complete or reject them first.`
          : t`Could not delete the asset.`,
      )
    } finally {
      setBusy(false)
    }
  }

  const alert = error && (
    <p role="alert" className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
      <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      {error}
    </p>
  )

  return (
    <div style={S("display: flex; gap: 10px; flex-wrap: wrap")}>
      <Button type="button" variant="outline" onClick={openEdit}>
        <PencilLine size={16} />
        <Trans>Edit asset</Trans>
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setError("")
          setDeleting(true)
        }}
        style={S("color: var(--destructive); border-color: var(--destructive)")}
      >
        <Trash2 size={16} />
        <Trans>Delete asset</Trans>
      </Button>

      <Dialog open={editing} onOpenChange={(open) => !open && !busy && setEditing(false)}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Trans>Edit asset</Trans>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} noValidate style={S("display: flex; flex-direction: column; gap: 14px")}>
            <div style={S("display: flex; flex-direction: column; gap: 6px")}>
              <Label htmlFor="asset-edit-name">
                <Trans>Asset name</Trans>
              </Label>
              <Input id="asset-edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={S("display: flex; flex-direction: column; gap: 6px")}>
              <Label htmlFor="asset-edit-type">
                <Trans>Type</Trans>
              </Label>
              <Input id="asset-edit-type" value={type} onChange={(e) => setType(e.target.value)} />
            </div>
            <div style={S("display: flex; flex-direction: column; gap: 6px")}>
              <Label htmlFor="asset-edit-status">
                <Trans>Status</Trans>
              </Label>
              <select
                id="asset-edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as AssetStatus)}
                style={fieldStyle}
              >
                {ASSET_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div style={S("display: flex; flex-direction: column; gap: 6px")}>
              <Label htmlFor="asset-edit-date">
                <Trans>Purchase date</Trans>
              </Label>
              <Input
                id="asset-edit-date"
                type="date"
                max={today}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            {alert}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)}>
                <Trans>Back</Trans>
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Trans>Saving…</Trans> : <Trans>Save</Trans>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={(open) => !open && !busy && setDeleting(false)}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Trans>Delete this asset?</Trans>
            </DialogTitle>
          </DialogHeader>
          <p style={S("margin: 0; font-size: 14px")}>
            <Trans>
              Its maintenance schedules stop, and its past tickets stay in the records. An asset with open tickets cannot be deleted.
            </Trans>
          </p>
          {alert}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setDeleting(false)}>
              <Trans>Back</Trans>
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void handleDelete()}>
              {busy ? <Trans>Deleting…</Trans> : <Trans>Delete asset</Trans>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
