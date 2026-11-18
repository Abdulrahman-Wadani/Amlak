import { useState } from "react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Check, Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"

/** A password input with the show/hide button at the end. */
export function PasswordInput({
  id,
  value,
  onChange,
  invalid,
  disabled,
  autoComplete = "new-password",
  describedBy,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
  autoComplete?: string
  describedBy?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        dir="ltr"
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        className="pe-[52px]"
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        aria-label={show ? t`Hide password` : t`Show password`}
        aria-pressed={show}
        onClick={() => setShow((s) => !s)}
        className="am-icon absolute end-0 top-0 flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-muted-foreground"
      >
        {show ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
      </button>
    </div>
  )
}

/** The password rules, each ticked green once the password meets it. */
export function PasswordRules({ id, value }: { id: string; value: string }) {
  const rules = [
    { ok: value.length >= 8, label: <Trans>8 characters or more</Trans> },
    { ok: /[A-Z]/.test(value), label: <Trans>Uppercase English letter</Trans> },
    { ok: /[a-z]/.test(value), label: <Trans>Lowercase English letter</Trans> },
    { ok: /[^\p{L}\p{N}\s]/u.test(value), label: <Trans>A symbol such as ! or @</Trans> },
  ]
  return (
    <ul id={id} className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-1.5 p-0 text-[13px] min-[400px]:grid-cols-2">
      {rules.map((rule, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: four fixed rules
        <li key={index} className={`flex items-center gap-1.5 ${rule.ok ? "text-good-700" : "text-muted-foreground"}`}>
          {rule.ok ? (
            <Check aria-hidden="true" className="size-3.5 flex-none" strokeWidth={2} />
          ) : (
            <span aria-hidden="true" className="mx-1 size-1.5 flex-none rounded-full bg-muted-foreground" />
          )}
          <span>
            {rule.label}
            <span className="sr-only">{rule.ok ? t`, done` : t`, not yet`}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export const passwordOk = (value: string) =>
  value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[^\p{L}\p{N}\s]/u.test(value)
