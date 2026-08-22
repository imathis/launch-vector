export const portlessTld =
  process.env.VECTOR_TLD ?? process.env.PORTLESS_TLD ?? "vector.localhost"
export const portlessPort =
  process.env.VECTOR_PORT ?? process.env.PORTLESS_PORT ?? "2187"

const portNumber = Number(portlessPort)
if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
  throw new Error(`Invalid Vector port: ${portlessPort}`)
}

export const portlessEnv = {
  ...process.env,
  VECTOR_TLD: portlessTld,
  VECTOR_PORT: portlessPort,
  PORTLESS_TLD: portlessTld,
  PORTLESS_PORT: portlessPort,
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

  const diagnosis = await inspectPortless()
  const proxyMatches =
    diagnosis.includes(`Proxy target: https://127.0.0.1:${portlessPort}`) &&
    diagnosis.includes(`Mode: HTTPS, .${portlessTld}`) &&
    diagnosis.includes("Proxy is responding on port")
  if (proxyMatches) return

  const runningPort = diagnosis.match(
    /Proxy target: https:\/\/127\.0\.0\.1:(\d+)/
  )?.[1]
  if (diagnosis.includes("Proxy is responding on port") && runningPort) {
    console.warn(
      `Restarting Portless with https://*.${portlessTld}:${portlessPort}.`
    )
    const stopStatus = await run([
      "portless",
      "proxy",
      "stop",
      "--port",
      runningPort,
    ])
    if (stopStatus !== 0) throw new Error("Could not reconfigure Portless")
  }

  const status = await run([
    "portless",
    "proxy",
    "start",
    "--port",
    portlessPort,
    "--tld",
    portlessTld,
  ])
  if (status !== 0) {
    throw new Error(
      `Could not start Portless on port ${portlessPort} for .${portlessTld}`
    )
  }
}
