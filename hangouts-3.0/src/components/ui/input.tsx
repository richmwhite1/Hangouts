import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      suppressHydrationWarning
      className={cn(
        "file:text-foreground placeholder:text-[#8E8E8E] selection:bg-[#2563EB] selection:text-white bg-[#121212] border-[#262626] text-[#FAFAFA] flex h-12 w-full min-w-0 rounded-sm border px-4 py-3 text-base shadow-none transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#2563EB] focus-visible:bg-[#1a1a1a] focus-visible:ring-2 focus-visible:ring-[#2563EB]/20",
        "aria-invalid:ring-[#ED4956]/20 aria-invalid:border-[#ED4956]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
