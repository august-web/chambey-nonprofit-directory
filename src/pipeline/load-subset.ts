import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { getDb, closeConnection } from "../db/connection.js";
import { createIndexes } from "../db/indexes.js";

const EXPORT_FILE = "data/export/ca-subset.json.gz";
const BATCH_SIZE = 5000;

export async function runLoadSubset(): Promise<void> {
  console.log(`\n=== Load CA subset into MongoDB ===`);
  console.log(`Source: ${EXPORT_FILE}\n`);

  const db = await getDb();
  const orgs = db.collection("organizations");

  await orgs.createIndex({ ein: 1 }, { unique: true });

  const gunzip = createGunzip();
  const stream = createReadStream(EXPORT_FILE).pipe(gunzip);

  let buffer = "";
  let count = 0;
  let batch: Record<string, unknown>[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await orgs.insertMany(batch, { ordered: false });
    count += batch.length;
    batch = [];
    console.log(`  ${count.toLocaleString()} loaded...`);
  };

  for await (const chunk of stream) {
    buffer += chunk.toString("utf8");
    let newlineIdx = buffer.indexOf("\n");
    while (newlineIdx !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (line) {
        const doc = JSON.parse(line) as Record<string, unknown>;
        delete doc._id;
        batch.push(doc);
        if (batch.length >= BATCH_SIZE) {
          await flush();
        }
      }
      newlineIdx = buffer.indexOf("\n");
    }
  }

  if (buffer.trim()) {
    const doc = JSON.parse(buffer.trim()) as Record<string, unknown>;
    delete doc._id;
    batch.push(doc);
  }
  await flush();

  console.log(`\nCreating indexes...`);
  await createIndexes(db);

  console.log(`\nDone. ${count.toLocaleString()} organizations loaded.`);
}
