import * as fs from "node:fs";
import { Db } from "mongodb";
import { RawRevocationRecord, IngestLogEntry } from "../types.js";

const REVOCATION_FIELDS = [
  "EIN", "LegalName", "DoingBusinessAsName", "Address", "City",
  "State", "ZIPCode", "Country", "ExemptionType", "RevocationDate",
  "RevocationPostingDate", "ExemptionReinstatementDate",
];

export async function parseAndLoadRevocation(
  db: Db,
  filePath: string
): Promise<IngestLogEntry> {
  const raw = db.collection<RawRevocationRecord>("raw_revocation_records");
  const content = fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  const log: IngestLogEntry = {
    state: "revocation",
    recordsRead: lines.length,
    recordsInserted: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    duplicatesFound: 0,
  };

  const now = new Date().toISOString();
  const sourceFile = "data-download-revocation.txt";

  let batch: RawRevocationRecord[] = [];
  for (const line of lines) {
    const parts = line.split("|");
    if (parts.length < 12) {
      log.recordsSkipped++;
      continue;
    }

    const doc: RawRevocationRecord = {
      EIN: parts[0].trim(),
      LegalName: parts[1]?.trim() ?? "",
      DoingBusinessAsName: parts[2]?.trim() ?? "",
      Address: parts[3]?.trim() ?? "",
      City: parts[4]?.trim() ?? "",
      State: parts[5]?.trim() ?? "",
      ZIPCode: parts[6]?.trim() ?? "",
      Country: parts[7]?.trim() ?? "",
      ExemptionType: parts[8]?.trim() ?? "",
      RevocationDate: parts[9]?.trim() ?? "",
      RevocationPostingDate: parts[10]?.trim() ?? "",
      ExemptionReinstatementDate: parts[11]?.trim() ?? "",
      _sourceFile: sourceFile,
      _ingestedAt: now,
    };
    batch.push(doc);
  }

  if (batch.length > 0) {
    const BATCH_SIZE = 10000;
    let inserted = 0;
    let updated = 0;
    for (let i = 0; i < batch.length; i += BATCH_SIZE) {
      const chunk = batch.slice(i, i + BATCH_SIZE);
      const bulkOps = chunk.map((doc) => ({
        updateOne: {
          filter: { EIN: doc.EIN },
          update: { $set: doc },
          upsert: true,
        },
      }));
      const result = await raw.bulkWrite(bulkOps, { ordered: false });
      inserted += result.upsertedCount;
      updated += result.modifiedCount;
      if ((i / BATCH_SIZE) % 5 === 0) {
        process.stdout.write(`  [revocation] ${Math.min(i + BATCH_SIZE, batch.length)}/${batch.length}\r`);
      }
    }
    log.recordsInserted = inserted;
    log.recordsUpdated = updated;
    process.stdout.write(`  [revocation] ${inserted} inserted, ${updated} updated, ${batch.length} total\n`);
  }

  return log;
}
