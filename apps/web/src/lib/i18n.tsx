
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"

import { i18n, type Messages } from "@lingui/core"
import { msg } from "@lingui/core/macro"
import { I18nProvider } from "@lingui/react"
import type { Language } from "@amlak/shared"

import { messages as enMessages } from "@/locales/en.po"
import { messages as arMessages } from "@/locales/ar.po"

const LANG_KEY = "amlak.lang"

/**
 * Each language's name in that language, for language pickers. They are not
 * translated: a reader looks for their own language by its own name.
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  ar: "العربية",
  en: "English",
}

const catalogs: Record<Language, Messages> = {
  en: enMessages,
  ar: arMessages,
}

function activate(lang: Language) {
  i18n.load(lang, catalogs[lang])
  i18n.activate(lang)
  // The tab title is the brand, written in the interface language.
  document.title = i18n._(msg`Amlak`)
}

function readInitialLang(): Language {
  const saved = localStorage.getItem(LANG_KEY)

  return saved === "en" || saved === "ar" ? saved : "ar"
}

// Activate the saved language now, before anything renders, so `t` and
// <Trans> always have a locale (on the first render too).
activate(readInitialLang())

type LangContextValue = {
  lang: Language
  setLang: (lang: Language) => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readInitialLang)

  const setLang = useCallback((next: Language) => {
    if (next !== "ar" && next !== "en") return

    // Activate Lingui catalog
    activate(next)

    // Save language
    localStorage.setItem(LANG_KEY, next)

    // Update the entire website direction and language
    document.documentElement.lang = next
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr"
    document.documentElement.classList.toggle(
      "font-arabic",
      next === "ar"
    )

    // Update React context
    setLangState(next)
  }, [])

  useEffect(() => {
    activate(lang)

    localStorage.setItem(LANG_KEY, lang)

    document.documentElement.lang = lang
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"

    document.documentElement.classList.toggle(
      "font-arabic",
      lang === "ar"
    )
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang,
    }),
    [lang, setLang]
  )

  return (
    <LangContext.Provider value={value}>
      <I18nProvider i18n={i18n}>
        {children}
      </I18nProvider>
    </LangContext.Provider>
  )
}

export function useLanguage(): LangContextValue {
  const ctx = useContext(LangContext)

  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider")
  }

  return ctx
}
