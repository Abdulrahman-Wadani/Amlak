
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { t } from "@lingui/core/macro"
import Form, { type FormValues } from "@/components/form"
import { S } from "@/lib/dom-style"
import { apiError, errorMessage } from "@/lib/errors"

export const Route = createFileRoute("/account-setup")({
  component: AccountSetupPage,
})


function AccountSetupPage() {
  const navigate = useNavigate()

  const params = new URLSearchParams(window.location.search)
  const email = params.get("email") ?? ""
  const token = params.get("token") ?? ""

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const messages = {
    title: t`Set Up Your Account`,
    description: t`Welcome! Create a password to activate your account and get started.`,
    email: t`Email Address`,
    password: t`Password`,
    confirmPassword: t`Confirm Password`,
    passwordPlaceholder: t`Enter your password`,
    confirmPlaceholder: t`Re-enter your password`,
    submit: t`Activate Account`,
    submitting: t`Activating Account...`,
    invalidLink: t`The invitation link is invalid or missing required information.`,
    passwordRequired: t`Password is required.`,
    passwordLength: t`Password must be at least 8 characters.`,
    passwordMismatch: t`Passwords do not match.`,
    failed: t`Unable to activate your account. The link may be invalid, expired, or already used.`,
    activated: t`Your account has been activated successfully!`,
    activatedDescription: t`You can now log in using your email and password.`,
    login: t`Go to Login`,
    invalidResponse: t`Something went wrong. Please try again.`,
  }

  const fields = [
    {
      name: "password",
      label: messages.password,
      type: "password",
      required: true,
    },
    {
      name: "confirm_password",
      label: messages.confirmPassword,
      type: "password",
      required: true,
    },
  ]

  async function handleSubmit(submitted: FormValues) {
    const values = {
      password: typeof submitted.password === "string" ? submitted.password : "",
      confirm_password:
        typeof submitted.confirm_password === "string" ? submitted.confirm_password : "",
    }
    setError("")

    if (!email || !token) {
      setError(messages.invalidLink)
      return
    }

    if (!values.password) {
      setError(messages.passwordRequired)
      return
    }

    if (values.password.length < 8) {
      setError(messages.passwordLength)
      return
    }

    if (values.password !== values.confirm_password) {
      setError(messages.passwordMismatch)
      return
    }

    try {
      setLoading(true)

      const response = await fetch("/api/v1/auth/account-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          token,
          password: values.password,
        }),
      })

      if (response.status === 204) {
        setSuccess(true)
        return
      }

      const data = await response.json().catch(() => null)

      if (response.status === 422) {
        setError(messages.failed)
        return
      }

      setError(
        errorMessage(apiError(response.status, data)),
      )
    } catch {
      setError(messages.invalidResponse)
    } finally {
      setLoading(false)
    }
  }

  if (!email || !token) {
    return (
      <div
        style={S("min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--background)")}
      >
        <div
          style={S("width: 100%; max-width: 440px; padding: 32px; border: 1px solid var(--border); border-radius: 12px; background: var(--card); text-align: center")}
        >
          <h1 style={S("font-size: 24px; font-weight: 700; margin-bottom: 12px")}>
            {messages.title}
          </h1>

          <p style={S("font-size: 14px; color: var(--destructive)")}>
            {messages.invalidLink}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={S("min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--background)")}
    >
      <div
        style={S("width: 100%; max-width: 460px; padding: 32px; border: 1px solid var(--border); border-radius: 12px; background: var(--card); box-sizing: border-box")}
      >
        <div style={S("text-align: center; margin-bottom: 28px")}>
          <h1 style={S("font-size: 26px; font-weight: 700; margin: 0 0 12px")}>
            {success ? messages.activated : messages.title}
          </h1>

          <p style={S("font-size: 14px; color: var(--muted-foreground); margin: 0; line-height: 1.8")}>
            {success
              ? messages.activatedDescription
              : messages.description}
          </p>
        </div>

        {success ? (
          <div style={S("display: flex; flex-direction: column; gap: 16px")}>
            <div
              style={S("padding: 14px; border-radius: 8px; background: var(--muted); text-align: center; font-size: 14px")}
            >
              {messages.email}: <strong>{email}</strong>
            </div>

            <button
              type="button"
              onClick={() => navigate({ to: "/signin" })}
              style={S("width: 100%; padding: 12px 16px; border: 0; border-radius: 7px; background: var(--primary); color: var(--primary-foreground); font-size: 14px; font-weight: 600; cursor: pointer")}
            >
              {messages.login}
            </button>
          </div>
        ) : (
          <>
            <div
              style={S("padding: 12px 14px; margin-bottom: 20px; border-radius: 8px; background: var(--muted); font-size: 13px; overflow-wrap: anywhere")}
            >
              <span style={S("color: var(--muted-foreground)")}>
                {messages.email}
              </span>
              <p style={S("font-weight: 600; margin: 5px 0 0")}>
                {email}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                style={S("margin-bottom: 16px; padding: 12px; border-radius: 7px; background: var(--destructive); color: white; font-size: 13px")}
              >
                {error}
              </div>
            )}
<center>
            <div style={S("opacity: 1")}>
              <Form onSubmit={handleSubmit} fields={fields} />
            </div>
            </center>

            {loading && (
              <p style={S("text-align: center; color: var(--muted-foreground); font-size: 13px; margin-top: 12px")}>
                {messages.submitting}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
