"use client"

import React from "react"

import { Input } from "@/components/ui/input"
import { useControllableState } from "@/hooks/useControllableState"
import { toEnDigits } from "@/lib/persianDate"

export interface PriceInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "value" | "defaultValue" | "onChange" | "type"
  > {
  /** The numeric value. Use when controlled. */
  value?: number | null
  /** The initial numeric value when uncontrolled. */
  defaultValue?: number | null
  /** Called with the numeric value whenever it changes. */
  onValueChange?: (value: number | null) => void
  /** The minimum allowed value, applied on blur. */
  min?: number
  /** The maximum allowed value, applied on blur. */
  max?: number
  /** The locale used to group digits as you type. @default "en-US" */
  locale?: Intl.LocalesArgument
}

function clamp(value: number, min?: number, max?: number) {
  let next = value
  if (min !== undefined) next = Math.max(next, min)
  if (max !== undefined) next = Math.min(next, max)
  return next
}

function formatValue(value: number | null, locale: Intl.LocalesArgument) {
  if (value === null) return ""
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

/**
 * A text input that live-formats digits as a grouped price as you type,
 * with support for Persian/Arabic-Indic numerals. PersianLabs/ui `price-input`.
 */
function PriceInput({
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  locale = "en-US",
  placeholder = "0",
  className,
  onBlur,
  ...props
}: PriceInputProps) {
  const [numericValue, setNumericValue] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
    caller: "PriceInput",
  })

  const [text, setText] = React.useState<string>(() =>
    formatValue(numericValue, locale)
  )

  React.useEffect(() => {
    setText(formatValue(numericValue, locale))
  }, [numericValue, locale])

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = toEnDigits(event.target.value).replace(/[^\d]/g, "")
    const next = raw ? Number(raw) : null
    setNumericValue(next)
    setText(next === null ? "" : formatValue(next, locale))
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (numericValue !== null) {
      const clamped = clamp(numericValue, min, max)
      if (clamped !== numericValue) {
        setNumericValue(clamped)
        setText(formatValue(clamped, locale))
      } else {
        setText(formatValue(numericValue, locale))
      }
    }
    onBlur?.(event)
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  )
}

export { PriceInput }