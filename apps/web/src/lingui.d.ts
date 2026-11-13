// Ambient types for the message catalogs imported by lib/i18n.tsx.
// @lingui/vite-plugin compiles these .po files into JS modules on the fly
// (ref: lingui.dev/ref/vite-plugin) — TypeScript just needs to know the shape.
declare module "*.po" {
  import type { Messages } from "@lingui/core"
  export const messages: Messages
}
