
import { useState, type FormEvent } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setError("")
    setSuccess(false)

    if (!email.trim()) {
      setError("Please enter your email address.")
      return
    }

    try {
      setLoading(true)

      const response = await fetch("/api/v1/auth/password/forgot", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      })

      if (response.status === 204) {
        setSuccess(true)
        return
      }

      if (response.status === 429) {
        setError("Too many requests. Please try again later.")
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-7 w-7" />
            </div>

            <CardTitle className="text-2xl font-bold">
              <Trans>Forgot Password?</Trans>
            </CardTitle>

            <CardDescription className="text-sm leading-6">
              <Trans>
                Enter your email address and we will send you a link to reset
                your password.
              </Trans>
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="space-y-5 text-center">
                <div className="flex flex-col items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-5">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />

                  <h3 className="font-semibold text-foreground">
                    <Trans>Check your email</Trans>
                  </h3>

                  <p className="text-sm leading-6 text-muted-foreground">
                    <Trans>
                      If an active account exists for this email address, you
                      will receive a password reset link shortly.
                    </Trans>
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSuccess(false)
                    setEmail("")
                  }}
                >
                  <Trans>Try another email</Trans>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium"
                  >
                    <Trans>Email Address</Trans>
                  </label>

                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  >
                    {error === "Please enter your email address." ? (
                      <Trans>Please enter your email address.</Trans>
                    ) : error === "Too many requests. Please try again later." ? (
                      <Trans>Too many requests. Please try again later.</Trans>
                    ) : error === "Unable to connect to the server. Please try again." ? (
                      <Trans>
                        Unable to connect to the server. Please try again.
                      </Trans>
                    ) : error === "Something went wrong. Please try again." ? (
                      <Trans>Something went wrong. Please try again.</Trans>
                    ) : (
                      error
                    )}
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
                      <Trans>Sending...</Trans>
                    </>
                  ) : (
                    <Trans>Send Reset Link</Trans>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 border-t pt-5">
              <a
                href="/signin"
                className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <Trans>Back to Login</Trans>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
