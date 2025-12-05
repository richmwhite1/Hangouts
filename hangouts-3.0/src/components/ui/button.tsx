import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-[#FF1493] text-black hover:bg-[#FF1493]/90 hover:shadow-lg focus-visible:ring-[#FF1493]/50 shadow-sm",
        destructive:
          "bg-[#ED4956] text-white hover:bg-[#E83946] shadow-sm focus-visible:ring-[#ED4956]/50",
        outline:
          "border border-[#333333] bg-transparent text-foreground hover:bg-[#121212] hover:border-[#404040] focus-visible:ring-[#FF1493]/50",
        secondary:
          "bg-[#121212] border border-[#333333] text-white hover:bg-[#1a1a1a] hover:border-[#404040] shadow-sm focus-visible:ring-[#FF1493]/50",
        ghost:
          "text-foreground hover:bg-[#121212] focus-visible:ring-[#FF1493]/50",
        link: "text-[#FF1493] underline-offset-4 hover:underline"},
      size: {
        default: "h-12 px-5 min-h-[48px]",
        sm: "h-10 rounded-xl gap-1.5 px-4 min-h-[40px] text-sm",
        lg: "h-14 rounded-xl px-7 min-h-[56px]",
        icon: "h-12 w-12 min-h-[48px] min-w-[48px]"}},
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
