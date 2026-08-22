import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useTheme, type Theme } from "@workspace/ui/theme/theme-provider"

const options: { label: string; value: Theme }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className={cn("inline-flex rounded-xl bg-muted p-1", className)}
      role="group"
      aria-label="Color theme"
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={theme === option.value ? "secondary" : "ghost"}
          size="sm"
          className="h-11 px-3"
          aria-pressed={theme === option.value}
          onClick={() => setTheme(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
