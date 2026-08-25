import * as React from "react"
import { cn } from "@/lib/utils"

/** PersianLabs/ui `item` — a flexible layout row for content, media, or action. */
export function Item({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return <li data-slot="item" className={cn("group/item flex items-center gap-3", className)} {...props} />
}

export function ItemMedia({
  className,
  align = "start",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "center" | "end" }) {
  return (
    <div
      data-slot="item-media"
      className={cn(
        "shrink-0",
        align === "start" && "self-start",
        align === "center" && "self-center",
        align === "end" && "self-end",
        className
      )}
      {...props}
    />
  )
}

export function ItemContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="item-content" className={cn("min-w-0 flex-1", className)} {...props} />
}

export function ItemDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="item-description"
      className={cn("mt-0.5 line-clamp-2 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export function ItemAction({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="item-action"
      className={cn("shrink-0 opacity-60 transition-opacity group-hover/item:opacity-100", className)}
      {...props}
    />
  )
}

export { Item as default }