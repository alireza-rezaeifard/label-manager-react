import * as React from "react"
import { cn } from "@/lib/utils"
import { Bubble } from "@/components/ui/bubble"
import { Item, ItemContent, ItemMedia, ItemAction } from "@/components/ui/item"

/** PersianLabs/ui `message` — composable chat message with avatar + content. */
export interface MessagePart {
  id?: string
  type?: "text" | "image" | "file"
  value: string
  url?: string
  name?: string
}

export function Message({
  className,
  align = "start",
  bubbleVariant,
  avatar,
  children,
  footer,
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "end"
  bubbleVariant?: "default" | "primary" | "muted"
  avatar?: React.ReactNode
  footer?: React.ReactNode
}) {
  const variant = bubbleVariant ?? (align === "end" ? "primary" : "default")
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn("flex w-full gap-2", align === "end" && "flex-row-reverse", className)}
    >
      {avatar && (
        <ItemMedia align={align === "end" ? "end" : "start"} className="mt-1">
          {avatar}
        </ItemMedia>
      )}
      <Item className="min-w-0 flex-1 items-start">
        <ItemContent>
          <Bubble variant={variant} align={align} className="whitespace-pre-wrap break-words">
            {children}
          </Bubble>
          {footer && <div className="mt-1 text-xs text-muted-foreground">{footer}</div>}
        </ItemContent>
      </Item>
    </div>
  )
}

/** Renders a list of message parts as text / image / file items. */
export function MessageParts({ parts }: { parts: MessagePart[] }) {
  return (
    <div className="flex flex-col gap-2">
      {parts.map((p, i) => {
        if (p.type === "image" && p.url) {
          return (
            <img key={p.id ?? i} src={p.url} alt={p.name ?? ""} className="max-h-48 rounded-md object-cover" />
          )
        }
        if (p.type === "file" && p.url) {
          return (
            <a
              key={p.id ?? i}
              href={p.url}
              download={p.name}
              className="inline-flex items-center gap-2 rounded-md bg-black/5 px-2 py-1 text-xs underline-offset-2 hover:underline"
            >
              📎 {p.name ?? p.value}
            </a>
          )
        }
        return <span key={p.id ?? i}>{p.value}</span>
      })}
    </div>
  )
}

export default Message