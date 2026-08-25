"use client"

import React from "react"

import { Input } from "@/components/ui/input"
import { toEnDigits } from "@/lib/persianDate"

export interface BankInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "value" | "defaultValue" | "onChange" | "type" | "maxLength"
  > {
  /** The IBAN string (with or without separators / IR prefix). */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  onChange?: (value: string) => void
  /** Whether to prepend "IR" automatically. @default true */
  irPrefix?: boolean
}

/**
 * PersianLabs/ui `bank-input` — an IBAN input that masks and groups the
 * account number into 4‑character blocks (e.g. IR12 3456 7890 ...), with
 * Persian/Arabic‑Indic digit support.
 */
function BankInput({
  value,
  defaultValue = "",
  onChange,
  irPrefix = true,
  className,
  ...props
}: BankInputProps) {
  const [internal, setInternal] = React.useState<string>(normalize(defaultValue, irPrefix))
  const current = value !== undefined ? normalize(value, irPrefix) : internal

  function normalize(raw: string, prefix: boolean): string {
    const digits = toEnDigits(raw).replace(/[^0-9]/g, "")
    const body = digits.replace(/^IR/, "")
    const grouped = body.replace(/(.{4})/g, "$1 ").trim()
    return prefix ? `IR ${grouped}` : grouped
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = normalize(e.target.value, irPrefix)
    setInternal(next)
    // emit the clean, separators‑stripped value
    onChange?.(toEnDigits(next).replace(/\s/g, ""))
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={current}
      onChange={handleChange}
      placeholder={irPrefix ? "IR 0000 0000 0000 0000 0000 00" : "0000 0000 0000 ..."}
      maxLength={irPrefix ? 26 : 24}
      className={className}
      {...props}
    />
  )
}

export { BankInput }