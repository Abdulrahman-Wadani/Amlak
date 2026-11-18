import { i18n } from "@lingui/core"
import { t } from "@lingui/core/macro"
import { LIMITS } from "@amlak/shared"
import { formatNumber } from "@/lib/format"

export { LIMITS }

/** The message for text over its limit, or undefined when it fits. */
export function tooLong(value: string | null | undefined, limit: number): string | undefined {
  if (!value || value.trim().length <= limit) return undefined
  const max = formatNumber(limit, i18n.locale)
  return t`Use ${max} characters or fewer.`
}

/** The message for an amount over its limit, or undefined when it fits. */
export function tooLarge(value: number | string | null | undefined, max: number = LIMITS.money): string | undefined {
  const n = typeof value === "string" ? Number(value) : value
  if (n === null || n === undefined || !Number.isFinite(n) || n <= max) return undefined
  const most = formatNumber(max, i18n.locale)
  return t`Enter ${most} or less.`
}
