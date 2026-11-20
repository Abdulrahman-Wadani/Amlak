import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { CircleAlert } from "lucide-react"
import { ASSET_STATUSES, type Asset, type AssetStatus, type Place } from "@amlak/shared"
import { createAsset, updateAsset } from "@/lib/api"
import { todayIn } from "@/lib/dates"
import { errorMessage } from "@/lib/errors"
import { FormCancel, useFormPopup } from "@/components/form-popup"
import { LIMITS, tooLong } from "@/lib/limits"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "cn"
import { assetStatusLabel } from "@/components/asset-manage"
import { Field, FormButtons, NativeSelect, Panel, TwoColumns } from "@/components/panel"

type FieldKey = "name" | "type" | "purchase_date"

/** Add asset and Edit asset. */
export function AssetForm({ token, place, asset }: { token: string; place: Place; asset?: Asset }) {
  const navigate = useNavigate()
  const popup = useFormPopup()
  const [name, setName] = useState(asset?.name ?? "")
  const [type, setType] = useState(asset?.type ?? "")
  const [status, setStatus] = useState<AssetStatus>(asset?.status ?? "GOOD")
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchase_date ?? "")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)

  // The place's own day decides what "in the future" means.
  const today = todayIn(place.timezone)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Partial<Record<FieldKey, string>> = {}
    if (!name.trim()) next.name = t`Enter an asset name`
    else next.name = tooLong(name, LIMITS.name)
    if (!type.trim()) next.type = t`Enter a type`
    else next.type = tooLong(type, LIMITS.short)
    // Both are YYYY-MM-DD strings, which compare correctly as text.
    if (purchaseDate && purchaseDate > today) next.purchase_date = t`The purchase date cannot be in the future.`
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    setSaving(true)
    setFormError("")
    try {
      if (asset) {
        await updateAsset(token, asset.id, {
          name: name.trim(),
          type: type.trim(),
          status,
          // null clears the date.
          purchase_date: purchaseDate || null,
        })
        await navigate({ to: "/place/asset/$asset_id", params: { asset_id: asset.id } })
      } else {
        await createAsset(token, place.id, {
          name: name.trim(),
          type: type.trim(),
          status,
          purchase_date: purchaseDate || undefined,
        })
        if (popup) popup.saved()
        else await navigate({ to: "/place/$place_id", params: { place_id: place.id } })
      }
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const invalid = (key: FieldKey) =>
    errors[key] ? { "aria-invalid": true as const, "aria-describedby": `${key}-error` } : {}

  return (
    <TwoColumns
      main={
        <Panel pad="lg">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Field id="name" required label={<Trans>Asset name</Trans>} error={errors.name}>
              <Input id="name" maxLength={LIMITS.name} value={name} onChange={(e) => setName(e.target.value)} {...invalid("name")} />
            </Field>
            <Field id="type" required label={<Trans>Type</Trans>} error={errors.type}>
              <Input id="type" maxLength={LIMITS.short} value={type} onChange={(e) => setType(e.target.value)} {...invalid("type")} />
            </Field>
            <Field id="status" required label={<Trans>Status</Trans>}>
              <NativeSelect id="status" value={status} onChange={(value) => setStatus(value as AssetStatus)}>
                {ASSET_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {assetStatusLabel(value)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              id="purchase_date"
              optional
              label={<Trans>Purchase date</Trans>}
              error={
                errors.purchase_date && (
                  <span className="inline-flex items-center gap-1.5">
                    <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
                    {errors.purchase_date}
                  </span>
                )
              }
            >
              <Input
                id="purchase_date"
                type="date"
                dir="ltr"
                max={today}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                {...invalid("purchase_date")}
              />
            </Field>
            <Field id="place" label={<Trans>Place</Trans>}>
              <Input id="place" value={place.place_name} readOnly className="bg-secondary text-muted-foreground" />
            </Field>

            {formError && (
              <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                {formError}
              </p>
            )}

            <FormButtons>
              {asset ? (
                <Link
                  to="/place/asset/$asset_id"
                  params={{ asset_id: asset.id }}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <Trans>Cancel</Trans>
                </Link>
              ) : (
                <FormCancel to={{ to: "/place/$place_id", params: { place_id: place.id } }} />
              )}
              <Button type="submit" disabled={saving}>
                {saving ? <Trans>Saving…</Trans> : <Trans>Save asset</Trans>}
              </Button>
            </FormButtons>
          </form>
        </Panel>
      }
      side={null}
    />
  )
}
