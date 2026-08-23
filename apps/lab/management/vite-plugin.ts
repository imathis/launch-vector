import type { IncomingMessage, ServerResponse } from "node:http"
import path from "node:path"

import type { Plugin, ResolvedConfig, ViteDevServer } from "vite"

import {
  LAB_MANAGEMENT_HEADER,
  LAB_MANAGEMENT_PREFIX,
  type ImportMode,
} from "../src/management-contract.js"
import { MAX_ZIP_BYTES } from "./archive.js"
import { ExperimentStore, LabManagementError } from "./store.js"

const MAX_JSON_BODY_BYTES = 64 * 1024

async function readBody(request: IncomingMessage, limit: number) {
  const declaredLength = Number(request.headers["content-length"] ?? 0)
  if (!Number.isFinite(declaredLength) || declaredLength > limit) {
    throw new LabManagementError(
      "Request body is too large",
      "BODY_TOO_LARGE",
      413
    )
  }

  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.byteLength
    if (size > limit) {
      throw new LabManagementError(
        "Request body is too large",
        "BODY_TOO_LARGE",
        413
      )
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

async function readJson(request: IncomingMessage) {
  const body = await readBody(request, MAX_JSON_BODY_BYTES)
  if (body.byteLength === 0) return {}
  try {
    return JSON.parse(body.toString("utf8")) as Record<string, unknown>
  } catch {
    throw new LabManagementError(
      "Request body must be valid JSON",
      "INVALID_JSON"
    )
  }
}

function writeJson(response: ServerResponse, status: number, value: unknown) {
  response.statusCode = status
  response.setHeader("content-type", "application/json; charset=utf-8")
  response.end(JSON.stringify(value))
}

function validateRequest(request: IncomingMessage) {
  if (request.method !== "POST") {
    throw new LabManagementError(
      "Only POST is supported",
      "METHOD_NOT_ALLOWED",
      405
    )
  }
  if (request.headers[LAB_MANAGEMENT_HEADER] !== "1") {
    throw new LabManagementError(
      `Missing ${LAB_MANAGEMENT_HEADER} header`,
      "MISSING_MANAGEMENT_HEADER",
      403
    )
  }
  const origin = request.headers.origin
  const host = request.headers.host
  if (origin) {
    let originHost: string
    try {
      originHost = new URL(origin).host
    } catch {
      throw new LabManagementError(
        "Request Origin is invalid",
        "INVALID_ORIGIN",
        403
      )
    }
    if (!host || originHost.toLowerCase() !== host.toLowerCase()) {
      throw new LabManagementError(
        "Cross-origin management is forbidden",
        "INVALID_ORIGIN",
        403
      )
    }
  }
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  server: ViteDevServer,
  store: ExperimentStore
) {
  response.setHeader(LAB_MANAGEMENT_HEADER, "1")
  response.setHeader("cache-control", "no-store")
  response.setHeader("x-content-type-options", "nosniff")
  const startingRevision = store.revision

  try {
    validateRequest(request)
    const url = new URL(
      request.url ?? "",
      `http://${request.headers.host ?? "localhost"}`
    )
    const endpoint = url.pathname.slice(LAB_MANAGEMENT_PREFIX.length)

    if (endpoint === "/inventory") {
      writeJson(response, 200, await store.inventory())
    } else if (endpoint === "/rename") {
      const body = await readJson(request)
      writeJson(response, 200, await store.rename(body as never))
    } else if (endpoint === "/archive") {
      const body = await readJson(request)
      writeJson(response, 200, await store.archive(body as { id: unknown }))
    } else if (endpoint === "/restore") {
      const body = await readJson(request)
      writeJson(response, 200, await store.restore(body as { id: unknown }))
    } else if (endpoint === "/trash") {
      const body = await readJson(request)
      writeJson(response, 200, await store.trash(body as { id: unknown }))
    } else if (endpoint === "/purge") {
      const body = await readJson(request)
      writeJson(response, 200, await store.purge(body as { id: unknown }))
    } else if (endpoint === "/export") {
      const body = await readJson(request)
      const exported = await store.export(body as { id: unknown })
      response.statusCode = 200
      response.setHeader("content-type", "application/zip")
      response.setHeader(
        "content-disposition",
        `attachment; filename="${exported.experiment.slug}.vector-lab.zip"`
      )
      response.end(exported.archive)
    } else if (endpoint === "/import") {
      const mode = url.searchParams.get("mode") as ImportMode | null
      if (!mode || !["error", "replace", "copy"].includes(mode)) {
        throw new LabManagementError(
          "Invalid import conflict mode",
          "INVALID_MODE"
        )
      }
      const result = await store.import(
        await readBody(request, MAX_ZIP_BYTES),
        mode
      )
      writeJson(response, "conflict" in result ? 409 : 200, result)
    } else {
      throw new LabManagementError(
        "Management endpoint not found",
        "NOT_FOUND",
        404
      )
    }
  } catch (error) {
    const managedError =
      error instanceof LabManagementError
        ? error
        : new LabManagementError(
            error instanceof Error
              ? error.message
              : "Management request failed",
            (error as { code?: string })?.code ?? "INTERNAL_ERROR",
            500
          )
    if (!response.headersSent) {
      writeJson(response, managedError.status, {
        error: managedError.message,
        code: managedError.code,
      })
    } else {
      response.destroy(managedError)
    }
  } finally {
    if (store.revision !== startingRevision) {
      server.ws.send({ type: "full-reload" })
    }
  }
}

export function vectorLabManagementPlugin(): Plugin {
  let config: ResolvedConfig
  let store: ExperimentStore

  return {
    name: "vector-lab-management",
    apply: "serve",
    configResolved(resolvedConfig) {
      config = resolvedConfig
      store = new ExperimentStore(path.resolve(config.root, "src/experiments"))
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split("?", 1)[0]
        if (
          pathname !== LAB_MANAGEMENT_PREFIX &&
          !pathname?.startsWith(`${LAB_MANAGEMENT_PREFIX}/`)
        ) {
          next()
          return
        }
        void handleRequest(request, response, server, store)
      })
    },
  }
}
