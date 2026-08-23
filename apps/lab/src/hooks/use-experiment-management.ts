import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Archive,
  ArchiveRestore,
  Download,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react"

import type { ChoiceMenuActionGroup } from "../components/choice-menu"
import {
  archiveExperiment,
  downloadExperiment,
  loadExperimentInventory,
  restoreExperiment,
  trashExperiment,
} from "../lib/management-client"
import type { ManagedExperiment } from "../management-contract"

function actionError(error: unknown) {
  return error instanceof Error ? error.message : "Experiment action failed"
}

export function useExperimentManagement({
  currentSlug,
  onLeaveExperiment,
  onOpenExperiment,
}: {
  currentSlug: string
  onLeaveExperiment: () => void
  onOpenExperiment: (slug: string) => void
}) {
  const [experiments, setExperiments] = useState<ManagedExperiment[]>([])
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [renameTarget, setRenameTarget] = useState<ManagedExperiment | null>(
    null
  )

  const refresh = useCallback(async () => {
    try {
      const result = await loadExperimentInventory()
      if (!result.available) {
        setAvailable(false)
        setExperiments([])
        return
      }
      setAvailable(true)
      setExperiments(result.inventory.experiments)
    } catch (inventoryError) {
      setAvailable(false)
      setError(actionError(inventoryError))
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void refresh())
  }, [refresh])

  const current = experiments.find(
    (experiment) =>
      experiment.slug === currentSlug && experiment.state === "active"
  )
  const archived = experiments.filter(
    (experiment) => experiment.state === "archived"
  )
  const trashed = experiments.filter(
    (experiment) => experiment.state === "trashed"
  )

  const run = useCallback(
    async (
      action: () => Promise<unknown>,
      onSuccess?: () => void | Promise<void>
    ) => {
      setBusy(true)
      setError("")
      try {
        await action()
        await onSuccess?.()
        await refresh()
      } catch (managementError) {
        setError(actionError(managementError))
      } finally {
        setBusy(false)
      }
    },
    [refresh]
  )

  const actionGroups = useMemo<readonly ChoiceMenuActionGroup[]>(() => {
    if (!available) return []
    const groups: ChoiceMenuActionGroup[] = []

    if (current) {
      groups.push({
        label: "",
        actions: [
          {
            value: "rename",
            label: "Rename",
            icon: Pencil,
            disabled: busy,
            onSelect: () => setRenameTarget(current),
          },
          {
            value: "download",
            label: "Download package",
            description: ".vector-lab.zip",
            icon: Download,
            disabled: busy,
            onSelect: () => void run(() => downloadExperiment(current)),
          },
          {
            value: "archive",
            label: "Archive",
            description: "Remove from the active Lab",
            icon: Archive,
            disabled: busy,
            onSelect: () =>
              void run(() => archiveExperiment(current), onLeaveExperiment),
          },
          {
            value: "trash",
            label: "Move to trash",
            icon: Trash2,
            destructive: true,
            disabled: busy,
            onSelect: () => {
              if (
                window.confirm(
                  `Move “${current.manifest.title}” to recoverable trash?`
                )
              ) {
                void run(() => trashExperiment(current), onLeaveExperiment)
              }
            },
          },
        ],
      })
    }

    if (archived.length > 0) {
      groups.push({
        label: "Archived",
        actions: archived.map((experiment) => ({
          value: `restore-archive-${experiment.id}`,
          label: experiment.manifest.title,
          description: "Restore to active experiments",
          icon: ArchiveRestore,
          disabled: busy,
          onSelect: () =>
            void run(
              () => restoreExperiment(experiment),
              () => onOpenExperiment(experiment.slug)
            ),
        })),
      })
    }

    if (trashed.length > 0) {
      groups.push({
        label: "Trash",
        actions: trashed.map((experiment) => ({
          value: `restore-trash-${experiment.id}`,
          label: experiment.manifest.title,
          description: "Restore to active experiments",
          icon: RotateCcw,
          disabled: busy,
          onSelect: () =>
            void run(
              () => restoreExperiment(experiment),
              () => onOpenExperiment(experiment.slug)
            ),
        })),
      })
    }

    return groups
  }, [
    archived,
    available,
    busy,
    current,
    onLeaveExperiment,
    onOpenExperiment,
    run,
    trashed,
  ])

  return {
    actionGroups,
    error,
    dismissError: () => setError(""),
    renameTarget,
    closeRename: () => setRenameTarget(null),
    finishRename: (renamed: ManagedExperiment) => {
      setRenameTarget(null)
      void refresh()
      if (renamed.slug !== currentSlug) onOpenExperiment(renamed.slug)
    },
  }
}
