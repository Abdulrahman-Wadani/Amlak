import { t } from "@lingui/core/macro"
import type { ExpenseCategory } from "@amlak/shared"

export const CATEGORIES: ExpenseCategory[] = ["MAINTENANCE", "UTILITIES", "TAXES", "CLEANING", "SUPPLIES", "OTHER"]

/** An expense category as shown (UTILITIES is "Bills", as in the design). */
export function categoryLabel(category: ExpenseCategory): string {
  switch (category) {
    case "MAINTENANCE":
      return t`Maintenance`
    case "UTILITIES":
      return t`Bills`
    case "TAXES":
      return t`Taxes`
    case "CLEANING":
      return t`Cleaning`
    case "SUPPLIES":
      return t`Supplies`
    case "OTHER":
      return t`Other`
  }
}

/** A grey category chip. */
export function CategoryChip({ category }: { category: ExpenseCategory }) {
  return (
    <span className="inline-flex h-[26px] flex-none items-center gap-1.5 border border-border bg-secondary px-2.5 text-[13px] font-semibold whitespace-nowrap text-muted-foreground">
      <span aria-hidden="true" className="size-[7px] bg-muted-foreground" />
      {categoryLabel(category)}
    </span>
  )
}

/** An amount with the currency code small after it ("4,650 SAR"), in the mono digits of the design. */
export function Amount({
  value,
  currency,
  format,
  className = "",
}: {
  value: number
  currency: string
  format: (value: number, options?: Intl.NumberFormatOptions) => string
  className?: string
}) {
  return (
    <span className={`whitespace-nowrap ${className}`}>
      <span className="font-mono font-bold tabular-nums">{format(value, { maximumFractionDigits: 2 })}</span>{" "}
      <span className="text-[0.8em] font-semibold">{currency}</span>
    </span>
  )
}
