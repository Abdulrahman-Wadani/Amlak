import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type ReactNode, type SubmitEvent, useState } from "react"
import { Check, Info, Lock, Mail, TriangleAlert } from "lucide-react"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { signInInput } from "@/lib/validators"
import { useAuth } from "@/lib/auth"
import { ApiError, errorMessage } from "@/lib/errors"
import { LIMITS } from "@/lib/limits"
import { AuthCard, AuthLayout } from "@/components/auth-layout"
import { Field, FieldNeed } from "@/components/panel"
import { Notice } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/password-field"

export const Route = createFileRoute("/signin")({
  component: SignIn,
  validateSearch: (
    search: Record<string, unknown>
  ): { verified?: boolean; activated?: boolean; reset?: boolean } => ({
    ...(search.verified ? { verified: true } : {}),
    ...(search.activated ? { activated: true } : {}),
    ...(search.reset ? { reset: true } : {}),
  }),
})

type Problem = {
  tone: "crit" | "warn" | "info"
  icon: ReactNode
  title: ReactNode
  text?: ReactNode
  verify?: boolean
}

/** Why sign-in was refused, as the design's sign-in messages (Amlak-States). */
function problemFor(error: unknown, email: string): Problem {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_CREDENTIALS") {
      return {
        tone: "crit",
        icon: <TriangleAlert />,
        title: <Trans>Wrong email or password.</Trans>,
      }
    }
    if (error.code === "RATE_LIMITED") {
      return {
        tone: "warn",
        icon: <TriangleAlert />,
        title: <Trans>Too many attempts.</Trans>,
        text: <Trans>Wait a little, then try again.</Trans>,
      }
    }
    switch (error.details.reason) {
      case "EMAIL_NOT_VERIFIED":
        return {
          tone: "warn",
          icon: <Mail />,
          title: <Trans>You have not verified your email yet.</Trans>,
          text: (
            <Trans>
              We sent a new code to <bdi dir="ltr">{email}</bdi>.
            </Trans>
          ),
          verify: true,
        }
      case "INVITATION_PENDING":
        return {
          tone: "info",
          icon: <Info />,
          title: <Trans>Your account is not active yet.</Trans>,
          text: <Trans>Open the invitation email and choose a password.</Trans>,
        }
      case "ACCOUNT_DEACTIVATED":
        return {
          tone: "crit",
          icon: <Lock />,
          title: <Trans>This account is deactivated.</Trans>,
          text: (
            <Trans>Contact your manager or support to reactivate it.</Trans>
          ),
        }
      case "MANAGER_DEACTIVATED":
        return {
          tone: "crit",
          icon: <Lock />,
          title: <Trans>Your manager’s account is deactivated.</Trans>,
          text: (
            <Trans>
              You cannot sign in until the manager’s account is reactivated.
            </Trans>
          ),
        }
    }
  }
  return { tone: "crit", icon: <TriangleAlert />, title: errorMessage(error) }
}

function SignIn() {
  const search = Route.useSearch()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  )
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(false)
  const { login, resendCode } = useAuth()
  const navigate = useNavigate()

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = signInInput.safeParse({ email, password })
    if (!result.success) {
      const map: { email?: string; password?: string } = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as "email" | "password"
        if (!map[key])
          map[key] =
            key === "email" ? t`Enter a valid email` : t`Enter your password`
      }
      setErrors(map)
      return
    }
    setErrors({})
    setProblem(null)
    setLoading(true)
    login(email, password)
      .then(() => {
        void navigate({ to: "/home" })
      })
      .catch(async (err: unknown) => {
        const found = problemFor(err, email)
        // The notice says a new code is on its way: send it.
        if (found.verify) await resendCode(email).catch(() => {})
        if (err instanceof ApiError && err.code === "INVALID_CREDENTIALS") {
          setErrors({ password: t`Check your password and try again` })
        }
        setProblem(found)
      })
      .finally(() => setLoading(false))
  }

  return (
    <AuthLayout>
      <AuthCard
        title={<Trans comment="Page title">Sign in</Trans>}
        subtitle={<Trans>Enter your email and password to continue.</Trans>}
      >
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          {!problem &&
            (search.verified || search.activated || search.reset) && (
              <Notice
                tone="good"
                icon={<Check />}
                title={
                  search.reset ? (
                    <Trans>Your password is changed.</Trans>
                  ) : search.activated ? (
                    <Trans>Your account is active.</Trans>
                  ) : (
                    <Trans>Your email is verified.</Trans>
                  )
                }
              >
                <Trans>Sign in to continue.</Trans>
              </Notice>
            )}
          {problem && (
            <div className="flex flex-col gap-3">
              <Notice
                tone={problem.tone}
                icon={problem.icon}
                title={problem.title}
              >
                {problem.text}
              </Notice>
              {problem.verify && (
                <Button
                  type="button"
                  className="h-11"
                  onClick={() =>
                    void navigate({ to: "/verify", search: { email } })
                  }
                >
                  <Trans>Enter the code</Trans>
                </Button>
              )}
            </div>
          )}
          <Field id="email" required label={<Trans>Email</Trans>} error={errors.email}>
            <Input
              id="email"
              maxLength={LIMITS.email}
              dir="ltr"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              aria-invalid={errors.email ? true : undefined}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="password" className="text-sm font-semibold">
                <Trans>Password</Trans><FieldNeed required />
              </label>
              <Link
                to="/forgot-password"
                className="relative text-sm font-medium underline underline-offset-4 before:absolute before:inset-x-0 before:-inset-y-3 before:content-['']"
              >
                <Trans>Forgot password?</Trans>
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              invalid={Boolean(errors.password)}
              describedBy={errors.password ? "password-error" : undefined}
              disabled={loading}
            />
            {errors.password && (
              <span
                id="password-error"
                role="alert"
                className="flex items-center gap-1.5 text-[13px] text-destructive"
              >
                <TriangleAlert
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                />
                {errors.password}
              </span>
            )}
          </div>
          <Button type="submit" className="h-12" disabled={loading}>
            {loading ? <Trans>Signing in…</Trans> : <Trans>Sign in</Trans>}
          </Button>
        </form>
        <div className="flex flex-col gap-2.5 text-center">
          <p className="m-0 text-muted-foreground">
            <Trans>
              No account?{" "}
              <Link
                to="/signup"
                className="inline-flex min-h-11 items-center font-semibold text-foreground underline underline-offset-4"
              >
                Create a manager account
              </Link>
            </Trans>
          </p>
          <p className="m-0 text-[13px] text-muted-foreground">
            <Trans>
              Workers sign in from the invitation their manager sends.
            </Trans>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
