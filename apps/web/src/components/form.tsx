
    import { useState, type FormEvent } from "react"
    import { Trans } from "@lingui/react/macro"
    import { S } from "@/lib/dom-style"
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

    interface FormField {
  name: string
  label: string
  type?: string
  hidden?: boolean
  defaultValue?: string
  required?: boolean
  options?: { value: string; label: string }[]
  multiple?: boolean
  accept?: string
}

    interface FormProps {
    fields: FormField[]
    callable: (
        args: Record<string, unknown>,
        values: Record<string, unknown | File[]>

    ) => void | Promise<void>
    args: Record<string, unknown>
    }



    export default function Form({ fields, callable, args }: FormProps) {
const convertValues = (values: Record<string, string>) => {
  return Object.fromEntries(
    fields.map((field) => {
      const value = values[field.name]

      if (value === undefined || value === "") {
        return [field.name, undefined]
      }

      if (field.type === "number") {
        return [field.name, Number(value)]
      }

      return [field.name, value]
    })
  )
}


    const [values, setValues] = useState<Record<string, string>>(
        () =>
        Object.fromEntries(
            fields
            .filter((field) => field.defaultValue !== undefined)
            .map((field) => [field.name, field.defaultValue!])
        )
    )

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault()

  const convertedValues = convertValues(values)

  await callable(...Object.values(args), convertedValues)
  //document.location.href = "/places"
}

    return (
  <div>
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      style={S(
        "display: flex; max-width:50%; min-width:50%; flex-direction: column; gap: 16px; background: #fff; border: 1px solid var(--border); padding: 24px; box-shadow: 2px 2px 0 rgba(27, 36, 48, 0.1)"
      )}
    >
      {fields.map((field) => {
        if (field.hidden) return null

        return (
          <div key={field.name} className="flex flex-col gap-2">
            <Label htmlFor={field.name} className="text-sm font-semibold">
              {field.label}
            </Label>

            {field.type === "select" ? (
              <Select
                value={values[field.name] as string || ""}
                onValueChange={(value) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.name]: value,
                  }))
                }
              >
                <SelectTrigger>
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
                value={values[field.name] as string || ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.name]: e.target.value,
                  }))
                }
              />
            ) : field.type === "file" ? (
              <Input
                id={field.name}
                name={field.name}
                type="file"
                accept={field.accept}
                multiple={field.multiple}
                required={field.required}
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])

                  setValues((prev) => ({
                    ...prev,
                    [field.name]: files,
                  }))
                }}
              />
            ) : (
              <Input
                id={field.name}
                name={field.name}
                type={field.type || "text"}
                required={field.required}
                value={values[field.name] as string || ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.name]: e.target.value,
                  }))
                }
              />
            )}
          </div>
        )
      })}

      <Button type="submit" className="w-full">
        <Trans>Save</Trans>
      </Button>
    </form>
  </div>
)
    }
