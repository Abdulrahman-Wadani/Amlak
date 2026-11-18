import { useState, type FormEvent, type ReactNode } from "react"
import { Trans } from "@lingui/react/macro"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** A submitted value: text, a number (type "number"), files (type "file"), or nothing. */
export type FormValue = string | number | File[] | undefined
export type FormValues = Record<string, FormValue>

export interface FormField {
  name: string
  label: string
  /** An input type, or "select", "textarea" or "file". Defaults to "text". */
  type?: string
  hidden?: boolean
  defaultValue?: string
  required?: boolean
  options?: { value: string; label: ReactNode }[]
  multiple?: boolean
  accept?: string
}

interface FormProps {
  fields: FormField[]
  /** Gets the values by field name: empty fields are undefined, numbers are numbers. */
  onSubmit: (values: FormValues) => void | Promise<void>
}

type RawValues = Record<string, string | File[]>

/** Turns what the inputs hold into what onSubmit receives. */
export function convertValues(fields: FormField[], raw: RawValues): FormValues {
  return Object.fromEntries(
    fields.map((field) => {
      const value = raw[field.name]
      if (value === undefined || value === "") return [field.name, undefined]
      if (Array.isArray(value)) return [field.name, value]
      if (field.type === "number") return [field.name, Number(value)]
      return [field.name, value]
    }),
  )
}

export default function Form({ fields, onSubmit }: FormProps) {
  const [values, setValues] = useState<RawValues>(() =>
    Object.fromEntries(
      fields
        .filter((field) => field.defaultValue !== undefined)
        .map((field) => [field.name, field.defaultValue ?? ""]),
    ),
  )

  const text = (name: string) => {
    const value = values[name]
    return typeof value === "string" ? value : ""
  }

  const set = (name: string, value: string | File[]) =>
    setValues((prev) => ({ ...prev, [name]: value }))

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await onSubmit(convertValues(fields, values))
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="box-border flex w-full min-w-0 flex-col gap-5 border border-border bg-card p-7 shadow-sm"
      >
        {fields.map((field) => {
          if (field.hidden) return null

          return (
            <div key={field.name} className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={field.name} className="text-sm font-semibold">
                {field.label}
              </Label>

              {field.type === "select" ? (
                <Select
                  value={text(field.name)}
                  onValueChange={(value) => set(field.name, value ?? "")}
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder={field.label} />
                  </SelectTrigger>

                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  name={field.name}
                  rows={10}
                  required={field.required}
                  value={text(field.name)}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              ) : field.type === "file" ? (
                <Input
                  id={field.name}
                  name={field.name}
                  type="file"
                  accept={field.accept}
                  multiple={field.multiple}
                  required={field.required}
                  onChange={(e) => set(field.name, Array.from(e.target.files || []))}
                />
              ) : (
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type || "text"}
                  required={field.required}
                  value={text(field.name)}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              )}
            </div>
          )
        })}

        <Button type="submit" className="w-full desk:w-auto desk:self-start">
          <Trans>Save</Trans>
        </Button>
      </form>
    </div>
  )
}
