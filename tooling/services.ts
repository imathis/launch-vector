import { lookup } from "node:dns/promises"
import { unlink } from "node:fs/promises"
import path from "node:path"

import { ensurePortlessProxy, portlessEnv, portlessTld } from "./portless"

const root = path.resolve(import.meta.dir, "..")
const configPath = path.join(root, "process-compose.yaml")
const socketPath = path.join(root, ".process-compose.sock")

const services = {
  demo: { route: "demo" },
  docs: { route: "ui" },
  lab: { route: "lab" },
} as const

type ServiceName = keyof typeof services

const aliases: Record<string, ServiceName> = {
  demo: "demo",
  web: "demo",
  docs: "docs",
  ui: "docs",
  lab: "lab",
}

const processCompose = Bun.which("process-compose")
const connectionArgs = ["--use-uds", "--unix-socket", socketPath]

function serviceName(value?: string): ServiceName | undefined {
  if (!value) return undefined

  const name = aliases[value.toLowerCase()]
  if (!name) {
    throw new Error(`Unknown app "${value}". Choose: demo, docs, or lab.`)
  }

  return name
}

function requireProcessCompose() {
  if (!processCompose) {
    throw new Error("Process Compose is required. Run: just setup")
  }

  return processCompose
}

async function capture(args: string[]) {
  const child = Bun.spawn(
    [requireProcessCompose(), ...connectionArgs, ...args],
    {
      cwd: root,
      env: portlessEnv,
      stdout: "pipe",
      stderr: "pipe",
    }
  )
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])

  return { stdout, stderr, exitCode }
}

async function run(args: string[]) {
  const child = Bun.spawn(
    [requireProcessCompose(), ...connectionArgs, ...args],
    {
      cwd: root,
      env: portlessEnv,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }
  )
  const exitCode = await child.exited
  if (exitCode !== 0) process.exit(exitCode)
}

async function runQuietly(args: string[]) {
  const result = await capture(args)
  if (result.exitCode === 0) return

  const output = `${result.stderr}\n${result.stdout}`.trim()
  throw new Error(output || "Process Compose command failed")
}

async function supervisorRunning() {
  const result = await capture(["list", "--output", "json"])
  return result.exitCode === 0
}

async function start(name: ServiceName) {
  const result = await capture(["process", "start", name])
  const output = `${result.stdout}\n${result.stderr}`.trim()

  if (result.exitCode !== 0 && !output.toLowerCase().includes("already")) {
    throw new Error(output || `Could not start ${name}`)
  }
}

async function routeUrl(route: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const child = Bun.spawn(["portless", "get", route], {
      cwd: root,
      env: portlessEnv,
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      child.exited,
    ])
    const url = stdout.trim()
    if (exitCode === 0 && url.startsWith("https://")) return url
    await Bun.sleep(100)
  }

  return `https://${route}.${portlessTld}`
}

async function syncHosts(routes: string[]) {
  if (portlessTld === "localhost" || portlessTld.endsWith(".localhost")) return

  const resolved = await Promise.all(
    routes.map(async (route) => {
      try {
        const addresses = await lookup(`${route}.${portlessTld}`, { all: true })
        return addresses.some(
          ({ address }) => address === "127.0.0.1" || address === "::1"
        )
      } catch {
        return false
      }
    })
  )
  if (resolved.every(Boolean)) return

  if (!process.stdin.isTTY) {
    console.warn(
      `Host synchronization needs an interactive terminal. Run: PORTLESS_TLD=${portlessTld} portless hosts sync`
    )
    return
  }

  const child = Bun.spawn(["portless", "hosts", "sync"], {
    cwd: root,
    env: portlessEnv,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  const exitCode = await child.exited
  if (exitCode !== 0) {
    console.warn(
      `Could not synchronize ${portlessTld} hostnames. Run: PORTLESS_TLD=${portlessTld} portless hosts sync`
    )
  }
}

async function printRoutes(selected: ServiceName[]) {
  await syncHosts(selected.map((service) => services[service].route))
  for (const service of selected) {
    const route = services[service].route
    console.log(`${service}: ${await routeUrl(route)}`)
  }
}

async function up(name?: ServiceName) {
  await ensurePortlessProxy()

  if (!(await supervisorRunning())) {
    await unlink(socketPath).catch(() => undefined)
    const selected = name ? [name] : Object.keys(services)
    await runQuietly([
      "up",
      "--config",
      configPath,
      "--detached",
      "--keep-project",
      ...selected,
    ])
  } else if (name) {
    await start(name)
  } else {
    for (const service of Object.keys(services) as ServiceName[]) {
      await start(service)
    }
  }

  const selected = name ? [name] : (Object.keys(services) as ServiceName[])
  await printRoutes(selected)
}

async function restart(name?: ServiceName) {
  if (!(await supervisorRunning())) {
    await up(name)
    return
  }

  const selected = name ? [name] : (Object.keys(services) as ServiceName[])
  for (const service of selected) {
    const result = await capture(["process", "restart", service])
    if (result.exitCode !== 0) await start(service)
  }
  await printRoutes(selected)
}

async function down(name?: ServiceName) {
  if (!(await supervisorRunning())) {
    console.log("No workspace services are running.")
    return
  }

  if (name) {
    await run(["process", "stop", name])
    return
  }

  await run(["down"])
  await unlink(socketPath).catch(() => undefined)
}

async function status() {
  if (!(await supervisorRunning())) {
    console.log("No workspace services are running.")
    return
  }

  await run(["list", "--output", "wide"])
}

async function logs(name?: ServiceName) {
  if (!(await supervisorRunning())) {
    console.log("No workspace services are running.")
    return
  }

  const selected = name ?? Object.keys(services).join(",")
  await run(["process", "logs", selected, "--follow", "--tail", "200"])
}

async function main() {
  const command = process.argv[2] ?? "up"
  const name = serviceName(process.argv[3])

  switch (command) {
    case "up":
      await up(name)
      break
    case "down":
      await down(name)
      break
    case "restart":
      await restart(name)
      break
    case "status":
      await status()
      break
    case "logs":
      await logs(name)
      break
    case "attach":
      if (!(await supervisorRunning())) {
        console.log("No workspace services are running.")
        return
      }
      await run(["attach"])
      break
    default:
      throw new Error(`Unknown service command "${command}".`)
  }
}

await main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
