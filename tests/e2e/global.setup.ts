import { resetDb, cleanupTestData } from "./scripts/_db.mjs"

export default async function globalSetup() {
  await resetDb()
  await cleanupTestData()
}
