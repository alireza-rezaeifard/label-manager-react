"use client"

import { ChevronDownIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Lightweight, accessible select built on the native <select> element.
 * Supports the same exported API as the previous wrapper; direction is
 * inherited automatically from the document (native selects handle RTL).
 */
interface SelectContextValue {
  value: unknown
  onValueChange?: (value: string) => void
}
const SelectContext = React.createContext<SelectContextValue>({})

function Select({
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const currentValue = value !== undefined ? value : internalValue
  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: (next) => {
          if (value === undefined) setInternalValue(next)
          onValueChange?.(next)
        },
      }}
    >
      <div data-slot="select" {...props} />
    </SelectContext.Provider>
  )
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { value, onValueChange } = React.useContext(SelectContext)
  return (
    <div className="relative flex w-full items-center" data-slot="select-trigger-wrapper">
      <select
        data-slot="select-trigger"
        value={(value as string) ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(
          "flex h-8 w-full appearance-none items-center justify-between gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[placeholder]:text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute end-2 size-4 text-muted-foreground" />
    </div>
  )
}

function SelectValue({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) {
  return <option value="" hidden>{placeholder ?? children}</option>
}

function SelectContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function SelectItem({
  className,
  value,
  children,
  ...props
}: React.OptionHTMLAttributes<HTMLOptionElement> & { value: string }) {
  return (
    <option
      data-slot="select-item"
      className={cn("bg-popover text-foreground", className)}
      value={value}
      {...props}
    >
      {children}
    </option>
  )
}

function SelectGroup(props: React.OptgroupHTMLAttributes<HTMLOptGroupElement>) {
  return <optgroup data-slot="select-group" {...props} />
}

function SelectGroupLabel(props: React.HTMLAttributes<HTMLElement>) {
  return <div data-slot="select-group-label" {...props} />
}

function SelectSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="select-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}