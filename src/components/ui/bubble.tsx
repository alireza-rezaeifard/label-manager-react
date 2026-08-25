import * as React from "react"
import { cn } from "@/lib/utils"

/** PersianLabs/ui `bubble` — a chat message bubble container. */
export function Bubble({
  className,
  variant = "default",
  align = "start",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "primary" | "muted"
  align?: "start" | "end"
}) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(
        "inline-flex max-w-[85%] items-start gap-2 rounded-2xl px-3.5 py-2 text-sm",
        align === "start" && "rounded-tl-md",
        align === "end" && "rounded-tr-md",
        variant === "default" && "bg-muted text-foreground",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "muted" && "bg-muted/60 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export default Bubble