import { randomUUID } from "node:crypto"
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import path from "node:path"

import type {
  ExperimentInventory,
  ExperimentState,
  ImportConflict,
  ImportMode,
  ImportSuccess,
  ManagedExperiment,
} from "../src/management-contract.js"
import {
  EXPERIMENT_MANIFEST_VERSION,
  isExperimentManifest,
  type ExperimentManifest,
} from "../src/manifest.js"
import { createExperimentZip, extractExperimentZip } from "./archive.js"

const reservedSlugs = new Set(["_archive", "_template", "_trash"])
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type InternalExperiment = ManagedExperiment & { directory: string }

export class LabManagementError extends Error {
  code: string
  status: number

  constructor(message: string, code = "INVALID_REQUEST", status = 400) {
    super(message)
    this.name = "LabManagementError"
    this.code = code
    this.status = status
  }
}

export function validateSlug(slug: unknown): asserts slug is string {
  if (
    typeof slug !== "string" ||
    slug.length === 0 ||
    slug.length > 64 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    reservedSlugs.has(slug)
  ) {
    throw new LabManagementError(
      "Slug must be 1-64 lowercase letters, numbers, and single hyphens",
      "INVALID_SLUG"
    )
  }
}

export function resolveContainedPath(root: string, ...parts: string[]) {
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, ...parts)
  const relative = path.relative(resolvedRoot, resolved)
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new LabManagementError("Path escapes experiments root", "UNSAFE_PATH")
  }
  return resolved
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value)
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function publicExperiment(experiment: InternalExperiment): ManagedExperiment {
  return {
    id: experiment.id,
    slug: experiment.slug,
    state: experiment.state,
    manifest: experiment.manifest,
  }
}

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => character.charCodeAt(0) < 32)
}

async function optionalLstat(target: string) {
  try {
    return await lstat(target)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw error
  }
}

async function assertSafeTree(directory: string): Promise<void> {
  const stats = await lstat(directory)
  if (stats.isSymbolicLink()) {
    throw new LabManagementError(
      "Managed paths cannot be symlinks",
      "UNSAFE_PATH"
    )
  }
  if (!stats.isDirectory()) {
    throw new LabManagementError(
      "Experiment path is not a directory",
      "UNSAFE_PATH"
    )
  }

  for (const entry of await readdir(directory)) {
    const child = path.join(directory, entry)
    const childStats = await lstat(child)
    if (childStats.isSymbolicLink()) {
      throw new LabManagementError(
        "Experiments cannot contain symlinks",
        "UNSAFE_PATH"
      )
    }
    if (childStats.isDirectory()) await assertSafeTree(child)
    else if (!childStats.isFile()) {
      throw new LabManagementError(
        "Experiments can contain regular files and directories only",
        "UNSAFE_PATH"
      )
    }
  }
}

export class ExperimentStore {
  readonly root: string
  revision = 0
  private mutationQueue: Promise<void> = Promise.resolve()

  constructor(root: string) {
    this.root = path.resolve(root)
  }

  private serialize<T>(operation: () => Promise<T>) {
    const result = this.mutationQueue.then(operation, operation)
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  private changed() {
    this.revision += 1
  }

  private stateRoot(state: ExperimentState) {
    if (state === "active") return this.root
    return resolveContainedPath(
      this.root,
      state === "archived" ? "_archive" : "_trash"
    )
  }

  private async ensureDirectory(directory: string) {
    await mkdir(directory, { recursive: true })
    const stats = await lstat(directory)
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new LabManagementError(
        "Management root must be a real directory",
        "UNSAFE_PATH"
      )
    }
  }

  private async writeManifest(directory: string, manifest: ExperimentManifest) {
    const manifestPath = resolveContainedPath(directory, "experiment.json")
    const existing = await optionalLstat(manifestPath)
    if (existing && (existing.isSymbolicLink() || !existing.isFile())) {
      throw new LabManagementError(
        "experiment.json must be a regular file",
        "UNSAFE_PATH"
      )
    }
    const temporaryPath = resolveContainedPath(
      directory,
      `.experiment-${randomUUID()}.tmp`
    )
    await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      flag: "wx",
    })
    await rename(temporaryPath, manifestPath)
    this.changed()
  }

  private async normalizedManifest(
    directory: string,
    slug: string,
    seenIds: Set<string>
  ) {
    const manifestPath = resolveContainedPath(directory, "experiment.json")
    const stats = await optionalLstat(manifestPath)
    if (stats && (stats.isSymbolicLink() || !stats.isFile())) {
      throw new LabManagementError(
        "experiment.json must be a regular file",
        "UNSAFE_PATH"
      )
    }

    let value: unknown
    if (stats) {
      try {
        value = JSON.parse(await readFile(manifestPath, "utf8"))
      } catch {
        value = undefined
      }
    }
    const partial =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {}
    const existingId = partial.id
    const id =
      isUuid(existingId) && !seenIds.has(existingId) ? existingId : randomUUID()
    const manifest: ExperimentManifest =
      isExperimentManifest(value) && value.id === id
        ? value
        : {
            schemaVersion: EXPERIMENT_MANIFEST_VERSION,
            id,
            title:
              typeof partial.title === "string" && partial.title.trim()
                ? partial.title.trim()
                : titleFromSlug(slug),
            description:
              typeof partial.description === "string"
                ? partial.description
                : "",
            createdAt:
              typeof partial.createdAt === "string" && partial.createdAt
                ? partial.createdAt
                : new Date().toISOString(),
            ...(typeof partial.updatedAt === "string"
              ? { updatedAt: partial.updatedAt }
              : {}),
            ...(typeof partial.defaultCanvas === "string"
              ? { defaultCanvas: partial.defaultCanvas }
              : {}),
          }

    if (!(isExperimentManifest(value) && value.id === id)) {
      await this.writeManifest(directory, manifest)
    }
    seenIds.add(manifest.id)
    return manifest
  }

  private async listState(state: ExperimentState, seenIds: Set<string>) {
    const stateRoot = this.stateRoot(state)
    const rootStats = await optionalLstat(stateRoot)
    if (!rootStats) return []
    if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
      throw new LabManagementError(
        "Experiment state root is unsafe",
        "UNSAFE_PATH"
      )
    }

    const managed: InternalExperiment[] = []
    for (const name of (await readdir(stateRoot)).sort()) {
      if (name.startsWith(".vector-lab-")) continue
      if (state === "active" && reservedSlugs.has(name)) continue
      const directory = resolveContainedPath(stateRoot, name)
      const stats = await lstat(directory)
      if (stats.isSymbolicLink()) {
        throw new LabManagementError(
          "Experiment folders cannot be symlinks",
          "UNSAFE_PATH"
        )
      }
      if (!stats.isDirectory()) continue
      validateSlug(name)

      const indexPath = resolveContainedPath(directory, "index.tsx")
      const indexStats = await optionalLstat(indexPath)
      if (!indexStats) continue
      if (indexStats.isSymbolicLink() || !indexStats.isFile()) {
        throw new LabManagementError(
          "index.tsx must be a regular file",
          "UNSAFE_PATH"
        )
      }
      await assertSafeTree(directory)
      const manifest = await this.normalizedManifest(directory, name, seenIds)
      managed.push({ id: manifest.id, slug: name, state, manifest, directory })
    }
    return managed
  }

  private async inventoryInternal() {
    await this.ensureDirectory(this.root)
    const seenIds = new Set<string>()
    const experiments = [
      ...(await this.listState("active", seenIds)),
      ...(await this.listState("archived", seenIds)),
      ...(await this.listState("trashed", seenIds)),
    ]
    return experiments
  }

  inventory(): Promise<ExperimentInventory> {
    return this.serialize(async () => ({
      experiments: (await this.inventoryInternal()).map(publicExperiment),
    }))
  }

  private async find(id: unknown, expectedSlug?: unknown) {
    if (!isUuid(id)) {
      throw new LabManagementError(
        "A valid experiment UUID is required",
        "INVALID_ID"
      )
    }
    const experiment = (await this.inventoryInternal()).find(
      (item) => item.id === id
    )
    if (!experiment) {
      throw new LabManagementError("Experiment not found", "NOT_FOUND", 404)
    }
    if (expectedSlug !== undefined && expectedSlug !== experiment.slug) {
      throw new LabManagementError("Experiment slug changed", "STALE_SLUG", 409)
    }
    return experiment
  }

  rename(input: {
    id: unknown
    expectedSlug?: unknown
    title: unknown
    slug?: unknown
  }) {
    return this.serialize(async () => {
      const experiment = await this.find(input.id, input.expectedSlug)
      if (
        typeof input.title !== "string" ||
        !input.title.trim() ||
        input.title.trim().length > 200 ||
        hasControlCharacter(input.title)
      ) {
        throw new LabManagementError(
          "Title must be 1-200 characters",
          "INVALID_TITLE"
        )
      }
      const nextSlug = input.slug === undefined ? experiment.slug : input.slug
      validateSlug(nextSlug)
      const destination = resolveContainedPath(
        this.stateRoot(experiment.state),
        nextSlug
      )
      if (
        destination !== experiment.directory &&
        (await optionalLstat(destination))
      ) {
        throw new LabManagementError(
          "Experiment slug already exists",
          "SLUG_CONFLICT",
          409
        )
      }

      if (destination !== experiment.directory) {
        await rename(experiment.directory, destination)
        this.changed()
      }
      const manifest = {
        ...experiment.manifest,
        title: input.title.trim(),
        updatedAt: new Date().toISOString(),
      }
      try {
        await this.writeManifest(destination, manifest)
      } catch (error) {
        if (destination !== experiment.directory) {
          await rename(destination, experiment.directory)
          this.changed()
        }
        throw error
      }
      return publicExperiment({
        ...experiment,
        slug: nextSlug,
        manifest,
        directory: destination,
      })
    })
  }

  private async move(
    id: unknown,
    expectedSlug: unknown,
    allowedStates: ExperimentState[],
    nextState: ExperimentState
  ) {
    const experiment = await this.find(id, expectedSlug)
    if (!allowedStates.includes(experiment.state)) {
      throw new LabManagementError(
        "Action is not valid for this state",
        "INVALID_STATE",
        409
      )
    }
    const destinationRoot = this.stateRoot(nextState)
    await this.ensureDirectory(destinationRoot)
    const destination = resolveContainedPath(destinationRoot, experiment.slug)
    if (await optionalLstat(destination)) {
      throw new LabManagementError(
        "Destination slug already exists",
        "SLUG_CONFLICT",
        409
      )
    }
    await rename(experiment.directory, destination)
    this.changed()
    return publicExperiment({
      ...experiment,
      state: nextState,
      directory: destination,
    })
  }

  archive(input: { id: unknown; expectedSlug?: unknown }) {
    return this.serialize(() =>
      this.move(input.id, input.expectedSlug, ["active"], "archived")
    )
  }

  restore(input: { id: unknown; expectedSlug?: unknown }) {
    return this.serialize(() =>
      this.move(input.id, input.expectedSlug, ["archived", "trashed"], "active")
    )
  }

  trash(input: { id: unknown; expectedSlug?: unknown }) {
    return this.serialize(() =>
      this.move(input.id, input.expectedSlug, ["active", "archived"], "trashed")
    )
  }

  purge(input: { id: unknown; expectedSlug?: unknown }) {
    return this.serialize(async () => {
      const experiment = await this.find(input.id, input.expectedSlug)
      if (experiment.state !== "trashed") {
        throw new LabManagementError(
          "Only trashed experiments can be purged",
          "INVALID_STATE",
          409
        )
      }
      await assertSafeTree(experiment.directory)
      await rm(experiment.directory, { recursive: true })
      this.changed()
      return { ok: true as const }
    })
  }

  export(input: { id: unknown; expectedSlug?: unknown }) {
    return this.serialize(async () => {
      const experiment = await this.find(input.id, input.expectedSlug)
      return {
        experiment: publicExperiment(experiment),
        archive: await createExperimentZip(
          experiment.directory,
          experiment.slug
        ),
      }
    })
  }

  private async uniqueSlug(base: string, experiments: InternalExperiment[]) {
    const used = new Set(experiments.map((experiment) => experiment.slug))
    let number = 1
    while (true) {
      const suffix = number === 1 ? "-copy" : `-copy-${number}`
      const stem = base.slice(0, 64 - suffix.length).replace(/-+$/, "")
      const candidate = `${stem}${suffix}`
      if (
        !used.has(candidate) &&
        !(await optionalLstat(resolveContainedPath(this.root, candidate)))
      ) {
        return candidate
      }
      number += 1
    }
  }

  import(
    bytes: Uint8Array,
    mode: ImportMode
  ): Promise<ImportSuccess | ImportConflict> {
    return this.serialize(async () => {
      if (!(["error", "replace", "copy"] as const).includes(mode)) {
        throw new LabManagementError(
          "Invalid import conflict mode",
          "INVALID_MODE"
        )
      }
      await this.ensureDirectory(this.root)
      const trashRoot = this.stateRoot("trashed")
      await this.ensureDirectory(trashRoot)
      const stagingRoot = await mkdtemp(
        path.join(trashRoot, ".vector-lab-import-")
      )

      try {
        let extracted
        try {
          extracted = await extractExperimentZip(bytes, stagingRoot)
        } catch (error) {
          if ((error as { code?: string }).code === "INVALID_ARCHIVE") {
            throw new LabManagementError(
              error instanceof Error ? error.message : "Invalid ZIP archive",
              "INVALID_ARCHIVE"
            )
          }
          throw error
        }
        if (
          !isUuid(extracted.manifest.id) ||
          extracted.manifest.id === "template"
        ) {
          throw new LabManagementError(
            "Imported manifest must contain a valid UUID",
            "INVALID_MANIFEST"
          )
        }
        validateSlug(extracted.slug)
        const experiments = await this.inventoryInternal()
        const idConflict = experiments.find(
          (experiment) => experiment.id === extracted.manifest.id
        )

        if (mode === "copy") {
          const slug = await this.uniqueSlug(extracted.slug, experiments)
          const manifest: ExperimentManifest = {
            ...extracted.manifest,
            id: randomUUID(),
            title: `${extracted.manifest.title} Copy`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          await this.writeManifest(extracted.directory, manifest)
          const destination = resolveContainedPath(this.root, slug)
          await rename(extracted.directory, destination)
          this.changed()
          return {
            ok: true,
            replaced: false,
            experiment: { id: manifest.id, slug, state: "active", manifest },
          }
        }

        const targetState = idConflict?.state ?? "active"
        const stateRoot = this.stateRoot(targetState)
        await this.ensureDirectory(stateRoot)
        const slugConflict = experiments.find(
          (experiment) =>
            experiment.state === targetState &&
            experiment.slug === extracted.slug &&
            experiment.id !== extracted.manifest.id
        )
        const conflict = idConflict ?? slugConflict
        if (conflict && (mode === "error" || !idConflict || slugConflict)) {
          return {
            conflict: true,
            existing: publicExperiment(conflict),
            incoming: {
              id: extracted.manifest.id,
              slug: extracted.slug,
              title: extracted.manifest.title,
            },
          }
        }

        const destination = resolveContainedPath(stateRoot, extracted.slug)
        if (!idConflict) {
          if (await optionalLstat(destination)) {
            throw new LabManagementError(
              "Experiment slug already exists",
              "SLUG_CONFLICT",
              409
            )
          }
          await rename(extracted.directory, destination)
          this.changed()
          return {
            ok: true,
            replaced: false,
            experiment: {
              id: extracted.manifest.id,
              slug: extracted.slug,
              state: "active",
              manifest: extracted.manifest,
            },
          }
        }

        const backup = resolveContainedPath(
          stateRoot,
          `.vector-lab-backup-${randomUUID()}`
        )
        if (
          destination !== idConflict.directory &&
          (await optionalLstat(destination))
        ) {
          throw new LabManagementError(
            "Experiment slug already exists",
            "SLUG_CONFLICT",
            409
          )
        }
        await rename(idConflict.directory, backup)
        this.changed()
        let installed = false
        try {
          await rename(extracted.directory, destination)
          installed = true
          this.changed()
        } catch (error) {
          if (installed) await rm(destination, { recursive: true, force: true })
          try {
            await rename(backup, idConflict.directory)
            this.changed()
          } catch {
            throw new LabManagementError(
              "Import failed and backup rollback failed",
              "ROLLBACK_FAILED",
              500
            )
          }
          throw error
        }
        await rm(backup, { recursive: true })
        return {
          ok: true,
          replaced: true,
          experiment: {
            id: extracted.manifest.id,
            slug: extracted.slug,
            state: idConflict.state,
            manifest: extracted.manifest,
          },
        }
      } finally {
        await rm(stagingRoot, { recursive: true, force: true })
      }
    })
  }
}
