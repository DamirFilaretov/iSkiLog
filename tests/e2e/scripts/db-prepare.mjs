import { cleanupTestData, resetDb } from "./_db.mjs"

await resetDb()
await cleanupTestData()

console.log("E2E database prepared")
