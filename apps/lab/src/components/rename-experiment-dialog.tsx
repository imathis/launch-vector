import { type FormEvent, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { renameExperiment } from "../lib/management-client"
import type { ManagedExperiment } from "../management-contract"

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not rename experiment"
}

export function RenameExperimentDialog({
  experiment,
  onClose,
  onRenamed,
}: {
  experiment: ManagedExperiment
  onClose: () => void
  onRenamed: (experiment: ManagedExperiment) => void
}) {
  const [title, setTitle] = useState(experiment.manifest.title)
  const [slug, setSlug] = useState(experiment.slug)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const renamed = await renameExperiment(experiment, title, slug)
      onRenamed(renamed)
    } catch (renameError) {
      setError(errorMessage(renameError))
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Rename experiment</DialogTitle>
            <DialogDescription>
              Change its display name, URL slug, or both. Existing package
              identity is preserved.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-experiment-title">Experiment name</Label>
              <Input
                id="rename-experiment-title"
                className="min-h-11"
                value={title}
                maxLength={200}
                required
                autoFocus
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rename-experiment-slug">URL slug</Label>
              <Input
                id="rename-experiment-slug"
                className="min-h-11 font-mono"
                value={slug}
                maxLength={64}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                aria-describedby="rename-experiment-slug-help"
                onChange={(event) => setSlug(event.target.value)}
              />
              <p
                id="rename-experiment-slug-help"
                className="text-xs leading-5 text-muted-foreground"
              >
                Lowercase letters, numbers, and single hyphens.
              </p>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={busy} />
              }
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={busy || title.trim() === ""}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
