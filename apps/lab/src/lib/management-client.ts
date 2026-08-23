import {
  LAB_MANAGEMENT_HEADER,
  LAB_MANAGEMENT_PREFIX,
  type ExperimentInventory,
  type ImportConflict,
  type ImportMode,
  type ImportSuccess,
  type ManagedExperiment,
  type ManagementError,
} from "../management-contract"

export class ManagementRequestError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = "ManagementRequestError"
    this.code = code
  }
}

async function request(endpoint: string, init?: RequestInit) {
  return fetch(`${LAB_MANAGEMENT_PREFIX}${endpoint}`, {
    method: "POST",
    ...init,
    headers: {
      [LAB_MANAGEMENT_HEADER]: "1",
      ...init?.headers,
    },
  })
}

async function responseError(response: Response) {
  try {
    const body = (await response.json()) as ManagementError
    return new ManagementRequestError(
      body.error || response.statusText,
      body.code
    )
  } catch {
    return new ManagementRequestError(response.statusText)
  }
}

async function jsonRequest<T>(endpoint: string, body: object): Promise<T> {
  const response = await request(endpoint, {
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<T>
}

export async function loadExperimentInventory(): Promise<
  { available: true; inventory: ExperimentInventory } | { available: false }
> {
  const response = await request("/inventory")
  if (response.headers.get(LAB_MANAGEMENT_HEADER) !== "1") {
    return { available: false }
  }
  if (!response.ok) throw await responseError(response)
  return {
    available: true,
    inventory: (await response.json()) as ExperimentInventory,
  }
}

export function renameExperiment(
  experiment: ManagedExperiment,
  title: string,
  slug: string
) {
  return jsonRequest<ManagedExperiment>("/rename", {
    id: experiment.id,
    expectedSlug: experiment.slug,
    title,
    slug,
  })
}

function lifecycleAction(endpoint: string, experiment: ManagedExperiment) {
  return jsonRequest<ManagedExperiment>(endpoint, {
    id: experiment.id,
    expectedSlug: experiment.slug,
  })
}

export function archiveExperiment(experiment: ManagedExperiment) {
  return lifecycleAction("/archive", experiment)
}

export function restoreExperiment(experiment: ManagedExperiment) {
  return lifecycleAction("/restore", experiment)
}

export function trashExperiment(experiment: ManagedExperiment) {
  return lifecycleAction("/trash", experiment)
}

export function purgeExperiment(experiment: ManagedExperiment) {
  return jsonRequest<{ ok: true }>("/purge", {
    id: experiment.id,
    expectedSlug: experiment.slug,
  })
}

export async function downloadExperiment(experiment: ManagedExperiment) {
  const response = await request("/export", {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: experiment.id,
      expectedSlug: experiment.slug,
    }),
  })
  if (!response.ok) throw await responseError(response)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${experiment.slug}.vector-lab.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function importExperiment(
  file: Blob,
  mode: ImportMode
): Promise<ImportSuccess | ImportConflict> {
  const response = await request(`/import?mode=${mode}`, {
    headers: { "content-type": "application/zip" },
    body: file,
  })
  if (response.status === 409) {
    const body = (await response.json()) as ImportConflict | ManagementError
    if ("conflict" in body && body.conflict) return body
    throw new ManagementRequestError(
      "error" in body ? body.error : "Import conflict",
      "error" in body ? body.code : undefined
    )
  }
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<ImportSuccess>
}
