import { cleanupTestData } from "./_db.mjs"

await cleanupTestData()

console.log("E2E database cleaned")
