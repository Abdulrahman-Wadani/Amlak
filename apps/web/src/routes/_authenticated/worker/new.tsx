
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState, type FormEvent } from "react"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { CircleAlert, UserPlus } from "lucide-react"

import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { createWorker } from "@/lib/api"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/worker/new")({
  component: AddWorker,
})

function AddWorker() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  const [fullname, setFullname] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [language, setLanguage] = useState("")

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!accessToken) return

    const newErrors: Record<string, string> = {}

    if (!fullname.trim()) {
      newErrors.fullname = t`Full name is required.`
    }

    if (!email.trim()) {
      newErrors.email = t`Email is required.`
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t`Enter a valid email address.`
    }

    if (!phone.trim()) {
      newErrors.phone = t`Phone number is required.`
    } else if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      newErrors.phone = t`Enter a valid phone number in E.164 format (e.g. +966501234567).`
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setFormError("")
    setLoading(true)

    try {
      const payload = {
        fullname: fullname.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        ...(language ? { preferred_language: language } : {}),
      }

      await createWorker(accessToken, payload)

      void navigate({ to: "/workers" })
    } catch (error) {
      console.error("Create worker error:", error)

      setFormError(
        error instanceof Error
          ? error.message
          : t`Could not create the worker. Please try again.`,
      )
    } finally {
      setLoading(false)
    }
  }

  const errorText =
    "flex items-center gap-1.5 text-[13px] leading-5 text-crit-900"

  return (
    <div
      style={S(
        "width: 100%; min-height: calc(100vh - 64px); display: flex; justify-content: center; align-items: center; padding: 40px 24px",
      )}
    >
      <div
        style={S(
          "width: 100%; max-width: 560px; display: flex; flex-direction: column; gap: 24px",
        )}
      >
        <div>
          <h1 style={S("font-size: 30px; font-weight: 800; margin: 0")}>
            <Trans>Add worker</Trans>
          </h1>

          <p
            style={S(
              "color: var(--muted-foreground); font-size: 14px; margin-top: 8px",
            )}
          >
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={S(
            "display: flex; flex-direction: column; gap: 20px; background: #fff; border: 1px solid var(--border); padding: 24px; box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.1)",
          )}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullname" className="text-sm font-semibold">
              <Trans>Full name</Trans>
            </Label>

            <Input
              id="fullname"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              placeholder={t`Enter worker's full name`}
              aria-invalid={Boolean(errors.fullname)}
            />

            {errors.fullname && (
              <p className={errorText}>
                <CircleAlert size={14} />
                {errors.fullname}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-semibold">
              <Trans>Email address</Trans>
            </Label>

            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="worker@example.com"
              aria-invalid={Boolean(errors.email)}
            />

            {errors.email && (
              <p className={errorText}>
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
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+966501234567"
              aria-invalid={Boolean(errors.phone)}
            />

            {errors.phone && (
              <p className={errorText}>
                <CircleAlert size={14} />
                {errors.phone}
              </p>
            )}

          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="language" className="text-sm font-semibold">
              <Trans>Preferred language</Trans>
            </Label>

            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" style={S("width: 100%; height: 40px")}>
                <SelectValue placeholder={t`Use my preferred language`} />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ar">
                  <Trans>Arabic</Trans>
                </SelectItem>
                <SelectItem value="en">
                  <Trans>English</Trans>
                </SelectItem>
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground">
            </p>
          </div>

          {formError && (
            <p className={errorText}>
              <CircleAlert size={14} />
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              to="/workers"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Trans>Cancel</Trans>
            </Link>

            <Button type="submit" disabled={loading}>
              {loading ? (
                <Trans>Sending invitation...</Trans>
              ) : (
                <>
                  <UserPlus size={16} />
                  <Trans>Create worker</Trans>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
