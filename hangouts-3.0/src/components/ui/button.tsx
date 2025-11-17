import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-[#2563EB] text-white hover:bg-[#1D4ED8] hover:shadow-lg focus-visible:ring-[#2563EB]/50 shadow-sm",
        destructive:
          "bg-[#ED4956] text-white hover:bg-[#E83946] shadow-sm focus-visible:ring-[#ED4956]/50",
        outline:
          "border border-[#262626] bg-transparent text-foreground hover:bg-[#121212] hover:border-[#3d3d3d] focus-visible:ring-[#2563EB]/50",
        secondary:
          "bg-[#262626] text-foreground hover:bg-[#2a2a2a] shadow-sm focus-visible:ring-[#2563EB]/50",
        ghost:
          "text-foreground hover:bg-[#121212] focus-visible:ring-[#2563EB]/50",
        link: "text-[#2563EB] underline-offset-4 hover:underline"},
      size: {
        default: "h-11 px-5 py-2.5 min-h-[44px]",
        sm: "h-9 rounded-sm gap-1.5 px-4 min-h-[36px]",
        lg: "h-12 rounded-sm px-7 min-h-[48px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]"}},
    defaultVariants: {
      variant: "default",
      size: "default"}}
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
