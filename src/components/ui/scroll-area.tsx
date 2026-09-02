"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  viewportRef,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  viewportRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("relative flex flex-col", className)}
      {...props}
    >
      <div
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[inherit] outline-none"
      >
        <div data-slot="scroll-area-content">{children}</div>
      </div>
    </div>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical"
}) {
  // Native scrolling is used; ScrollBar is kept as a no-op for API compatibility.
  return null
}

export { ScrollArea, ScrollBar }
