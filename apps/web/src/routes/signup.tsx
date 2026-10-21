import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { type SubmitEvent, useState } from "react"
import { signUpInput } from '@/lib/validators'
import { useAuth } from '@/lib/auth'
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute('/signup')({
  component: SignUp,
})

type Fieldkey = "fullname" | "email" | "phone" | "password"

function SignUp() {
  const [fullname, setFullname] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Partial<Record<Fieldkey, string>>>({})
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"register" | "verify">("register")
  const [code, setCode] = useState("")
  const { register, verifyCode, resendCode, login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>){
    e.preventDefault()
    const result = signUpInput.safeParse({ fullname, email, phone, password })
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
    setFormError("")
    setLoading(true)
    register(email, fullname, phone, password)
      .then(() => {
        setStep("verify")
      })
      .catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : "Registration faild")
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
        navigate({ to: "/home" })
      })
      .catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : "Verification failed")
      })
      .finally(() => {
        setLoading(false)
      })
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[420px] rounded-xl p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-extrabold">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your details to create your account.
          </p>
        </div>

        {step === "verify" ? (
          <form onSubmit={handleVerify} noValidate>
            <div className="flex flex-col gap-5">
              <p className="text-sm">
                We sent a 6-digit code to <span className="font-bold">{email}</span>.
              </p>

              <div className="flex flex-col gap-2">
                <Label htmlFor="code" className="text-sm font-bold">
                  Verification code
                </Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  placeholder="123456"
                  className="h-[42px]"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                />
              </div>

              {formError && (
                <Alert variant="destructive">
                  <AlertTitle>{formError}</AlertTitle>
                </Alert>
              )}

              <Button type="submit" className="h-[42px] font-bold" disabled={loading}>
                {loading ? "Verifying…" : "Verify and sign in"}
              </Button>

              <button
                type="button"
                className="text-sm text-info-700 hover:underline"
                onClick={() => void resendCode(email)}
              >
                Resend code
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fullname" className="text-sm font-bold">
                  Full name
                </Label>
                <Input
                  id="fullname"
                  placeholder="Ahmed Hamad"
                  className="h-[42px]"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  disabled={loading}
                />
                {errors.fullname && (
                  <Alert variant="destructive">
                    <AlertTitle>{errors.fullname}</AlertTitle>
                  </Alert>
                )}
              </div>

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
                <Label htmlFor="phone" className="text-sm font-bold">
                  Phone
                </Label>
                <Input
                  id="phone"
                  placeholder="+966512345678"
                  className="h-[42px]"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
                {errors.phone && (
                  <Alert variant="destructive">
                    <AlertTitle>{errors.phone}</AlertTitle>
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
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="text-info-700 hover:underline">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  )
}
