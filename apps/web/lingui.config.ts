import { defineConfig } from "@lingui/cli"

// Official Lingui v6 config (lingui.dev/ref/conf).
// - pot catalogs: src/locales/{localeCode}.po is the single source of
//   translated truth; `lingui extract` keeps it in sync with the source.
// - Message ids are auto-generated (stable hashes) — the recommended default.
//   Message text lives inline in the components via macros.
// - fallbackLocales: untranslated Arabic strings fall back to English
//   instead of rendering a raw id hash.
export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "ar"],
  fallbackLocales: { ar: "en" },
  catalogs: [
    {
      path: "src/locales/{locale}",
      include: ["src"],
    },
  ],
})
