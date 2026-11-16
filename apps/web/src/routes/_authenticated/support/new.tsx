import { useEffect, useState, type SubmitEvent } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { CircleAlert } from "lucide-react"
import { cn } from "cn"
import type { Place } from "@amlak/shared"
import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { createSupportTicket } from "@/lib/api"
import { assetInput } from "@/lib/validators"
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
import Form from "@/components/form"


export const Route = createFileRoute("/_authenticated/support/new")({
  component: AddAsset,
  validateSearch: (search: Record<string, unknown>) => ({
    place_id: typeof search.place_id === "string" ? search.place_id : "",
  }),
})

function AddAsset() {
  const { accessToken } = useAuth()
  const [subject, setsubject] = useState("")
  const [description, setdescription] = useState("")
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)

  const errorText =
    "flex items-center gap-1.5 text-[13px] leading-5 text-crit-900"

  return (
    <center>
    <div
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 640px"
      )}
    >
      <h1 style={S("font-size: 30px; font-weight: 800; margin: 0")}>
        <Trans>Add asset</Trans>
      </h1>
      <Form
        fields={[
          { name: "subject", label: t`subject`, type: "text"},
          { name: "description", label: t`description`, type: "text" },
        ]}
        callable={createSupportTicket}
        args={{token:accessToken}}
        redirect_to="/support"
      />
    </div>
  </center>
  )
}
