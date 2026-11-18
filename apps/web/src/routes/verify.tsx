import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { type SubmitEvent, useEffect, useState } from "react"
import { t } from "@lingui/core/macro"
import { useAuth } from "@/lib/auth"
import { ApiError, errorMessage } from "@/lib/errors"
import { AuthLayout } from "@/components/auth-layout"
import { EmailVerifyPanel } from "@/components/email-verify-panel"

export const Route = createFileRoute("/verify")({
  component: Verify,
  validateSearch: (search: Record<string, unknown>): { email: string } => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
})

/** The wrong or expired code message of the design, or the general one. */
export function codeError(err: unknown) {
  if (err instanceof ApiError && err.fields.includes("code")) {
    return t`The code is wrong or has expired. Check it or request a new one.`
  }
  if (err instanceof ApiError && err.code === "RATE_LIMITED") return t`You requested too many codes. Try again later.`
  return errorMessage(err)
}

/** Check your email, reached from sign-in when the account's email is not verified yet. */
function Verify() {
  const { email } = Route.useSearch()
  const { verifyCode, resendCode } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState("")
  const [cooldown, setCooldown] = useState(60)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    const timer = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [])

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError("")
    setLoading(true)
    verifyCode(email, code)
      .then(() => navigate({ to: "/signin", search: { verified: true } }))
      .catch((err: unknown) => setFormError(codeError(err)))
      .finally(() => setLoading(false))
  }

  return (
    <AuthLayout>
      <EmailVerifyPanel
        email={email}
        code={code}
        onCodeChange={setCode}
        cooldown={cooldown}
        loading={loading}
        formError={formError}
        onSubmit={handleSubmit}
        onResend={() => {
          setFormError("")
          resendCode(email)
            .then(() => setCooldown(60))
            .catch((err: unknown) => setFormError(codeError(err)))
        }}
        onChangeEmail={() => void navigate({ to: "/signup" })}
      />
    </AuthLayout>
  )
}
