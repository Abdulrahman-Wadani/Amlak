import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"
import type * as React from "react"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-none border border-input bg-card px-3.5 text-[15px] text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(77,114,150,0.2)] focus-visible:outline-none read-only:bg-secondary read-only:text-muted-foreground disabled:cursor-not-allowed disabled:bg-secondary disabled:opacity-50 aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_rgba(163,58,43,0.15)] file:inline-flex file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
