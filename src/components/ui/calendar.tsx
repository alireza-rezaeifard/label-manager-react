"use client"

import * as React from "react"
import { DayPicker } from "@daypicker/persian"
import { faIR } from "@daypicker/persian"
import { toJalaliDate } from "@/utils/formatters"
import { cn } from "@/lib/utils"

export interface CalendarProps {
  /** Selected value (ISO string). */
  value?: string | null
  /** Called with the selected value as an ISO (Gregorian) string. */
  onChange?: (iso: string | null) => void
  defaultValue?: string | null
  className?: string
}

/**
 * PersianLabs/ui‑style `calendar` — a Jalali date picker used in forms.
 * Wraps the installed `@daypicker/persian` (fa‑IR) picker and emits ISO dates.
 */
export function Calendar({
  value,
  defaultValue = null,
  onChange,
  className,
}: CalendarProps) {
  const [internal, setInternal] = React.useState<string | null>(
    defaultValue ? String(defaultValue) : null
  )
  const selected = value !== undefined ? value : internal

  const selectedDate = React.useMemo(() => {
    if (!selected) return undefined
    const d = new Date(selected)
    return isNaN(d.getTime()) ? undefined : d
  }, [selected])

  return (
    <div className={cn("rounded-xl border border-border bg-card p-3 shadow-sm", className)}>
      <DayPicker
        mode="single"
        locale={faIR}
        selected={selectedDate}
        onSelect={(date?: Date) => {
          const iso = date ? toJalaliDate(date) : null
          setInternal(iso)
          onChange?.(iso)
        }}
        dir="rtl"
      />
    </div>
  )
}

export default Calendar