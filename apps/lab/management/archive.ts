import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { unzipSync, zipSync } from "fflate"

import {
  isExperimentManifest,
  type ExperimentManifest,
} from "../src/manifest.js"

export const MAX_ZIP_BYTES = 10 * 1024 * 1024
export const MAX_ZIP_ENTRIES = 256
export const MAX_ZIP_FILE_BYTES = 2 * 1024 * 1024
export const MAX_ZIP_EXPANDED_BYTES = 20 * 1024 * 1024

type ZipEntry = {
  name: string
  compressedSize: number
  expandedSize: number
  localOffset: number
  flags: number
  method: number
  directory: boolean
}

export type ExtractedExperiment = {
  directory: string
  slug: string
  manifest: ExperimentManifest
}

const excludedDirectories = new Set([
  ".git",
  ".svn",
  ".vite",
  "coverage",
  "dist",
  "dist-ssr",
  "node_modules",
])

function archiveError(message: string): never {
  throw Object.assign(new Error(message), { code: "INVALID_ARCHIVE" })
}

function isExcludedArchivePath(relativePath: string) {
  return relativePath.split("/").some((part) => {
    return (
      part === ".DS_Store" ||
      /^\.env(?:\.|$)/.test(part) ||
      excludedDirectories.has(part)
    )
  })
}

async function collectFiles(
  directory: string,
  prefix = ""
): Promise<Array<[string, Uint8Array]>> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: Array<[string, Uint8Array]> = []

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    const absolutePath = path.join(directory, entry.name)
    const stats = await lstat(absolutePath)

    if (stats.isSymbolicLink()) archiveError("Archives cannot contain symlinks")
    if (isExcludedArchivePath(relativePath)) continue
    if (stats.isDirectory()) {
      files.push(...(await collectFiles(absolutePath, relativePath)))
      continue
    }
    if (!stats.isFile()) archiveError("Archives can contain regular files only")
    if (stats.size > MAX_ZIP_FILE_BYTES) {
      archiveError(`File exceeds archive limit: ${relativePath}`)
    }

    const contents = await readFile(absolutePath)
    files.push([relativePath, contents])
  }

  return files
}

export async function createExperimentZip(directory: string, slug: string) {
  const files = await collectFiles(directory)
  if (files.length > MAX_ZIP_ENTRIES) {
    archiveError("Experiment has too many files")
  }
  if (!files.some(([name]) => name === "experiment.json")) {
    archiveError("Experiment is missing experiment.json")
  }
  if (!files.some(([name]) => name === "index.tsx")) {
    archiveError("Experiment is missing index.tsx")
  }

  let expandedBytes = 0
  const archiveFiles: Record<string, Uint8Array> = {}
  for (const [name, contents] of files) {
    expandedBytes += contents.byteLength
    if (expandedBytes > MAX_ZIP_EXPANDED_BYTES) {
      archiveError("Experiment exceeds expanded archive limit")
    }
    archiveFiles[`${slug}/${name}`] = contents
  }

  const archive = zipSync(archiveFiles, { level: 6 })
  if (archive.byteLength > MAX_ZIP_BYTES) {
    archiveError("Compressed archive exceeds size limit")
  }
  return archive
}

function readName(bytes: Uint8Array, offset: number, length: number) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.subarray(offset, offset + length)
    )
  } catch {
    archiveError("ZIP entry names must be valid UTF-8")
  }
}

function validateEntryName(name: string) {
  if (
    !name ||
    name.includes("\\") ||
    name.startsWith("/") ||
    /^[a-zA-Z]:/.test(name) ||
    name.includes("\0")
  ) {
    archiveError("ZIP contains an unsafe entry path")
  }

  const rawParts = name.split("/")
  const parts = rawParts.filter(Boolean)
  if (
    parts.length === 0 ||
    parts.length !== rawParts.length - (name.endsWith("/") ? 1 : 0) ||
    parts.some((part) => part === "." || part === "..")
  ) {
    archiveError("ZIP contains path traversal")
  }
  if (isExcludedArchivePath(parts.slice(1).join("/"))) {
    archiveError(`ZIP contains generated or secret content: ${name}`)
  }
  return parts
}

function findEndOfCentralDirectory(view: DataView) {
  const minimumOffset = Math.max(0, view.byteLength - 65_557)
  for (
    let offset = view.byteLength - 22;
    offset >= minimumOffset;
    offset -= 1
  ) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset
  }
  return archiveError("ZIP central directory is missing")
}

function inspectZip(bytes: Uint8Array) {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_ZIP_BYTES) {
    archiveError("Compressed archive exceeds size limit")
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const endOffset = findEndOfCentralDirectory(view)
  if (
    endOffset + 22 + view.getUint16(endOffset + 20, true) !==
    bytes.byteLength
  ) {
    archiveError("ZIP end record is invalid")
  }
  if (view.getUint16(endOffset + 4, true) !== 0) {
    archiveError("Multi-disk ZIP archives are not supported")
  }
  if (view.getUint16(endOffset + 6, true) !== 0) {
    archiveError("Multi-disk ZIP archives are not supported")
  }

  const entriesOnDisk = view.getUint16(endOffset + 8, true)
  const entryCount = view.getUint16(endOffset + 10, true)
  const centralSize = view.getUint32(endOffset + 12, true)
  const centralOffset = view.getUint32(endOffset + 16, true)
  if (
    entriesOnDisk === 0xffff ||
    entryCount === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff ||
    bytes
      .subarray(Math.max(0, endOffset - 20), endOffset)
      .some(
        (_, index) =>
          view.getUint32(Math.max(0, endOffset - 20) + index, true) ===
          0x07064b50
      )
  ) {
    archiveError("ZIP64 archives are not supported")
  }
  if (entriesOnDisk !== entryCount || entryCount > MAX_ZIP_ENTRIES) {
    archiveError("ZIP has too many entries")
  }
  if (centralOffset + centralSize > endOffset) {
    archiveError("ZIP central directory is invalid")
  }

  const entries: ZipEntry[] = []
  const names = new Set<string>()
  let offset = centralOffset
  let expandedBytes = 0

  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + 46 > bytes.byteLength ||
      view.getUint32(offset, true) !== 0x02014b50
    ) {
      archiveError("ZIP central directory entry is invalid")
    }

    const madeBy = view.getUint16(offset + 4, true)
    const flags = view.getUint16(offset + 8, true)
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const expandedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const externalAttributes = view.getUint32(offset + 38, true)
    const localOffset = view.getUint32(offset + 42, true)
    const entryEnd = offset + 46 + nameLength + extraLength + commentLength
    if (entryEnd > bytes.byteLength) archiveError("ZIP entry is truncated")

    const name = readName(bytes, offset + 46, nameLength)
    const parts = validateEntryName(name)
    const unixType = (externalAttributes >>> 16) & 0xf000
    const directory = name.endsWith("/")
    if ((flags & 1) !== 0)
      archiveError("Encrypted ZIP entries are not supported")
    if (method !== 0 && method !== 8)
      archiveError("ZIP compression method is unsupported")
    if (unixType === 0xa000) archiveError("ZIP cannot contain symlinks")
    if (
      madeBy >>> 8 === 3 &&
      unixType !== 0 &&
      unixType !== 0x4000 &&
      unixType !== 0x8000
    ) {
      archiveError("ZIP entries must be regular files or directories")
    }
    if (
      compressedSize === 0xffffffff ||
      expandedSize === 0xffffffff ||
      localOffset === 0xffffffff
    ) {
      archiveError("ZIP64 entries are not supported")
    }
    for (
      let extraOffset = offset + 46 + nameLength;
      extraOffset + 4 <= offset + 46 + nameLength + extraLength;
    ) {
      const tag = view.getUint16(extraOffset, true)
      const size = view.getUint16(extraOffset + 2, true)
      if (extraOffset + 4 + size > offset + 46 + nameLength + extraLength) {
        archiveError("ZIP extra field is invalid")
      }
      if (tag === 1) archiveError("ZIP64 entries are not supported")
      extraOffset += 4 + size
    }
    if (names.has(name)) archiveError("ZIP contains duplicate entry names")
    names.add(name)
    if (directory && (compressedSize !== 0 || expandedSize !== 0)) {
      archiveError("ZIP directory entries must be empty")
    }
    if (!directory) {
      if (expandedSize > MAX_ZIP_FILE_BYTES) {
        archiveError(`ZIP entry exceeds file limit: ${name}`)
      }
      expandedBytes += expandedSize
      if (expandedBytes > MAX_ZIP_EXPANDED_BYTES) {
        archiveError("ZIP exceeds expanded size limit")
      }
    }

    entries.push({
      name,
      compressedSize,
      expandedSize,
      localOffset,
      flags,
      method,
      directory,
    })
    if (parts.length === 0) archiveError("ZIP entry name is invalid")
    offset = entryEnd
  }

  if (offset !== centralOffset + centralSize) {
    archiveError("ZIP central directory size is invalid")
  }

  const roots = new Set(entries.map((entry) => entry.name.split("/")[0]))
  if (roots.size !== 1) archiveError("ZIP must contain one root folder")
  const root = roots.values().next().value
  if (!root || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(root) || root.length > 64) {
    archiveError("ZIP root folder must be a valid experiment slug")
  }
  if (
    !names.has(`${root}/experiment.json`) ||
    !names.has(`${root}/index.tsx`)
  ) {
    archiveError("ZIP must contain experiment.json and index.tsx at its root")
  }

  for (const entry of entries) {
    const localOffset = entry.localOffset
    if (
      localOffset + 30 > centralOffset ||
      view.getUint32(localOffset, true) !== 0x04034b50
    ) {
      archiveError("ZIP local entry is invalid")
    }
    const localFlags = view.getUint16(localOffset + 6, true)
    const localMethod = view.getUint16(localOffset + 8, true)
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const localName = readName(bytes, localOffset + 30, localNameLength)
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength
    if (
      localName !== entry.name ||
      localFlags !== entry.flags ||
      localMethod !== entry.method ||
      dataOffset + entry.compressedSize > centralOffset
    ) {
      archiveError("ZIP local and central entries do not match")
    }
    for (
      let extraOffset = localOffset + 30 + localNameLength;
      extraOffset + 4 <= dataOffset;
    ) {
      const tag = view.getUint16(extraOffset, true)
      const size = view.getUint16(extraOffset + 2, true)
      if (extraOffset + 4 + size > dataOffset) {
        archiveError("ZIP local extra field is invalid")
      }
      if (tag === 1) archiveError("ZIP64 entries are not supported")
      extraOffset += 4 + size
    }
  }

  return { entries, root }
}

export async function extractExperimentZip(
  bytes: Uint8Array,
  stagingDirectory: string
): Promise<ExtractedExperiment> {
  const inspected = inspectZip(bytes)
  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(bytes)
  } catch {
    return archiveError("ZIP data could not be decompressed")
  }

  const directory = path.join(stagingDirectory, inspected.root)
  await mkdir(directory)
  for (const entry of inspected.entries) {
    if (entry.directory) continue
    const contents = unzipped[entry.name]
    if (!contents || contents.byteLength !== entry.expandedSize) {
      archiveError(`ZIP entry size does not match: ${entry.name}`)
    }
    const relativeParts = entry.name.split("/").slice(1)
    const destination = path.join(directory, ...relativeParts)
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, contents, { flag: "wx" })
  }

  let manifestValue: unknown
  try {
    manifestValue = JSON.parse(
      new TextDecoder().decode(unzipped[`${inspected.root}/experiment.json`])
    )
  } catch {
    return archiveError("experiment.json is not valid JSON")
  }
  if (!isExperimentManifest(manifestValue)) {
    archiveError("experiment.json does not use manifest schema v1")
  }

  return {
    directory,
    slug: inspected.root,
    manifest: manifestValue,
  }
}
