import { type SubmitEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * The email-confirmation step of sign-up, split out from /signup so the
 * route stays a single concern. Purely presentational: the route owns
 * state and the API calls; every string is a Lingui message so the whole
 * panel flips with the UI language.
 */
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
  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="text-[28px] font-bold leading-9">
        <Trans>Open your email</Trans>
      </h1>
      {/* Rich text: the styled {email} span lives INSIDE the message,
          so the translator positions it for their language. */}
      <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
        <Trans>
          We sent a 6-digit code to{" "}
          <span dir="ltr" className="font-bold text-foreground">
            {email}
          </span>
          .
        </Trans>
      </p>

      <div className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code" className="text-sm font-semibold">
            <Trans>Verification code</Trans>
          </Label>
          <Input
            id="code"
            dir="ltr"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className="h-11 rounded-none bg-card text-center tracking-[0.5em]"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
            disabled={loading}
          />
          <p className="text-[13px] leading-5 text-muted-foreground">
            <Trans>The code is valid for 10 minutes.</Trans>
          </p>
        </div>

        {formError && (
          <p className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
            <CircleAlert size={14} />
            {formError}
          </p>
        )}

        <Button
          type="submit"
          className="h-11 rounded-none bg-info-700 font-bold text-white hover:bg-info-900"
          disabled={loading || code.length !== 6}
        >
          {loading ? <Trans>Confirming…</Trans> : <Trans>Confirm email</Trans>}
        </Button>

        <p className="text-[13px] text-muted-foreground">
          <Trans>Didn't get the code?</Trans>{" "}
          {cooldown > 0 ? (
            <span>
              <Trans>You can request a new code in</Trans>{" "}
              <span dir="ltr" className="font-mono">
                {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}
              </span>
            </span>
          ) : (
            <button
              type="button"
              className="font-bold text-foreground underline"
              onClick={onResend}
            >
              <Trans>Resend code</Trans>
            </button>
          )}
          {" · "}
          <button
            type="button"
            className="font-bold text-foreground underline"
            onClick={onChangeEmail}
          >
            <Trans>Change email</Trans>
          </button>
        </p>
      </div>
    </form>
  )
}
