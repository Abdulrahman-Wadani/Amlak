import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Camera, Check, CircleAlert, Image as ImageIcon } from "lucide-react"
import type { Expense, ExpenseCategory, Place } from "@amlak/shared"
import { createExpense, getPlaces, updateExpense } from "@/lib/api"
import { todayIn } from "@/lib/dates"
import { errorMessage } from "@/lib/errors"
import { FormCancel, useFormPopup } from "@/components/form-popup"
import { LIMITS, tooLarge, tooLong } from "@/lib/limits"
import { useFormat } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldNeed, FieldRow, FormButtons, NativeSelect, Panel, PhoneActionBar, TwoColumns } from "@/components/panel"
import { LocationPermission } from "@/components/location-permission"
import { askedBefore, rememberAsked } from "@/components/photo-picker"
import { CATEGORIES, categoryLabel } from "@/components/finance-parts"

type FieldKey = "place" | "amount" | "date" | "description"

/** Add expense and Edit expense. */
export function ExpenseForm({ token, expense }: { token: string; expense?: Expense }) {
  const navigate = useNavigate()
  const popup = useFormPopup()
  const { currencyName } = useFormat()
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placeId, setPlaceId] = useState(expense?.place_id ?? "")
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "MAINTENANCE")
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "")
  const [day, setDay] = useState(expense?.expense_date ?? "")
  const [description, setDescription] = useState(expense?.description ?? "")
  const [receipt, setReceipt] = useState<File | null>(null)
  const [asking, setAsking] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => (receipt ? URL.createObjectURL(receipt) : (expense?.receipt_url ?? null)), [receipt, expense])
  useEffect(() => () => {
    if (receipt && preview) URL.revokeObjectURL(preview)
  }, [receipt, preview])

  useEffect(() => {
    getPlaces(token)
      .then((list) => {
        setPlaces(list)
        if (!expense && list[0]) setPlaceId((current) => current || list[0].id)
      })
      .catch(() => setPlaces([]))
  }, [token, expense])

  const place = places?.find((p) => p.id === placeId)
  useEffect(() => {
    if (place && !day) setDay(todayIn(place.timezone))
  }, [place, day])

  function photograph() {
    if (askedBefore()) input.current?.click()
    else setAsking(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Partial<Record<FieldKey, string>> = {}
    if (!placeId) next.place = t`Choose the place.`
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || Number(amount) <= 0) next.amount = t`Enter the amount, like 640 or 640.50.`
    else next.amount = tooLarge(amount)
    if (!day) next.date = t`Choose the date.`
    next.description = tooLong(description, LIMITS.longText)
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setSaving(true)
    setFormError("")
    try {
      const fields = {
        category,
        amount: Number(amount.trim()),
        expense_date: day,
        description: description.trim() || undefined,
        receipt,
      }
      if (expense) await updateExpense(token, expense.id, { ...fields, description: description.trim() })
      else await createExpense(token, placeId, fields)
      if (popup) popup.saved()
      else await navigate({ to: "/expenses" })
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const save = (
    <Button type="submit" form="expense-form" disabled={saving}>
      {saving ? <Trans>Saving…</Trans> : <Trans>Save expense</Trans>}
    </Button>
  )

  return (
    <TwoColumns
      main={
        <Panel pad="lg">
          <form id="expense-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Field id="e-place" required label={<Trans>Place</Trans>} error={errors.place}>
              <NativeSelect id="e-place" value={placeId} onChange={setPlaceId} disabled={Boolean(expense)} invalid={Boolean(errors.place)}>
                <option value="" disabled>
                  {t`Choose the place`}
                </option>
                {places?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.place_name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="flex flex-col gap-2">
              <span id="e-category" className="text-sm font-semibold">
                <Trans>Category</Trans><FieldNeed required />
              </span>
              <div role="group" aria-labelledby="e-category" className="grid grid-cols-2 gap-2 desk:grid-cols-3">
                {CATEGORIES.map((item) => {
                  const on = item === category
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setCategory(item)}
                      className={`am-seg flex h-11 cursor-pointer items-center justify-center gap-1.5 border px-3 text-[15px] ${on ? "border-primary bg-primary/8 font-semibold text-primary" : "border-border bg-card font-medium"}`}
                    >
                      {on && <Check aria-hidden="true" className="size-4" strokeWidth={1.8} />}
                      {categoryLabel(item)}
                    </button>
                  )
                })}
              </div>
            </div>
            <FieldRow>
              <Field id="e-amount" required label={<Trans>Amount</Trans>} hint={place ? <Trans>In {currencyName(place.currency)}</Trans> : undefined} error={errors.amount}>
                <Input
                  id="e-amount"
                  inputMode="decimal"
                  dir="ltr"
                  value={amount}
                  aria-invalid={errors.amount ? true : undefined}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field id="e-date" required label={<Trans>Date</Trans>} error={errors.date}>
                <Input id="e-date" type="date" dir="ltr" value={day} onChange={(e) => setDay(e.target.value)} />
              </Field>
            </FieldRow>
            <Field id="e-desc" optional label={<Trans>Description</Trans>} error={errors.description}>
              <Input id="e-desc" dir="auto" maxLength={LIMITS.longText} aria-invalid={errors.description ? true : undefined} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">
                <Trans>Receipt</Trans><FieldNeed optional />
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex aspect-[3/4] w-[120px] flex-none flex-col items-center justify-center gap-1.5 overflow-hidden border border-dashed border-border bg-secondary text-[13px] text-muted-foreground">
                  {preview ? (
                    <img src={preview} alt={t`Receipt photo`} className="size-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon aria-hidden="true" className="size-5" strokeWidth={1.8} />
                      <Trans>Receipt photo</Trans>
                    </>
                  )}
                </div>
                <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2">
                  <Button type="button" variant="outline" className="w-full" onClick={photograph}>
                    <Camera aria-hidden="true" />
                    <Trans>Photograph receipt</Trans>
                  </Button>
                  <span className="text-[13px] text-muted-foreground">
                    <Trans>A clear photo of the amount and date.</Trans>
                  </span>
                </div>
              </div>
              <input
                ref={input}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  setReceipt(e.target.files?.[0] ?? null)
                  e.target.value = ""
                }}
              />
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
            {formError && (
              <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                {formError}
              </p>
            )}
            <div className="hidden desk:block">
              <FormButtons>
                <FormCancel to={{ to: "/expenses" }} />
                {save}
              </FormButtons>
            </div>
          </form>
          <PhoneActionBar>{save}</PhoneActionBar>
        </Panel>
      }
      side={null}
    />
  )
}
