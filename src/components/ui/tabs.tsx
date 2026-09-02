"use client"

import { cva } from "class-variance-authority"
import { motion } from "framer-motion"
import * as React from "react"

import { cn } from "@/lib/utils"

const tabsListVariants = cva(
  "relative inline-flex items-center data-[orientation=vertical]:flex-col",
  {
    variants: {
      variant: {
        default: "w-fit gap-1 rounded-lg bg-muted p-1 text-muted-foreground",
        rounded: "w-fit gap-1 rounded-full bg-muted p-1 text-muted-foreground",
        line: "w-full gap-4 border-b border-border text-muted-foreground",
        ghost: "w-fit gap-1 text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

const tabsTriggerVariants = cva(
  "relative inline-flex h-7 items-center justify-center gap-1.5 px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "rounded-md text-muted-foreground data-[active]:text-primary-foreground",
        rounded: "rounded-full text-muted-foreground data-[active]:text-primary-foreground",
        line: "h-9 rounded-none px-1 pb-3 text-muted-foreground data-[active]:text-foreground",
        ghost: "rounded-lg text-muted-foreground data-[active]:text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

const indicatorStylesByVariant = {
  default: { className: "bg-primary shadow-sm", radius: 8 },
  rounded: { className: "bg-primary shadow-sm", radius: 999 },
  line: { className: "bg-primary", radius: 2 },
  ghost: { className: "bg-muted", radius: 8 },
} as const

type TabsVariant = keyof typeof indicatorStylesByVariant

const staticActiveStylesByVariant: Record<TabsVariant, string> = {
  default: "data-[active]:bg-primary data-[active]:shadow-sm",
  rounded: "data-[active]:bg-primary data-[active]:shadow-sm",
  line: "",
  ghost: "data-[active]:bg-muted",
}

interface TabsContextValue {
  activeValue: unknown
  variant: TabsVariant
  onValueChange?: (value: string) => void
}
const TabsContext = React.createContext<TabsContextValue | null>(null)
const TabsIndicatorMeasuredContext = React.createContext(false)

function useTabsContext(component: string) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error(`${component} must be used within <Tabs>.`)
  return context
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  variant?: TabsVariant
  orientation?: "horizontal" | "vertical"
}

function Tabs({
  className,
  defaultValue,
  value,
  onValueChange,
  variant = "default",
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "")
  const activeValue = value !== undefined ? value : uncontrolledValue

  return (
    <TabsContext.Provider value={{ activeValue, variant, onValueChange }}>
      <div data-slot="tabs" className={className} {...props} />
    </TabsContext.Provider>
  )
}

interface IndicatorRect {
  x: number
  y: number
  width: number
  height: number
}

function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { activeValue, variant } = useTabsContext("TabsList")
  const listRef = React.useRef<HTMLDivElement>(null)
  const [rect, setRect] = React.useState<IndicatorRect | null>(null)

  React.useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    function measure() {
      const activeTrigger = list?.querySelector<HTMLElement>(
        '[data-slot="tabs-trigger"][data-active]'
      )
      if (!activeTrigger) { setRect(null); return }
      if (variant === "line") {
        setRect({
          x: activeTrigger.offsetLeft, y: activeTrigger.offsetTop + activeTrigger.offsetHeight - 2,
          width: activeTrigger.offsetWidth, height: 2,
        })
        return
      }
      setRect({
        x: activeTrigger.offsetLeft, y: activeTrigger.offsetTop,
        width: activeTrigger.offsetWidth, height: activeTrigger.offsetHeight,
      })
    }
    measure()
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(list)
    return () => resizeObserver.disconnect()
  }, [activeValue, variant])

  const indicatorStyle = indicatorStylesByVariant[variant]

  return (
    <div
      ref={listRef}
      role="tablist"
      data-slot="tabs-list"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      <TabsIndicatorMeasuredContext.Provider value={rect !== null}>
        {rect && (
          <motion.span
            data-slot="tabs-indicator"
            className={cn("absolute top-0 left-0", indicatorStyle.className)}
            style={{ borderRadius: indicatorStyle.radius }}
            initial={false}
            animate={{ x: rect.x, y: rect.y, width: rect.width, height: rect.height }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
          />
        )}
        {children}
      </TabsIndicatorMeasuredContext.Provider>
    </div>
  )
}

function TabsTrigger({
  className,
  value,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const { activeValue, variant, onValueChange } = useTabsContext("TabsTrigger")
  const measured = React.useContext(TabsIndicatorMeasuredContext)
  const isActive = activeValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-slot="tabs-trigger"
      data-value={value}
      data-active={isActive ? "" : undefined}
      onClick={() => onValueChange?.(value)}
      className={cn(
        tabsTriggerVariants({ variant }),
        !measured && staticActiveStylesByVariant[variant],
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  children,
  value: _value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: string }) {
  return (
    <div
      role="tabpanel"
      data-slot="tabs-content"
      className="focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      {...props}
    >
      <motion.div
        className={className}
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </div>
  )
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  tabsListVariants,
  tabsTriggerVariants,
}
export type { TabsVariant }