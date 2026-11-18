import { useMemo } from "react"
import { useLingui } from "@lingui/react"

/**
 * Dates, times, numbers and amounts, in the interface language. Arabic uses
 * Western digits (0-9), as the design system asks and as the API returns them.
 */
export function intlLocale(lang: string): string {
  return lang === "ar" ? "ar-u-nu-latn" : "en"
}

export type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  if (value instanceof Date) return value
  // A plain day ("2026-11-17") is that day, not midnight UTC shown as the day before.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`)
  }
  return new Date(value)
}

export function numberFormat(lang: string, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocale(lang), options)
}

export function dateFormat(lang: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocale(lang), options)
}

export function formatNumber(value: number, lang: string, options?: Intl.NumberFormatOptions) {
  return numberFormat(lang, options).format(value)
}

/** An amount with its currency, e.g. "SAR 1,150" (Arabic writes the currency in Arabic). */
export function formatMoney(amount: number, currency: string, lang: string, options?: Intl.NumberFormatOptions) {
  const max = options?.maximumFractionDigits ?? 2
  // A currency defaults to 2 decimals; asking for fewer must lower the minimum too.
  return numberFormat(lang, { style: "currency", currency, minimumFractionDigits: Math.min(2, max), maximumFractionDigits: max, ...options }).format(amount)
}

/** A date (by default "Nov 10, 2026", in Arabic with Western digits); pass options for times. */
export function formatDate(value: DateInput, lang: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return ""
  return dateFormat(lang, options).format(date)
}

/**
 * When something happened, as on the ticket cards: "5 minutes ago",
 * "2 hours ago", "Yesterday", then the day ("18 October").
 */
export function formatRelative(value: DateInput, lang: string, now: Date = new Date()) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return ""
  const minutes = Math.round((now.getTime() - date.getTime()) / 60000)
  const words = new Intl.RelativeTimeFormat(intlLocale(lang), { numeric: "auto" })
  const capital = (text: string) => text.charAt(0).toLocaleUpperCase(intlLocale(lang)) + text.slice(1)
  if (minutes >= 0 && minutes < 60) return capital(words.format(-Math.max(1, minutes), "minute"))
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(date)) / 86400000)
  if (days === 0 && minutes >= 0) return capital(words.format(-Math.round(minutes / 60), "hour"))
  if (days === 1) return capital(words.format(-1, "day"))
  return formatDate(date, lang, { day: "numeric", month: "long" })
}

/** A currency's name in the interface language ("Saudi riyal" in English); the code if unknown. */
export function currencyName(code: string, lang: string) {
  try {
    return new Intl.DisplayNames([intlLocale(lang)], { type: "currency" }).of(code) ?? code
  } catch {
    return code
  }
}

/** The same functions, in the current interface language. */
export function useFormat() {
  const { i18n } = useLingui()
  const lang = i18n.locale
  return useMemo(
    () => ({
      lang,
      locale: intlLocale(lang),
      number: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, lang, options),
      money: (amount: number, currency: string, options?: Intl.NumberFormatOptions) =>
        formatMoney(amount, currency, lang, options),
      date: (value: DateInput, options?: Intl.DateTimeFormatOptions) => formatDate(value, lang, options),
      relative: (value: DateInput) => formatRelative(value, lang),
      currencyName: (code: string) => currencyName(code, lang),
      numberFormat: (options?: Intl.NumberFormatOptions) => numberFormat(lang, options),
      dateFormat: (options?: Intl.DateTimeFormatOptions) => dateFormat(lang, options),
    }),
    [lang],
  )
}
