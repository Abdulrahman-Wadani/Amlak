
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import Form from "@/components/form"
import { S } from "@/lib/dom-style"

export const Route = createFileRoute("/account-setup")({
  component: AccountSetupPage,
})

interface AccountSetupValues {
  password: string
  confirm_password: string
}

function AccountSetupPage() {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const isArabic = lang === "ar"

  const params = new URLSearchParams(window.location.search)
  const email = params.get("email") ?? ""
  const token = params.get("token") ?? ""

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const messages = {
    title: isArabic ? "إعداد حسابك" : "Set Up Your Account",
    description: isArabic
      ? "مرحباً بك! أنشئ كلمة مرور لتفعيل حسابك والبدء باستخدام النظام."
      : "Welcome! Create a password to activate your account and get started.",
    email: isArabic ? "البريد الإلكتروني" : "Email Address",
    password: isArabic ? "كلمة المرور" : "Password",
    confirmPassword: isArabic
      ? "تأكيد كلمة المرور"
      : "Confirm Password",
    passwordPlaceholder: isArabic
      ? "أدخل كلمة المرور"
      : "Enter your password",
    confirmPlaceholder: isArabic
      ? "أعد إدخال كلمة المرور"
      : "Re-enter your password",
    submit: isArabic ? "تفعيل الحساب" : "Activate Account",
    submitting: isArabic ? "جارٍ تفعيل الحساب..." : "Activating Account...",
    invalidLink: isArabic
      ? "رابط الدعوة غير صالح أو لا يحتوي على البيانات المطلوبة."
      : "The invitation link is invalid or missing required information.",
    passwordRequired: isArabic
      ? "كلمة المرور مطلوبة."
      : "Password is required.",
    passwordLength: isArabic
      ? "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل."
      : "Password must be at least 8 characters.",
    passwordMismatch: isArabic
      ? "كلمتا المرور غير متطابقتين."
      : "Passwords do not match.",
    failed: isArabic
      ? "تعذر تفعيل الحساب. قد يكون الرابط خاطئاً أو منتهياً أو مستخدماً."
      : "Unable to activate your account. The link may be invalid, expired, or already used.",
    activated: isArabic
      ? "تم تفعيل حسابك بنجاح!"
      : "Your account has been activated successfully!",
    activatedDescription: isArabic
      ? "يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني وكلمة المرور."
      : "You can now log in using your email and password.",
    login: isArabic ? "الانتقال إلى تسجيل الدخول" : "Go to Login",
    invalidResponse: isArabic
      ? "حدث خطأ غير متوقع. حاول مرة أخرى."
      : "Something went wrong. Please try again.",
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

  async function handleSubmit(values: AccountSetupValues) {
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
        data?.message || messages.invalidResponse,
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
        dir={isArabic ? "rtl" : "ltr"}
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
      dir={isArabic ? "rtl" : "ltr"}
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
              <Form
                args={{}}
                callable={handleSubmit}
                fields={fields}
              />
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
