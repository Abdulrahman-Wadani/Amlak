
import { useState, type FormEvent } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import {
  LockKeyhole,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search)

  const email = params.get("email") ?? ""
  const token = params.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setError("")

    if (!email || !token) {
      setError("The reset link is invalid or incomplete.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    try {
      setLoading(true)

      const response = await fetch("/api/v1/auth/password/reset", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          token,
          new_password: password,
        }),
      })

      if (response.status === 204) {
        setSuccess(true)
        setPassword("")
        setConfirmPassword("")
        return
      }

      if (response.status === 422) {
        setError("The reset link is invalid, expired, or already used.")
        return
      }

      let message = "Something went wrong. Please try again."

      try {
        const data = await response.json()
        message = data.message || message
      } catch {
        // The response may not contain JSON.
      }

      setError(message)
    } catch {
      setError("Unable to connect to the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const renderError = () => {
    switch (error) {
      case "The reset link is invalid or incomplete.":
        return <Trans>The reset link is invalid or incomplete.</Trans>

      case "Password must be at least 8 characters.":
        return <Trans>Password must be at least 8 characters.</Trans>

      case "Passwords do not match.":
        return <Trans>Passwords do not match.</Trans>

      case "The reset link is invalid, expired, or already used.":
        return (
          <Trans>
            The reset link is invalid, expired, or already used.
          </Trans>
        )

      case "Unable to connect to the server. Please try again.":
        return (
          <Trans>
            Unable to connect to the server. Please try again.
          </Trans>
        )

      case "Something went wrong. Please try again.":
        return <Trans>Something went wrong. Please try again.</Trans>

      default:
        return error
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LockKeyhole className="h-7 w-7" />
            </div>

            <CardTitle className="text-2xl font-bold">
              <Trans>Reset Password</Trans>
            </CardTitle>

            <CardDescription className="text-sm leading-6">
              <Trans>
                Create a new password for your account. Your password must be
                at least 8 characters long.
              </Trans>
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="space-y-5 text-center">
                <div className="flex flex-col items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-5">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />

                  <h3 className="font-semibold text-foreground">
                    <Trans>Password Reset Successful</Trans>
                  </h3>

                  <p className="text-sm leading-6 text-muted-foreground">
                    <Trans>
                      Your password has been changed successfully. Please log
                      in again using your new password.
                    </Trans>
                  </p>
                </div>

                <Link
                  to="/signin"
                  className={cn(buttonVariants(), "h-11 w-full")}
                >
                  <Trans>Go to Login</Trans>
                </Link>
              </div>
            ) : !email || !token ? (
              <div className="space-y-5 text-center">
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
                  <p className="text-sm leading-6 text-destructive">
                    <Trans>
                      This password reset link is invalid or incomplete.
                      Please request a new reset link.
                    </Trans>
                  </p>
                </div>

                <Link
                  to="/forgot-password"
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  <Trans>Request a New Link</Trans>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium"
                  >
                    <Trans>New Password</Trans>
                  </label>

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      disabled={loading}
                      className="h-11 pr-11"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <Trans>At least 8 characters.</Trans>
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                  >
                    <Trans>Confirm New Password</Trans>
                  </label>

                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      disabled={loading}
                      className="h-11 pr-11"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((prev) => !prev)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  >
                    {renderError()}
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <Trans>Resetting Password...</Trans>
                    </>
                  ) : (
                    <Trans>Reset Password</Trans>
                  )}
                </Button>
              </form>
            )}

            {!success && (
              <div className="mt-6 border-t pt-5">
                <a
                  href="/signin"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <Trans>Back to Login</Trans>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
