import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Mail } from "lucide-react"
import { errorMessage, readApiError } from "@/lib/errors"
import { AuthCard, AuthLayout } from "@/components/auth-layout"
import { PasswordInput, PasswordRules, passwordOk } from "@/components/password-field"
import { Field } from "@/components/panel"
import { Notice } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export const Route = createFileRoute("/account-setup")({
  component: AccountSetupPage,
  validateSearch: (search: Record<string, unknown>): { email: string; token: string } => ({
    email: typeof search.email === "string" ? search.email : "",
    token: typeof search.token === "string" ? search.token : "",
  }),
})

/** A worker's first visit from the invitation: choose a password to activate the account. */
function AccountSetupPage() {
  const { email, token } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [error, setError] = useState("")
  const [expired, setExpired] = useState(!email || !token)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!passwordOk(password)) {
      setPasswordError(t`Password does not meet the requirements`)
      return
    }
    setPasswordError("")
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/v1/auth/account-setup", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      })
      if (response.ok) await navigate({ to: "/signin", search: { activated: true } })
      else {
        const failure = await readApiError(response)
        if (failure.fields.includes("token") || response.status === 422) setExpired(true)
        else setError(errorMessage(failure))
      }
    } catch {
      setError(errorMessage(null))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard title={<Trans>Welcome to Amlak</Trans>} subtitle={<Trans>Choose a password to activate your account.</Trans>}>
        {expired ? (
          <Notice tone="crit" icon={<Mail />} title={<Trans>The invitation has expired.</Trans>}>
            <Trans>Ask your manager to send a new invitation.</Trans>
          </Notice>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Field id="setup-email" label={<Trans>Email</Trans>}>
              <Input id="setup-email" dir="ltr" value={email} readOnly className="bg-secondary text-muted-foreground" />
            </Field>
            <div className="flex flex-col gap-2">
              <label htmlFor="setup-password" className="text-sm font-semibold">
                <Trans>Choose a password</Trans>
              </label>
              <PasswordInput id="setup-password" value={password} onChange={setPassword} invalid={Boolean(passwordError)} describedBy="setup-rules" />
              <PasswordRules id="setup-rules" value={password} />
              {passwordError && (
                <span role="alert" className="text-[13px] text-destructive">
                  {passwordError}
                </span>
              )}
            </div>
            {error && (
              <p role="alert" className="m-0 text-[13px] text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="h-12" disabled={loading}>
              {loading ? <Trans>Activating…</Trans> : <Trans>Activate account</Trans>}
            </Button>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  )
}
