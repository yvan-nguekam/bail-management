// Triggers a cron route of the running app, like a scheduler would.
// Usage: pnpm cron:lease-status  (reads CRON_SECRET and APP_URL/NEXTAUTH_URL from .env)
const job = process.argv[2]
if (!job) {
  console.error("Usage: node scripts/run-cron.mjs <job-name>")
  process.exit(1)
}

const secret = process.env.CRON_SECRET
if (!secret) {
  console.error("CRON_SECRET is not set (add it to .env)")
  process.exit(1)
}

const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"

try {
  const response = await fetch(`${baseUrl}/api/cron/${job}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body = await response.text()
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2))
  } catch {
    console.log(body)
  }
  process.exit(response.ok ? 0 : 1)
} catch (error) {
  console.error(`Could not reach ${baseUrl} — is the app running (pnpm dev)?`, error.message)
  process.exit(1)
}
