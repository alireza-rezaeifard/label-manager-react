"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  size?: "sm" | "default"
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false)
  const isChecked = checked !== undefined ? checked : internalChecked

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      data-slot="switch"
      data-size={size}
      data-state={isChecked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        if (disabled) return
        const next = !isChecked
        if (checked === undefined) setInternalChecked(next)
        onCheckedChange?.(next)
        props.onClick?.(event)
      }}
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-[background-color,border-color,box-shadow,opacity] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
        className
      )}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[state=checked]/switch:translate-x-[calc(100%-2px)] group-data-[state=unchecked]/switch:translate-x-0 group-data-[state=checked]/switch:rtl:-translate-x-[calc(100%-2px)] dark:group-data-[state=checked]/switch:bg-primary-foreground dark:group-data-[state=unchecked]/switch:bg-foreground"
        )}
      />
    </button>
  )
}

export { Switch }
