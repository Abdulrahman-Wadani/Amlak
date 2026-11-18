import { useState } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import type { Asset, AssetStatus } from "@amlak/shared"
import { deleteAsset } from "@/lib/api"
import { ApiError, errorMessage } from "@/lib/errors"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/states"

/** An asset status as text (for select options). */
export function assetStatusLabel(status: AssetStatus): string {
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

/**
 * Remove asset, with its confirmation. Managers only: the API refuses
 * DELETE /assets/{assetId} to everyone else. Editing is the asset form
 * (/place/asset/edit/{assetId}).
 */
export function AssetRemove({
  token,
  asset,
  onDeleted,
}: {
  token: string
  asset: Asset
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    setBusy(true)
    setError("")
    try {
      await deleteAsset(token, asset.id)
      setDeleting(false)
      onDeleted()
    } catch (err) {
      setError(
        err instanceof ApiError && Array.isArray(err.details.ticket_ids)
          ? t`This asset has open maintenance tickets. Complete or reject them first.`
          : errorMessage(err),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          setError("")
          setDeleting(true)
        }}
      >
        <Trans>Remove asset</Trans>
      </Button>

      <ConfirmDialog
        open={deleting}
        title={<Trans>Remove “{asset.name}”?</Trans>}
        text={
          <Trans>
            Its maintenance schedules stop, and its past tickets stay in the records. An asset with open tickets cannot be deleted.
          </Trans>
        }
        confirm={busy ? <Trans>Deleting…</Trans> : <Trans>Remove asset</Trans>}
        busy={busy}
        error={error}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleting(false)}
      />
    </>
  )
}
