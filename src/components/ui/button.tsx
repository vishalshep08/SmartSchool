import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#2563eb] text-[#ffffff] hover:bg-[#1d4ed8] rounded-[9px] font-heading font-semibold text-[13px] shadow-sm hover:shadow-md active:scale-[0.98]",
        destructive: "bg-[#ef4444] text-[#ffffff] hover:bg-destructive/90 shadow-sm",
        outline: "border border-[#e2e8f0] bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0] rounded-[9px] font-heading font-medium text-[13px] hover:bg-slate-200",
        ghost: "bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0] rounded-[9px] font-heading font-medium text-[13px] hover:bg-slate-200",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-[#2563eb] text-[#ffffff] hover:bg-[#1d4ed8] rounded-[9px] font-heading font-semibold text-[13px] shadow-sm hover:shadow-md active:scale-[0.98]",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
