import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Buttons from the design system (Main): 44px tall, square, a hard shadow,
// 15px semibold text. The focus outline comes from styles/motion.css.
const buttonVariants = cva(
  "group/button am-btn inline-flex shrink-0 items-center justify-center gap-2 rounded-none border text-[15px] leading-none font-semibold whitespace-nowrap select-none outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground shadow-sm hover:border-primary-hover hover:bg-primary-hover",
        outline:
          "border-border bg-card text-foreground shadow-sm hover:bg-secondary aria-expanded:bg-secondary",
        secondary:
          "border-border bg-secondary text-foreground shadow-sm hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
        ghost:
          "border-transparent bg-transparent text-primary hover:bg-secondary aria-expanded:bg-secondary",
        destructive:
          "border-border bg-card text-destructive shadow-sm hover:bg-secondary",
        "destructive-soft":
          "border-crit-50 bg-crit-50 text-destructive hover:brightness-95",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      // No button is shorter than 44px; the sizes only change the padding.
      size: {
        default: "h-11 min-w-11 px-4",
        xs: "h-11 min-w-11 px-3",
        sm: "h-11 min-w-11 px-3",
        lg: "h-11 min-w-11 px-5",
        icon: "size-11",
        "icon-xs": "size-11",
        "icon-sm": "size-11",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
