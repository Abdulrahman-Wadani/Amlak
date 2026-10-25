import { Trans } from "@lingui/react/macro"

export function AuthBrandPanel() {
  return (
    <aside className="hidden flex-col bg-foreground px-12 py-10 text-white lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-white text-xl font-bold text-foreground">
          <Trans comment="Brand glyph: negative-space letter inside the white tile; Arabic uses the letter أ">
            A
          </Trans>
        </div>
        <span className="text-[20px] font-bold">
          <Trans comment="Brand wordmark, Latin letters only in English">Amlak</Trans>
        </span>
      </div>
      <div className="mt-auto pb-8">
        {/* whitespace-pre-line: the newlines are part of the message, so the
            translator chooses where the headline breaks in their language. */}
        <h2 className="whitespace-pre-line text-[28px] font-bold leading-10">
          <Trans>{"All your places, their\nmaintenance and bookings,\nin one place."}</Trans>
        </h2>
        <p className="mt-3 text-[13px] leading-5 text-white/60">
          <Trans>For managers and workers. On mobile and desktop.</Trans>
        </p>
      </div>
    </aside>
  )
}
