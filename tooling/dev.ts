export {}

const fallbackPort = process.env.PORTLESS_FALLBACK_PORT ?? "2187"
const tld = process.env.PORTLESS_TLD ?? "vector.dev"
const portlessEnv = { ...process.env, PORTLESS_TLD: tld }

function run(command: string[]) {
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

if (!Bun.which("portless")) {
  console.error(
    "Portless is required. Install it with: npm install -g portless"
  )
  process.exit(1)
}

if (process.env.PORTLESS_PORT) {
  const status = await run(["portless", "proxy", "start"])
  if (status !== 0) process.exit(status)
} else {
  const diagnosis = await inspectPortless()
  const standardPortConflict = diagnosis.includes(
    "Port 443 is in use, but it is not a portless proxy."
  )

  if (standardPortConflict) {
    console.warn(
      `Standard HTTPS port 443 is occupied; starting Portless on shared fallback port ${fallbackPort}.`
    )
    const fallbackStatus = await run([
      "portless",
      "proxy",
      "start",
      "--port",
      fallbackPort,
    ])
    if (fallbackStatus !== 0) process.exit(fallbackStatus)
  } else {
    const defaultStatus = await run(["portless", "proxy", "start"])
    if (defaultStatus !== 0) process.exit(defaultStatus)
  }
}

process.exit(await run(["bun", "run", "dev:apps"]))
