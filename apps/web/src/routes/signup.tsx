import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type SubmitEvent, useEffect, useState } from "react"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { CircleAlert, TriangleAlert } from "lucide-react"
import { useAuth } from "@/lib/auth"
import type { Language } from "@amlak/shared"
import { LANGUAGE_NAMES, useLanguage } from "@/lib/i18n"
import { ApiError, errorMessage } from "@/lib/errors"
import { LIMITS, tooLong } from "@/lib/limits"
import { AuthCard, AuthLayout } from "@/components/auth-layout"
import { EmailVerifyPanel } from "@/components/email-verify-panel"
import { PasswordInput, PasswordRules, passwordOk } from "@/components/password-field"
import { Field, FieldNeed, Segmented } from "@/components/panel"
import { toE164 } from "@/components/worker-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { codeError } from "@/routes/verify"

export const Route = createFileRoute("/signup")({
  component: SignUp,
})

type FieldKey = "fullname" | "email" | "phone" | "password"

/** Create a manager account, then check the email for the code. */
function SignUp() {
  const { lang, setLang } = useLanguage()
  const [fullname, setFullname] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"register" | "verify">("register")
  const [code, setCode] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const { register, verifyCode, resendCode, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (step !== "verify") return
    const timer = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [step])

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const number = toE164(phone.trim())
    const next: Partial<Record<FieldKey, string>> = {}
    if (!fullname.trim()) next.fullname = t`Enter your full name`
    else next.fullname = tooLong(fullname, LIMITS.name)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = t`Enter a valid email`
    if (!/^\+9665[013-9]\d{7}$/.test(number)) next.phone = t`Enter a Saudi mobile number that starts with 5.`
    if (!passwordOk(password)) next.password = t`Password does not meet the requirements`
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setFormError("")
    setLoading(true)
    register(email.trim(), fullname.trim(), number, password, lang)
      .then(() => {
        setStep("verify")
        setCooldown(60)
      })
      .catch((err: unknown) => {
        // Registering can only clash on the email.
        if (err instanceof ApiError && err.code === "CONFLICT") {
          setErrors({ email: t`This email is already registered. Sign in or reset your password.` })
        } else {
          setFormError(errorMessage(err))
        }
      })
      .finally(() => setLoading(false))
  }

  function handleVerify(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError("")
    setLoading(true)
    verifyCode(email.trim(), code)
      .then(() => login(email.trim(), password))
      .then(() => {
        void navigate({ to: "/home" })
      })
      .catch((err: unknown) => setFormError(codeError(err)))
      .finally(() => setLoading(false))
  }

  if (step === "verify") {
    return (
      <AuthLayout>
        <EmailVerifyPanel
          email={email}
          code={code}
          onCodeChange={setCode}
          cooldown={cooldown}
          loading={loading}
          formError={formError}
          onSubmit={handleVerify}
          onResend={() => {
            setFormError("")
            resendCode(email.trim())
              .then(() => setCooldown(60))
              .catch((err: unknown) => setFormError(codeError(err)))
          }}
          onChangeEmail={() => {
            setFormError("")
            setCode("")
            setStep("register")
          }}
        />
      </AuthLayout>
    )
  }

  const invalid = (key: FieldKey, id: string) =>
    errors[key] ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {}
  const errorLine = (text?: string) =>
    text && (
      <span className="inline-flex items-start gap-1.5">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
        {text}
      </span>
    )

  return (
    <AuthLayout>
      <AuthCard
        title={<Trans>Create a manager account</Trans>}
        subtitle={<Trans>We will send a verification code to your email after you register.</Trans>}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <Field id="fullname" required label={<Trans>Full name</Trans>} error={errors.fullname}>
            <Input id="fullname" maxLength={LIMITS.name} autoComplete="name" value={fullname} onChange={(e) => setFullname(e.target.value)} disabled={loading} {...invalid("fullname", "fullname")} />
          </Field>
          <Field id="email" required label={<Trans>Email</Trans>} error={errorLine(errors.email)}>
            <Input id="email" type="email" maxLength={LIMITS.email} dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} {...invalid("email", "email")} />
          </Field>
          <Field id="phone" required label={<Trans>Mobile number</Trans>} hint={<Trans>Saudi mobile starting with 5</Trans>} error={errors.phone}>
            <div dir="ltr" className="flex gap-2">
              <span className="box-border inline-flex h-11 flex-none items-center border border-border bg-secondary px-3 text-[15px]">+966</span>
              <Input id="phone" type="tel" dir="ltr" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} {...invalid("phone", "phone")} />
            </div>
          </Field>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-semibold">
              <Trans>Password</Trans><FieldNeed required />
            </label>
            <PasswordInput id="password" value={password} onChange={setPassword} invalid={Boolean(errors.password)} disabled={loading} describedBy="password-rules" />
            <PasswordRules id="password-rules" value={password} />
            {errors.password && (
              <span role="alert" className="text-[13px] text-destructive">
                {errors.password}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">
              <Trans>Account language</Trans><FieldNeed required />
            </span>
            <Segmented<Language>
              label={t`Account language`}
              value={lang}
              onChange={setLang}
              options={[
                { key: "ar", label: <span lang="ar">{LANGUAGE_NAMES.ar}</span> },
                { key: "en", label: <span lang="en">{LANGUAGE_NAMES.en}</span> },
              ]}
            />
          </div>
          {formError && (
            <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
              <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
              {formError}
            </p>
          )}
          <Button type="submit" className="h-12" disabled={loading}>
            {loading ? <Trans>Creating account…</Trans> : <Trans>Create account</Trans>}
          </Button>
        </form>
        <p className="m-0 text-center text-muted-foreground">
          <Trans>
            Already have an account?{" "}
            <Link to="/signin" className="inline-flex min-h-11 items-center font-semibold text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </Trans>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}
