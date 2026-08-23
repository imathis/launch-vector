import { type DragEvent, useEffect, useRef, useState } from "react"
import { Upload } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import {
  importExperiment,
  loadExperimentInventory,
} from "../lib/management-client"
import type { ImportConflict } from "../management-contract"

type ImportState =
  | { kind: "idle" }
  | { kind: "importing" }
  | { kind: "conflict"; file: File; conflict: ImportConflict }
  | { kind: "error"; message: string }
  | { kind: "success"; title: string }

function isZip(file: File) {
  return (
    file.name.toLowerCase().endsWith(".zip") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  )
}

function actionError(error: unknown) {
  return error instanceof Error ? error.message : "Import failed"
}

export function ExperimentImport({
  onImported,
}: {
  onImported: (slug: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [available, setAvailable] = useState(false)
  const [state, setState] = useState<ImportState>({ kind: "idle" })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let active = true
    void loadExperimentInventory()
      .then((result) => {
        if (active) setAvailable(result.available)
      })
      .catch(() => {
        if (active) setAvailable(false)
      })
    return () => {
      active = false
    }
  }, [])

  const runImport = async (file: File, mode: "error" | "replace" | "copy") => {
    setState({ kind: "importing" })
    try {
      const result = await importExperiment(file, mode)
      if ("conflict" in result) {
        setState({ kind: "conflict", file, conflict: result })
        return
      }
      setState({ kind: "success", title: result.experiment.manifest.title })
      if (result.experiment.state === "active")
        onImported(result.experiment.slug)
    } catch (error) {
      setState({ kind: "error", message: actionError(error) })
    }
  }

  const acceptFiles = (files: FileList | null) => {
    const file = files ? Array.from(files).find(isZip) : undefined
    if (!file) {
      setState({
        kind: "error",
        message: "Choose a .vector-lab.zip package.",
      })
      return
    }
    void runImport(file, "error")
  }

  if (!available) return null

  return (
    <section
      aria-labelledby="import-heading"
      className="border-t border-border py-10 sm:py-12"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Bring One In
          </p>
          <h2
            id="import-heading"
            className="mt-1 text-2xl font-semibold tracking-tight"
          >
            Import an experiment
          </h2>
          <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
            Continue work from another Vector Lab without rebuilding its
            variants and scenarios.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 shrink-0"
          disabled={state.kind === "importing"}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" aria-hidden="true" />
          Choose package
        </Button>
        <input
          ref={inputRef}
          type="file"
          aria-label="Import experiment package"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(event) => {
            acceptFiles(event.target.files)
            event.target.value = ""
          }}
        />
      </div>

      <div
        className={`mt-6 rounded-xl border border-dashed px-5 py-10 text-center transition-colors ${dragging ? "border-ring bg-muted/60" : "border-border bg-muted/25"}`}
        onDragEnter={(event: DragEvent) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          acceptFiles(event.dataTransfer.files)
        }}
      >
        <Upload
          className="mx-auto size-6 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="mt-3 font-medium">
          {state.kind === "importing"
            ? "Importing trusted source…"
            : "Drop a .vector-lab.zip here"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Packages contain executable source. Import only from people you trust.
        </p>
      </div>

      {state.kind === "conflict" ? (
        <div
          className="mt-4 rounded-xl border border-border bg-card p-5"
          role="alert"
        >
          <p className="font-semibold">Experiment already exists</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            “{state.conflict.incoming.title}” shares an identity with “
            {state.conflict.existing.manifest.title}”. Replace it or import a
            separate copy.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void runImport(state.file, "replace")}>
              Replace existing
            </Button>
            <Button
              variant="outline"
              onClick={() => void runImport(state.file, "copy")}
            >
              Import as copy
            </Button>
            <Button variant="ghost" onClick={() => setState({ kind: "idle" })}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.kind === "success" ? (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          Imported {state.title}.
        </p>
      ) : null}
    </section>
  )
}
