import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState, type FormEvent } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Clock3 } from "lucide-react"
import { errorMessage, readApiError } from "@/lib/errors"
import { AuthCard, AuthLayout } from "@/components/auth-layout"
import { PasswordInput, PasswordRules, passwordOk } from "@/components/password-field"
import { Field } from "@/components/panel"
import { Notice } from "@/components/states"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>): { email: string; token: string } => ({
    email: typeof search.email === "string" ? search.email : "",
    token: typeof search.token === "string" ? search.token : "",
  }),
})

/** Set a new password from the emailed link; an expired link says so and offers a new one. */
function ResetPasswordPage() {
  const { email, token } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [error, setError] = useState("")
  const [expired, setExpired] = useState(!email || !token)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!passwordOk(password)) next.password = t`Password does not meet the requirements`
    if (confirm !== password) next.confirm = t`The two passwords do not match.`
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/v1/auth/password/reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, new_password: password }),
      })
      if (response.ok) await navigate({ to: "/signin", search: { reset: true } })
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
      <AuthCard
        title={<Trans>Set a new password</Trans>}
        subtitle={
          email ? (
            <Trans>
              For account{" "}
              <bdi dir="ltr" className="font-semibold text-foreground">
                {email}
              </bdi>
            </Trans>
          ) : undefined
        }
      >
        {expired ? (
          <div className="flex flex-col gap-4">
            <Notice tone="crit" icon={<Clock3 />} title={<Trans>The link has expired.</Trans>}>
              <Trans>Request a new link from the forgot password page.</Trans>
            </Notice>
            <Link to="/forgot-password" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
              <Trans>Request a new link</Trans>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="new-password" className="text-sm font-semibold">
                <Trans>New password</Trans>
              </label>
              <PasswordInput id="new-password" value={password} onChange={setPassword} invalid={Boolean(errors.password)} describedBy="new-password-rules" />
              <PasswordRules id="new-password-rules" value={password} />
              {errors.password && (
                <span role="alert" className="text-[13px] text-destructive">
                  {errors.password}
                </span>
              )}
            </div>
            <Field id="confirm-password" label={<Trans>Confirm password</Trans>} error={errors.confirm}>
              <PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} invalid={Boolean(errors.confirm)} />
            </Field>
            {error && (
              <p role="alert" className="m-0 text-[13px] text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="h-12" disabled={loading}>
              {loading ? <Trans>Saving…</Trans> : <Trans>Save password</Trans>}
            </Button>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  )
}
