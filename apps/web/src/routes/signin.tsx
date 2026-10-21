import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { type SubmitEvent, useState } from "react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signInInput } from "@/lib/validators"

export const Route = createFileRoute("/signin")({
  component: SignIn,
})

type Fieldkey = "email" | "password"

function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Partial<Record<Fieldkey, string>>>({})
  const [formError, setFormError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, logout } = useAuth()
  const navigate = useNavigate()

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = signInInput.safeParse({ email, password })
    if (!result.success) {
      const map: Partial<Record<Fieldkey, string>> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as Fieldkey
        if (!map[key]) map[key] = issue.message
      }
      setErrors(map)
      return
    }
    setErrors({})
    setSuccess(false)
    setFormError("")
    setLoading(true)
    login(email, password)
      .then(() => {
        navigate({ to: "/home"})
      })
      .catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : "Sign in failed")
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[420px] rounded-xl p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-extrabold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-bold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="h-[42px]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              {errors.email && (
                <Alert variant="destructive">
                  <AlertTitle>{errors.email}</AlertTitle>
                </Alert>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-bold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-[42px]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              {errors.password && (
                <Alert variant="destructive">
                  <AlertTitle>{errors.password}</AlertTitle>
                </Alert>
              )}
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertTitle>{formError}</AlertTitle>
              </Alert>
            )}

            <Button type="submit" className="h-[42px] font-bold" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            {success && (
              <Alert>
                <AlertTitle>Signed in</AlertTitle>
              </Alert>
            )}
          </div>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/signup" className="text-info-700 hover:underline">
            Create account
          </Link>
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={() => {
              logout()
              setSuccess(true)
            }}
          >
            Log out
          </button>
        </div>
      </Card>
    </div>
  )
}
