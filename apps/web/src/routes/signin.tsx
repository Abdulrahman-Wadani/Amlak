import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type SubmitEvent, useState } from "react"
import { CircleAlert, Eye, EyeOff } from "lucide-react"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { signInInput } from "@/lib/validators"
import { useAuth } from "@/lib/auth"
import { AuthBrandPanel } from "@/components/auth-brand-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute("/signin")({
  component: SignIn,
})

function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = signInInput.safeParse({ email, password })
    if (!result.success) {
      const map: { email?: string; password?: string } = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as "email" | "password"
        if (!map[key]) {
          map[key] =
            key === "email"
              ? t`Enter a valid email`
              : t`Password does not meet the requirements`
        }
      }
      setErrors(map)
      return
    }
    setErrors({})
    setFormError("")
    setLoading(true)
    login(email, password)
      .then(() => {
        navigate({ to: "/home" })
      })
      .catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : t`Could not sign in`)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <AuthBrandPanel />

      <main className="flex items-center justify-center px-6 py-10">
        <form onSubmit={handleSubmit} noValidate className="w-full max-w-[340px]">
          <h1 className="text-[28px] font-bold leading-9">
            <Trans comment="Page title">Sign in</Trans>
          </h1>
          <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
            <Trans>Enter your email and password to continue.</Trans>
          </p>

          <div className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                <Trans>Email</Trans>
              </Label>
              <Input
                id="email"
                dir="ltr"
                type="email"
                placeholder="name@example.com"
                className="h-11 rounded-none bg-card"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              {errors.email && (
                <p className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
                  <CircleAlert size={14} />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="password" className="text-sm font-semibold">
                  <Trans>Password</Trans>
                </Label>
                <span className="text-[13px] text-muted-foreground underline">
                  <Trans>Forgot password?</Trans>
                </span>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  dir="ltr"
                  type={showPassword ? "text" : "password"}
                  className="h-11 rounded-none bg-card ps-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? t`Hide password` : t`Show password`
                  }
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute top-1/2 end-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
                  <CircleAlert size={14} />
                  {errors.password}
                </p>
              )}
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
              disabled={loading}
            >
              {loading ? <Trans>Signing in…</Trans> : <Trans>Sign in</Trans>}
            </Button>

            <p className="text-[13px] text-muted-foreground">
              <Trans>
                Don't have an account?{" "}
                <Link to="/signup" className="font-bold text-foreground underline">
                  Create manager account
                </Link>
              </Trans>
            </p>
            <p className="text-[13px] leading-5 text-muted-foreground">
              <Trans>Workers sign in with the invite sent by their manager.</Trans>
            </p>
          </div>
        </form>
      </main>
    </div>
  )
}
