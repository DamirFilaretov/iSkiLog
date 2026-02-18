import { cleanupTestData, runSqlFromFile } from "./_db.mjs"

await runSqlFromFile("../db/schema.sql")
await cleanupTestData()

console.log("E2E database prepared")
