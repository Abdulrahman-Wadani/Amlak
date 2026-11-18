import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-none border border-input bg-card px-3.5 py-2.5 text-[15px] text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(77,114,150,0.2)] focus-visible:outline-none read-only:bg-secondary disabled:cursor-not-allowed disabled:bg-secondary disabled:opacity-50 aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_rgba(163,58,43,0.15)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
