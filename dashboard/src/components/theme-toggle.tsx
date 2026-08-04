import { useCallback, useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function getInitialTheme(): "dark" | "light" {
  const stored = localStorage.getItem("reui-theme")
  if (stored === "dark" || stored === "light") return stored
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark"
}

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("reui-theme", theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"))
  }, [])

  return { theme, toggle }
}

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "dark" | "light"
  onToggle: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
