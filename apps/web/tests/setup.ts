import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { messages } from "../src/locales/en.po"

// Components and helpers call t and <Trans>; give them the English catalog.
i18n.load("en", messages)
i18n.activate("en")

afterEach(() => {
  cleanup()
})
