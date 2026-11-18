import { t } from "@lingui/core/macro"
import { LIMITS } from "@amlak/shared"

export { LIMITS }

/** The message for text over its limit, or undefined when it fits. */
export function tooLong(value: string | null | undefined, max: number): string | undefined {
  return value && value.trim().length > max ? t`Use ${max} characters or fewer.` : undefined
}

/** The message for an amount over its limit, or undefined when it fits. */
export function tooLarge(value: number | string | null | undefined, max: number = LIMITS.money): string | undefined {
  const n = typeof value === "string" ? Number(value) : value
  if (n === null || n === undefined || !Number.isFinite(n) || n <= max) return undefined
  const most = max.toLocaleString("en-US")
  return t`Enter ${most} or less.`
}
