import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { type SubmitEvent, useState } from "react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signInInput } from "@/lib/validators"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = signInInput.safeParse({ email, password })
    const issues = result.success ? [] : result.error.issues
    setEmailError(issues.find((i) => i.path[0] === "email")?.message ?? "")
    setPasswordError(
      issues.find((i) => i.path[0] === "password")?.message ?? ""
    )

    if (issues.length > 0) {
      setSuccess(false)
    } else {
      setLoading(true)
      await login(email, password)
      navigate({ to: "/home"})
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-6 text-[28px] font-extrabold tracking-tight">
          Sign in
        </h1>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-bold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@amlak.com"
              className={`h-[42px] ${emailError ? "border-crit-700 bg-crit-50" : ""} ${loading ? "opacity-60" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            {emailError && (
              <p className="flex items-center gap-1.5 text-xs text-crit-700">
                <span className="size-[6px] bg-crit" />
                {emailError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-sm font-bold">
              Password <span className="text-crit-700">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className={`h-[42px] ${passwordError ? "border-crit-700 bg-crit-50" : ""} ${loading ? "opacity-60" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {passwordError && (
              <p className="flex items-center gap-1.5 text-xs text-crit-700">
                <span className="size-[6px] bg-crit" />
                {passwordError}
              </p>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[12px]">
            <input type="checkbox" className="size-4 accent-primary" />
            Remember me
          </label>

          {success && (
            <Alert>
              <AlertTitle>Signed in (mock)</AlertTitle>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="h-10 w-full">
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
        {/* biome-ignore lint/a11y/useValidAnchor: placeholder link until /forgot-password route exists */}
        <a
          href="#"
          className="mt-4 inline-block text-sm text-info-700 hover:underline"
        >
          Forgot password?
        </a>
      </Card>
    </div>
  )
}

export const Route = createFileRoute("/signin")({ component: SignIn })
