import * as React from "react"
import { cn } from "@/lib/utils"

/** PersianLabs/ui `toman-icon` — a Toman (﷼) symbol rendered as an SVG. */
export function TomanIcon({
  className,
  size = 16,
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label="Toman"
      className={cn("shrink-0", className)}
      {...props}
    >
      <path d="M6 3.5c.6 0 1 .4 1 1v5.2c.7-1 1.9-1.6 3.2-1.6 2.7 0 4.8 2.2 4.8 5s-2.1 5-4.8 5c-1.3 0-2.5-.6-3.2-1.6v.1c0 .6-.4 1-1 1s-1-.4-1-1V4.5c0-.6.4-1 1-1zm4 10.4c0 1.6 1.2 2.9 2.8 2.9s2.8-1.3 2.8-2.9-1.2-2.9-2.8-2.9-2.8 1.3-2.8 2.9zm7-3.4V4.5c0-.6.4-1 1-1s1 .4 1 1v6c0 1-1.5 2-3.5 2-.6 0-1-.4-1-1s.4-1 1-1c1.5 0 2.5-.4 2.5-1z" />
    </svg>
  )
}

export default TomanIcon