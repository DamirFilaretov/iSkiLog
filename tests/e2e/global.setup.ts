import { runSqlFromFile, cleanupTestData } from "./scripts/_db.mjs"

export default async function globalSetup() {
  await runSqlFromFile("../db/schema.sql")
  await cleanupTestData()
}
