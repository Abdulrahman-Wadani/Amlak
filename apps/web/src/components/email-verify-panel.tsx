import { useRef, type ClipboardEvent, type KeyboardEvent, type SubmitEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { RotateCw, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/auth-layout"

/** Six boxes for the six digits; typing moves on, Backspace moves back, a pasted code fills them all. */
export function CodeBoxes({
  value,
  onChange,
  invalid,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "")

  function set(index: number, digit: string) {
    const next = digits.slice()
    next[index] = digit
    onChange(next.join("").slice(0, 6))
  }

  function onKey(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) boxes.current[index - 1]?.focus()
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    event.preventDefault()
    onChange(pasted)
    boxes.current[Math.min(pasted.length, 5)]?.focus()
  }

  return (
    <div dir="ltr" className="grid grid-cols-6 gap-2">
      {digits.map((digit, index) => (
        <input
          // biome-ignore lint/suspicious/noArrayIndexKey: six fixed boxes
          key={index}
          ref={(el) => {
            boxes.current[index] = el
          }}
          aria-label={t`Digit ${index + 1}`}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          value={digit}
          onPaste={onPaste}
          onKeyDown={(e) => onKey(index, e)}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1)
            set(index, d)
            if (d && index < 5) boxes.current[index + 1]?.focus()
          }}
          className={`box-border h-14 w-full min-w-0 border bg-card text-center text-[22px] font-semibold text-foreground outline-none focus:border-2 focus:border-primary ${invalid ? "border-destructive text-destructive" : "border-border"}`}
        />
      ))}
    </div>
  )
}

/** Check your email: the six-digit code, its time limit, resending it and changing the email. */
export function EmailVerifyPanel({
  email,
  code,
  onCodeChange,
  cooldown,
  loading,
  formError,
  onSubmit,
  onResend,
  onChangeEmail,
}: {
  email: string
  code: string
  onCodeChange: (value: string) => void
  cooldown: number
  loading: boolean
  formError: string
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void
  onResend: () => void
  onChangeEmail: () => void
}) {
  const time = `${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`
  return (
    <AuthCard
      title={<Trans>Check your email</Trans>}
      subtitle={
        <Trans>
          We sent a 6-digit code to{" "}
          <span dir="ltr" className="font-semibold text-foreground">
            {email}
          </span>
        </Trans>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">
            <Trans>Verification code</Trans>
          </span>
          <CodeBoxes value={code} onChange={onCodeChange} invalid={Boolean(formError)} disabled={loading} />
          {formError ? (
            <span role="alert" className="flex items-start gap-1.5 text-[13px] text-destructive">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
              {formError}
            </span>
          ) : (
            <span className="text-[13px] text-muted-foreground">
              <Trans>The code is valid for 10 minutes.</Trans>
            </span>
          )}
        </div>
        <Button type="submit" className="h-12" disabled={loading || code.length !== 6}>
          {loading ? <Trans>Checking…</Trans> : <Trans>Verify email</Trans>}
        </Button>
      </form>
      <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
        {cooldown > 0 ? (
          <span aria-live="polite" className="text-center">
            <Trans>
              Didn’t get the code? You can request a new one in{" "}
              <span dir="ltr" className="font-mono tabular-nums">
                {time}
              </span>
            </Trans>
          </span>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <span>
              <Trans>Didn’t get the code?</Trans>
            </span>
            <Button type="button" variant="outline" className="w-full" onClick={onResend}>
              <RotateCw aria-hidden="true" />
              <Trans>Resend code</Trans>
            </Button>
          </div>
        )}
        <button
          type="button"
          onClick={onChangeEmail}
          className="inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent font-semibold text-foreground underline underline-offset-4"
        >
          <Trans>Change email</Trans>
        </button>
      </div>
    </AuthCard>
  )
}
