import { useSyncExternalStore } from "react"

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {}
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
  window.addEventListener("storage", cb)
  return () => {
    mo.disconnect()
    window.removeEventListener("storage", cb)
  }
}

function getSnapshot() {
  return typeof document === "undefined"
    ? "light"
    : document.documentElement.getAttribute("data-theme") || "light"
}

/** Lightweight hook exposing the active theme and its primary color. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light")
  const isDark = theme === "dark"
  const primary = isDark ? "#2dd4bf" : "#0f766e"
  return { theme, isDark, primary }
}

export default useTheme