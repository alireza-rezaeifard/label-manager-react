"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value = 0,
  max = 100,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / (max || 100)) * 100))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      data-slot="progress"
      className={cn("w-full", className)}
      {...props}
    >
      <div
        data-slot="progress-track"
        className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20"
      >
        <div
          data-slot="progress-indicator"
          className="h-full w-full flex-1 bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export { Progress }
