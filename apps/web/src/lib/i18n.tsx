import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { i18n, type Messages } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import type { Language } from "@amlak/shared"
import { messages as enMessages } from "@/locales/en.po"
import { messages as arMessages } from "@/locales/ar.po"

const LANG_KEY = "amlak.lang"

const catalogs: Record<Language, Messages> = {
  en: enMessages,
  ar: arMessages,
}

function activate(lang: Language) {
  i18n.load(lang, catalogs[lang])
  i18n.activate(lang)
}

function readInitialLang(): Language {
  const saved = localStorage.getItem(LANG_KEY)
  return saved === "en" || saved === "ar" ? saved : "ar"
}

const initialLang = readInitialLang()
activate(initialLang)

type LangContextValue = {
  lang: Language
  setLang: (lang: Language) => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(initialLang)

  const setLang = useCallback((next: Language) => {
    activate(next)
    setLangState(next)
  }, [])

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
    document.documentElement.classList.toggle("font-arabic", lang === "ar")
  }, [lang])

  const value = useMemo<LangContextValue>(() => ({ lang, setLang }), [lang, setLang])

  return (
    <LangContext.Provider value={value}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </LangContext.Provider>
  )
}

export function useLanguage(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>")
  return ctx
}
