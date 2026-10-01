/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  disableTransitionOnChange?: boolean
}

type ThemeProviderValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

export const THEME_STORAGE_KEY = "vector-lab:theme"

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"
const THEMES: Theme[] = ["light", "dark", "system"]
const ThemeContext = React.createContext<ThemeProviderValue | undefined>(
  undefined
)

function isTheme(value: string | null): value is Theme {
  return value !== null && THEMES.includes(value as Theme)
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? "dark" : "light"
}

function readTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const storedTheme = window.localStorage.getItem(storageKey)
    return isTheme(storedTheme) ? storedTheme : fallback
  } catch {
    return fallback
  }
}

function writeTheme(storageKey: string, theme: Theme) {
  try {
    window.localStorage.setItem(storageKey, theme)
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.textContent =
    "*,*::before,*::after{transition:none!important;-webkit-transition:none!important}"
  document.head.appendChild(style)
  void window.getComputedStyle(document.documentElement).opacity
  window.setTimeout(() => style.remove(), 0)
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest("input, textarea, select, [contenteditable='true']") !==
        null)
  )
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = THEME_STORAGE_KEY,
  disableTransitionOnChange = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() =>
    readTheme(storageKey, defaultTheme)
  )
  const [systemTheme, setSystemTheme] = React.useState(getSystemTheme)
  const resolvedTheme = theme === "system" ? systemTheme : theme

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      writeTheme(storageKey, nextTheme)
      setThemeState(nextTheme)
    },
    [storageKey]
  )

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY)
    const handleChange = () =>
      setSystemTheme(mediaQuery.matches ? "dark" : "light")

    handleChange()
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  React.useEffect(() => {
    const root = document.documentElement
    if (disableTransitionOnChange) disableTransitionsTemporarily()
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
    root.dataset.theme = resolvedTheme
    root.dataset.themeMode = theme
    root.style.colorScheme = resolvedTheme
  }, [disableTransitionOnChange, resolvedTheme, theme])

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return
      setThemeState(isTheme(event.newValue) ? event.newValue : defaultTheme)
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [defaultTheme, storageKey])

  const handleThemeKeyDown = React.useEffectEvent((event: KeyboardEvent) => {
    if (
      event.repeat ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.key.toLowerCase() !== "d" ||
      isEditableTarget(event.target)
    ) {
      return
    }

    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  })

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleThemeKeyDown(event)

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
