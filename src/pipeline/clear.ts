import { getDb, closeConnection } from "../db/connection.js";

export async function runClear(): Promise<void> {
  const db = await getDb();
  const collections = ["organizations", "raw_bmf_records"];
  for (const name of collections) {
    try {
      await db.collection(name).drop();
      console.log(`Dropped collection: ${name}`);
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? String(err);
      if (msg.includes("ns not found")) {
        console.log(`Collection ${name} does not exist, skipping`);
      } else {
        throw err;
      }
    }
  }
  console.log("Cleared. Database ready for re-ingest.");
}
