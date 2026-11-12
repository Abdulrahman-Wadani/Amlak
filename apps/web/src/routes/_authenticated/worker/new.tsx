
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
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 850px",
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
          <Trans>
            Add a worker to your team. An invitation email will be sent to them.
          </Trans>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        style={S(
          "display: flex; flex-direction: column; gap: 20px; background: #fff; border: 1px solid var(--border); padding: 24px; box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.1)",
        )}
      >
        {/* Full name */}
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

        {/* Email */}
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

          <p className="text-xs text-muted-foreground">
            <Trans>The email address must be unique.</Trans>
          </p>
        </div>

        {/* Phone */}
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

          <p className="text-xs text-muted-foreground">
            <Trans>
              Include the country code. Example: +966501234567.
            </Trans>
          </p>
        </div>

        {/* Preferred language */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="language" className="text-sm font-semibold">
            <Trans>Preferred language</Trans>
          </Label>

          <Select
            value={language}
            onValueChange={(value) => setLanguage(String(value))}
          >
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
            <Trans>
              Optional. If not selected, your preferred language will be used.
            </Trans>
          </p>
        </div>

        {formError && (
          <p className={errorText}>
            <CircleAlert size={14} />
            {formError}
          </p>
        )}

        {/* Actions */}
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

      {/* Invitation information */}
      <section
        style={S(
          "display: flex; flex-direction: column; gap: 10px; background: var(--muted); border: 1px solid var(--border); padding: 20px",
        )}
      >
        <h2 style={S("font-size: 15px; font-weight: 700; margin: 0")}>
          <Trans>What happens next?</Trans>
        </h2>

        <ul className="list-disc ps-5 text-sm text-muted-foreground space-y-2">
          <li>
            <Trans>The worker account will be created with invited status.</Trans>
          </li>
          <li>
            <Trans>An invitation email will be sent to the worker.</Trans>
          </li>
          <li>
            <Trans>
              The invitation link will be valid for 7 days.
            </Trans>
          </li>
          <li>
            <Trans>
              The worker can set up their password using the invitation link.
            </Trans>
          </li>
        </ul>
      </section>
    </div>
  )
}
