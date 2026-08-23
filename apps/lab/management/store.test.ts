import { randomUUID } from "node:crypto"
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, test } from "bun:test"
import { unzipSync, zipSync } from "fflate"

import { ExperimentStore, resolveContainedPath, validateSlug } from "./store.js"

const temporaryDirectories: string[] = []

async function temporaryExperimentsRoot() {
  const parent = await mkdtemp(path.join(tmpdir(), "vector-lab-management-"))
  temporaryDirectories.push(parent)
  const root = path.join(parent, "experiments")
  await mkdir(root)
  return root
}

async function createExperiment(
  root: string,
  slug: string,
  id: string = randomUUID()
) {
  const directory = path.join(root, slug)
  await mkdir(directory, { recursive: true })
  await writeFile(
    path.join(directory, "index.tsx"),
    "export default function Test() {}\n"
  )
  await writeFile(
    path.join(directory, "experiment.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        id,
        title: "Test experiment",
        description: "A test",
        createdAt: "2026-08-22T00:00:00.000Z",
      },
      null,
      2
    )}\n`
  )
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

describe("path validation", () => {
  test("accepts strict slugs and rejects unsafe paths", () => {
    expect(() => validateSlug("account-settings-2")).not.toThrow()
    for (const slug of [
      "",
      "Account",
      "two--hyphens",
      "../escape",
      "with/slash",
      "_archive",
      "trailing-",
    ]) {
      expect(() => validateSlug(slug)).toThrow()
    }

    const root = path.resolve("/tmp/experiments")
    expect(resolveContainedPath(root, "safe")).toBe(path.join(root, "safe"))
    expect(() => resolveContainedPath(root, "..", "escape")).toThrow()
    expect(() => resolveContainedPath(root, "/tmp/elsewhere")).toThrow()
  })

  test("rejects symlinks anywhere in an experiment", async () => {
    const root = await temporaryExperimentsRoot()
    const directory = await createExperiment(root, "unsafe")
    await symlink(
      path.join(directory, "index.tsx"),
      path.join(directory, "linked.tsx")
    )

    await expect(new ExperimentStore(root).inventory()).rejects.toMatchObject({
      code: "UNSAFE_PATH",
    })
  })
})

describe("experiment lifecycle", () => {
  test("repairs IDs and supports rename, archive, restore, trash, and purge", async () => {
    const root = await temporaryExperimentsRoot()
    await createExperiment(root, "first-test", "template")
    const store = new ExperimentStore(root)

    const inventory = await store.inventory()
    expect(inventory.experiments).toHaveLength(1)
    const experiment = inventory.experiments[0]
    expect(experiment.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
    expect(experiment.manifest.schemaVersion).toBe(1)

    const renamed = await store.rename({
      id: experiment.id,
      expectedSlug: "first-test",
      title: "Renamed experiment",
      slug: "renamed-test",
    })
    expect(renamed.slug).toBe("renamed-test")
    expect(renamed.manifest.title).toBe("Renamed experiment")

    const archived = await store.archive({
      id: experiment.id,
      expectedSlug: "renamed-test",
    })
    expect(archived.state).toBe("archived")
    const restored = await store.restore({ id: experiment.id })
    expect(restored.state).toBe("active")
    const trashed = await store.trash({ id: experiment.id })
    expect(trashed.state).toBe("trashed")
    await store.purge({ id: experiment.id })
    expect((await store.inventory()).experiments).toEqual([])
  })
})

describe("export and import", () => {
  test("exports safe files and supports conflict, copy, and state-preserving replace", async () => {
    const sourceRoot = await temporaryExperimentsRoot()
    const sourceDirectory = await createExperiment(sourceRoot, "portable")
    await writeFile(path.join(sourceDirectory, ".env.local"), "SECRET=hidden\n")
    await mkdir(path.join(sourceDirectory, "dist"))
    await writeFile(
      path.join(sourceDirectory, "dist", "generated.js"),
      "generated\n"
    )
    await mkdir(path.join(sourceDirectory, "nested"))
    await writeFile(
      path.join(sourceDirectory, "nested", "notes.txt"),
      "included\n"
    )

    const sourceStore = new ExperimentStore(sourceRoot)
    const [source] = (await sourceStore.inventory()).experiments
    const exported = await sourceStore.export({ id: source.id })
    const archiveEntries = Object.keys(unzipSync(exported.archive))
    expect(archiveEntries).toContain("portable/index.tsx")
    expect(archiveEntries).toContain("portable/nested/notes.txt")
    expect(archiveEntries.some((entry) => entry.includes(".env"))).toBe(false)
    expect(archiveEntries.some((entry) => entry.includes("/dist/"))).toBe(false)

    const destinationRoot = await temporaryExperimentsRoot()
    const destinationStore = new ExperimentStore(destinationRoot)
    const imported = await destinationStore.import(exported.archive, "error")
    expect(imported).toMatchObject({ ok: true, replaced: false })

    const conflict = await destinationStore.import(exported.archive, "error")
    expect(conflict).toMatchObject({
      conflict: true,
      existing: { id: source.id, state: "active" },
    })

    await destinationStore.archive({ id: source.id })
    await writeFile(
      path.join(destinationRoot, "_archive", "portable", "index.tsx"),
      "changed\n"
    )
    const replaced = await destinationStore.import(exported.archive, "replace")
    expect(replaced).toMatchObject({
      ok: true,
      replaced: true,
      experiment: { id: source.id, state: "archived" },
    })
    expect(
      await readFile(
        path.join(destinationRoot, "_archive", "portable", "index.tsx"),
        "utf8"
      )
    ).toBe("export default function Test() {}\n")

    const copied = await destinationStore.import(exported.archive, "copy")
    expect(copied).toMatchObject({
      ok: true,
      replaced: false,
      experiment: {
        slug: "portable-copy",
        state: "active",
        manifest: { title: "Test experiment Copy" },
      },
    })
    if (!("ok" in copied)) throw new Error("Expected a copied experiment")
    expect(copied.experiment.id).not.toBe(source.id)
  })

  test("rejects traversal and secret entries before extraction", async () => {
    const root = await temporaryExperimentsRoot()
    const store = new ExperimentStore(root)
    const manifest = JSON.stringify({
      schemaVersion: 1,
      id: randomUUID(),
      title: "Unsafe",
      description: "",
      createdAt: new Date().toISOString(),
    })

    const traversal = zipSync({
      "unsafe/experiment.json": new TextEncoder().encode(manifest),
      "unsafe/index.tsx": new TextEncoder().encode("export default null"),
      "unsafe/../escape.txt": new Uint8Array(),
    })
    await expect(store.import(traversal, "error")).rejects.toMatchObject({
      code: "INVALID_ARCHIVE",
    })
    await expect(
      access(path.join(path.dirname(root), "escape.txt"))
    ).rejects.toBeDefined()

    const secrets = zipSync({
      "unsafe/experiment.json": new TextEncoder().encode(manifest),
      "unsafe/index.tsx": new TextEncoder().encode("export default null"),
      "unsafe/.env.production": new Uint8Array(),
    })
    await expect(store.import(secrets, "error")).rejects.toMatchObject({
      code: "INVALID_ARCHIVE",
    })
  })
})
