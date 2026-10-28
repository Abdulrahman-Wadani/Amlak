import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type SubmitEvent, useEffect, useState } from "react"
import { CircleAlert } from "lucide-react"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { signUpInput } from "@/lib/validators"
import { useAuth } from "@/lib/auth"
import { useLanguage } from "@/lib/i18n"
import { AuthBrandPanel } from "@/components/auth-brand-panel"
import { EmailVerifyPanel } from "@/components/email-verify-panel"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute("/signup")({
  component: SignUp,
})

type FieldKey = "fullname" | "email" | "phone" | "password"

function validationMessage(key: FieldKey): string {
  switch (key) {
    case "fullname":
      return t`Enter your full name`
    case "email":
      return t`Enter a valid email`
    case "phone":
      return t`Enter a valid phone number`
    case "password":
      return t`Password does not meet the requirements`
  }
}

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
    const timer = setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [step])

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = signUpInput.safeParse({ fullname, email, phone, password })
    if (!result.success) {
      const map: Partial<Record<FieldKey, string>> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as FieldKey
        if (!map[key]) map[key] = validationMessage(key)
      }
      setErrors(map)
      return
    }
    setErrors({})
    setFormError("")
    setLoading(true)
    register(email, fullname, phone, password, lang)
      .then(() => {
        setStep("verify")
        setCooldown(60)
      })
      .catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : t`Could not create the account`)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  function handleVerify(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError("")
    setLoading(true)
    verifyCode(email, code)
      .then(() => login(email, password))
      .then(() => {
        void navigate({ to: "/home" })
      })
      .catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : t`Could not confirm the email`)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  function handleResend() {
    setFormError("")
    resendCode(email)
      .then(() => setCooldown(60))
      .catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : t`Could not resend the code`)
      })
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <AuthBrandPanel />

      <main className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[360px]">
          {step === "verify" ? (
            <EmailVerifyPanel
              email={email}
              code={code}
              onCodeChange={setCode}
              cooldown={cooldown}
              loading={loading}
              formError={formError}
              onSubmit={handleVerify}
              onResend={handleResend}
              onChangeEmail={() => setStep("register")}
            />
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h1 className="text-[28px] font-bold leading-9">
                <Trans>Create manager account</Trans>
              </h1>
              <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
                <Trans>Enter your details to create your account.</Trans>
              </p>

              <div className="mt-8 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fullname" className="text-sm font-semibold">
                    <Trans>Full name</Trans>
                  </Label>
                  <Input
                    id="fullname"
                    placeholder={t`Ahmed Hamad`}
                    className="h-11 rounded-none bg-card"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    disabled={loading}
                  />
                  {errors.fullname && (
                    <p className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
                      <CircleAlert size={14} />
                      {errors.fullname}
                    </p>
                  )}
                </div>

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
                  <Label htmlFor="phone" className="text-sm font-semibold">
                    <Trans>Phone number</Trans>
                  </Label>
                  <Input
                    id="phone"
                    dir="ltr"
                    type="tel"
                    placeholder="+966512345678"
                    className="h-11 rounded-none bg-card"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                  {errors.phone && (
                    <p className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
                      <CircleAlert size={14} />
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password" className="text-sm font-semibold">
                    <Trans>Password</Trans>
                  </Label>
                  <Input
                    id="password"
                    dir="ltr"
                    type="password"
                    className="h-11 rounded-none bg-card"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <ul className="flex flex-col gap-1 text-[13px] leading-5 text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <span className="h-1 w-1 bg-muted-foreground" />
                      <Trans>At least 8 characters</Trans>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-1 w-1 bg-muted-foreground" />
                      <Trans>One uppercase letter (A-Z)</Trans>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-1 w-1 bg-muted-foreground" />
                      <Trans>One lowercase letter (a-z)</Trans>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-1 w-1 bg-muted-foreground" />
                      <Trans>One symbol (like ! or @)</Trans>
                    </li>
                  </ul>
                  {errors.password && (
                    <p className="flex items-center gap-1.5 text-[13px] leading-5 text-crit-900">
                      <CircleAlert size={14} />
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">
                    <Trans>Account language</Trans>
                  </span>
                  <div className="grid grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setLang("ar")}
                      aria-pressed={lang === "ar"}
                      className={
                        lang === "ar"
                          ? "h-11 border border-info-700 bg-info-50 font-bold text-info-900"
                          : "h-11 border border-input bg-card text-muted-foreground hover:bg-secondary"
                      }
                    >
                      العربية
                    </button>
                    <button
                      type="button"
                      dir="ltr"
                      onClick={() => setLang("en")}
                      aria-pressed={lang === "en"}
                      className={
                        lang === "en"
                          ? "-ms-px h-11 border border-info-700 bg-info-50 font-bold text-info-900"
                          : "-ms-px h-11 border border-input bg-card text-muted-foreground hover:bg-secondary"
                      }
                    >
                      English
                    </button>
                  </div>
                </div>

                {formError && (
                  <Alert variant="destructive" className="rounded-none">
                    <AlertTitle className="font-bold">{formError}</AlertTitle>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="h-11 rounded-none bg-info-700 font-bold text-white hover:bg-info-900"
                  disabled={loading}
                >
                  {loading ? <Trans>Creating account…</Trans> : <Trans>Create account</Trans>}
                </Button>
              </div>
            </form>
          )}

          <p className="mt-6 text-[13px] text-muted-foreground">
            <Trans>
              Already have an account?{" "}
              <Link to="/signin" className="font-bold text-foreground underline">
                Sign in
              </Link>
            </Trans>
          </p>
        </div>
      </main>
    </div>
  )
}
