import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Clock3, Mail } from "lucide-react"
import { errorMessage, readApiError } from "@/lib/errors"
import { LIMITS } from "@/lib/limits"
import { AuthCard, AuthLayout } from "@/components/auth-layout"
import { Field } from "@/components/panel"
import { Notice } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})

/** Forgot password: the email, then "We sent the link"; too many requests wait a minute. */
function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t`Enter a valid email`)
      return
    }
    setLoading(true)
    try {
      const response = await fetch("/api/v1/auth/password/forgot", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (response.ok) setSent(true)
      else if (response.status === 429) setWait(Number(response.headers.get("Retry-After")) || 60)
      else setError(errorMessage(await readApiError(response)))
    } catch {
      setError(errorMessage(null))
    } finally {
      setLoading(false)
    }
  }

  const back = (
    <Link to="/signin" className="inline-flex min-h-11 items-center justify-center self-center font-semibold text-foreground underline underline-offset-4">
      <Trans>Back to sign in</Trans>
    </Link>
  )

  if (sent) {
    return (
      <AuthLayout>
        <section className="box-border flex w-full max-w-[460px] flex-col gap-4 border border-border bg-card p-5 shadow-sm desk:p-9">
          <div role="status" className="flex flex-col items-center gap-3 px-2 py-6 text-center">
            <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-good-50 text-good">
              <Mail className="size-6" strokeWidth={1.8} />
            </span>
            <h1 className="m-0 text-lg font-bold">
              <Trans>We sent the link</Trans>
            </h1>
            <span className="text-sm text-muted-foreground">
              <Trans>If the email is registered with us, a message will arrive within minutes.</Trans>
            </span>
          </div>
          {back}
        </section>
      </AuthLayout>
    )
  }

  const time = `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, "0")}`
  return (
    <AuthLayout>
      <AuthCard
        title={<Trans>Forgot password</Trans>}
        subtitle={<Trans>Enter your email and we will send you a link to set a new password.</Trans>}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {wait > 0 && <Notice tone="warn" icon={<Clock3 />} title={<Trans>You requested too many links.</Trans>} />}
          <Field id="email" label={<Trans>Email</Trans>} error={error}>
            <Input
              id="email"
              type="email"
              maxLength={LIMITS.email}
              dir="ltr"
              autoComplete="email"
              value={email}
              aria-invalid={error ? true : undefined}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </Field>
          <Button type="submit" className="h-12" disabled={loading || wait > 0}>
            {wait > 0 ? (
              <Trans>
                Send link in{" "}
                <span dir="ltr" className="font-mono tabular-nums">
                  {time}
                </span>
              </Trans>
            ) : loading ? (
              <Trans>Sending…</Trans>
            ) : (
              <Trans>Send link</Trans>
            )}
          </Button>
        </form>
        {back}
      </AuthCard>
    </AuthLayout>
  )
}
