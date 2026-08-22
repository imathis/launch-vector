export const portlessTld = process.env.PORTLESS_TLD ?? "vector.dev"

const fallbackPort = process.env.PORTLESS_FALLBACK_PORT ?? "2187"

export const portlessEnv = {
  ...process.env,
  PORTLESS_TLD: portlessTld,
}

async function run(command: string[]) {
  const child = Bun.spawn(command, {
    env: portlessEnv,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })

  return child.exited
}

async function inspectPortless() {
  const child = Bun.spawn(["portless", "doctor"], {
    env: portlessEnv,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])

  return `${stdout}\n${stderr}`
}

export async function ensurePortlessProxy() {
  if (!Bun.which("portless")) {
    throw new Error("Portless is required. Run: just setup")
  }

  if (process.env.PORTLESS_PORT) {
    const status = await run(["portless", "proxy", "start"])
    if (status !== 0) throw new Error("Could not start the Portless proxy")
    return
  }

  const diagnosis = await inspectPortless()
  if (diagnosis.includes("Proxy is responding on port")) return

  const standardPortConflict = diagnosis.includes(
    "Port 443 is in use, but it is not a portless proxy."
  )

  if (standardPortConflict) {
    console.warn(
      `Standard HTTPS port 443 is occupied; using shared fallback port ${fallbackPort}.`
    )
    const status = await run([
      "portless",
      "proxy",
      "start",
      "--port",
      fallbackPort,
    ])
    if (status !== 0) throw new Error("Could not start the Portless proxy")
    return
  }

  const status = await run(["portless", "proxy", "start"])
  if (status !== 0) throw new Error("Could not start the Portless proxy")
}
