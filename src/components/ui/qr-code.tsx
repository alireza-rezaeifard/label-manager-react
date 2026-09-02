"use client"

import { useEffect, useRef, useState } from "react"
import QRCodeLib from "qrcode"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface QrCodeProps {
  /** The value to encode. */
  value: string
  /** Pixel size of the square canvas. @default 160 */
  size?: number
  /** Error correction level. @default "M" */
  level?: "L" | "M" | "Q" | "H"
  /** Foreground (module) color. @default "#000000" */
  fgColor?: string
  /** Background color. @default "#ffffff" */
  bgColor?: string
  className?: string
}

/**
 * A QR code generator. PersianLabs/ui `qr-code`.
 * Renders to a canvas via the installed `qrcode` package, with a skeleton
 * placeholder while the matrix is being drawn.
 */
export function QrCode({
  value,
  size = 160,
  level = "M",
  fgColor = "#000000",
  bgColor = "#ffffff",
  className,
}: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    if (!canvasRef.current || !value) {
      // Reset readiness only when a previous render had set it (avoids
      // setState-in-effect cascading renders).
      setReady(prev => (prev ? false : prev))
      return
    }
    QRCodeLib.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 1,
        errorCorrectionLevel: level,
        color: { dark: fgColor, light: bgColor },
      },
      (err) => {
        if (!active) return
        if (!err) setReady(true)
      }
    )
    return () => {
      active = false
    }
  }, [value, size, level, fgColor, bgColor])

  return (
    <div className={cn("relative inline-flex", className)}>
      {!ready && <Skeleton className="absolute inset-0 rounded-md" />}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="block"
        role="img"
        aria-label="QR code"
      />
    </div>
  )
}

export default QrCode