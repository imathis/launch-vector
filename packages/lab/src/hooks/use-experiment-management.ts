import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Archive,
  ArchiveRestore,
  Download,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react"

import type {
  ChoiceMenuAction,
  ChoiceMenuActionGroup,
} from "../components/choice-menu"
import { errorMessage } from "../lib/error-message"
import {
  archiveExperiment,
  downloadExperiment,
  hideVariant as hideVariantRequest,
  loadExperimentInventory,
  purgeExperiment,
  restoreExperiment,
  restoreHiddenVariants as restoreHiddenVariantsRequest,
  trashExperiment,
} from "../lib/management-client"
import {
  ARCHIVE_EXTENSION,
  type ManagedExperiment,
} from "../management-contract"

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
      setError(errorMessage(inventoryError, "Experiment action failed"))
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void refresh())
  }, [refresh])

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
        setError(errorMessage(managementError, "Experiment action failed"))
      } finally {
        setBusy(false)
      }
    },
    [refresh]
  )

  const { currentActions, otherGroups } = useMemo(() => {
    if (!available) return { currentActions: [], otherGroups: [] }

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

    const restoreAction = (
      experiment: ManagedExperiment,
      key: string,
      icon: typeof RotateCcw
    ) => ({
      value: `${key}-${experiment.id}`,
      label: experiment.manifest.title,
      description: "Restore to active experiments",
      icon,
      disabled: busy,
      onSelect: () =>
        void run(
          () => restoreExperiment(experiment),
          () => onOpenExperiment(experiment.slug)
        ),
    })

    const actions: ChoiceMenuAction[] = current
      ? [
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
            description: ARCHIVE_EXTENSION,
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
        ]
      : []

    const groups: ChoiceMenuActionGroup[] = []
    if (archived.length > 0) {
      groups.push({
        label: "Archived",
        actions: archived.map((experiment) =>
          restoreAction(experiment, "restore-archive", ArchiveRestore)
        ),
      })
    }
    if (trashed.length > 0) {
      groups.push({
        label: "Trash",
        actions: trashed.flatMap((experiment) => [
          restoreAction(experiment, "restore-trash", RotateCcw),
          {
            value: `purge-trash-${experiment.id}`,
            label: `Delete “${experiment.manifest.title}” permanently`,
            description: "Cannot be undone",
            icon: Trash2,
            destructive: true,
            disabled: busy,
            onSelect: () => {
              if (
                window.confirm(
                  `Permanently delete “${experiment.manifest.title}”? This cannot be undone.`
                )
              ) {
                void run(
                  () => purgeExperiment(experiment),
                  () => window.location.reload()
                )
              }
            },
          },
        ]),
      })
    }

    return { currentActions: actions, otherGroups: groups }
  }, [
    available,
    busy,
    currentSlug,
    experiments,
    onLeaveExperiment,
    onOpenExperiment,
    run,
  ])

  const current = experiments.find(
    (experiment) =>
      experiment.slug === currentSlug && experiment.state === "active"
  )

  const hideVariant = useCallback(
    (variant: string) => {
      if (!current) return Promise.resolve()
      return run(() => hideVariantRequest(current, variant))
    },
    [current, run]
  )

  const restoreHiddenVariants = useCallback(() => {
    if (!current) return Promise.resolve()
    return run(() => restoreHiddenVariantsRequest(current))
  }, [current, run])

  return {
    available,
    current,
    hideVariant,
    restoreHiddenVariants,
    currentActions,
    otherGroups,
    error,
    dismissError: () => setError(""),
    renameTarget,
    closeRename: () => setRenameTarget(null),
    finishRename: (renamed: ManagedExperiment) => {
      setRenameTarget(null)
      if (renamed.slug !== currentSlug) onOpenExperiment(renamed.slug)
      else window.location.reload()
    },
  }
}
