import * as fs from "node:fs";
import * as path from "node:path";
import { Db } from "mongodb";
import { getDb, closeConnection } from "../db/connection.js";
import { createIndexes } from "../db/indexes.js";
import { downloadBmfFile, ensureRevocationFile } from "./download.js";
import { parseAndLoadBmf } from "./parse-bmf.js";
import { normalizeBmfRecord, loadCanonical } from "./normalize.js";
import { joinRevocationData } from "./join.js";
import {
  DEFAULT_STATES,
  ALL_STATES,
  LOG_DIR,
} from "../config.js";
import { RawBmfRecord, IngestLog, IngestLogEntry } from "../types.js";

export async function runIngest(states: string[]): Promise<void> {
  const useStates =
    states.length === 1 && states[0].toUpperCase() === "ALL"
      ? ALL_STATES
      : states.map((s) => s.toUpperCase());

  console.log(`\n=== IRS Nonprofit Directory Ingestion ===`);
  console.log(`States: ${useStates.join(", ")}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const db = await getDb();
  const log: IngestLog = {
    timestamp: new Date().toISOString(),
    states: useStates,
    entries: [],
    total: {
      recordsRead: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      duplicatesFound: 0,
    },
  };

  try {
    // Stage 0: Ensure indexes for fast upsert lookups
    const orgs = db.collection("organizations");
    const rawBmf = db.collection("raw_bmf_records");
    await orgs.createIndex({ ein: 1 }, { unique: true });
    await rawBmf.createIndex({ _sourceFile: 1 });
    await rawBmf.createIndex({ EIN: 1, _sourceFile: 1 });

    // Stage 1: Download & load BMF files
    for (const state of useStates) {
      try {
        const filePath = await downloadBmfFile(state);
        const bmfLog = await parseAndLoadBmf(db, filePath, state);
        printLogEntry(bmfLog);
        log.entries.push(bmfLog);
        accumulateLog(log.total, bmfLog);

        // Normalize and load canonical
        const raw = db.collection<RawBmfRecord>("raw_bmf_records");
        const rawRecords = await raw
          .find({ _sourceFile: `eo_${state.toLowerCase()}.csv` })
          .toArray();

        const canonical = rawRecords.map((r) =>
          normalizeBmfRecord(r, `eo_${state.toLowerCase()}.csv`)
        );

        const canonicalLog = await loadCanonical(db, canonical);
        printLogEntry(canonicalLog);
        log.entries.push(canonicalLog);
        accumulateLog(log.total, canonicalLog);
      } catch (err) {
        console.error(`  [${state}] FAILED: ${err}`);
      }
    }

    // Stage 2: Download revocation file (cached on disk, not loaded into MongoDB)
    await ensureRevocationFile();

    // Stage 3: Create indexes (before join so EIN lookups are fast)
    console.log(`\n--- Creating indexes ---`);
    await createIndexes(db);

    // Stage 4: Join revocation data onto canonical orgs (reads file directly)
    console.log(`\n--- Joining revocation data ---`);
    const joined = await joinRevocationData(db);
    console.log(`  Organizations flagged with revocation data: ${joined}`);

    // Print summary
    printSummary(log);

    // Write log file
    const logFile = path.join(LOG_DIR, `ingest-${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
    console.log(`\nLog written to ${logFile}`);
  } finally {
    await closeConnection();
  }
}

function printLogEntry(entry: IngestLogEntry): void {
  console.log(
    `  [${entry.state}] read=${entry.recordsRead} inserted=${entry.recordsInserted} updated=${entry.recordsUpdated} skipped=${entry.recordsSkipped}`
  );
}

function accumulateLog(
  total: IngestLog["total"],
  entry: IngestLogEntry
): void {
  total.recordsRead += entry.recordsRead;
  total.recordsInserted += entry.recordsInserted;
  total.recordsUpdated += entry.recordsUpdated;
  total.recordsSkipped += entry.recordsSkipped;
  total.duplicatesFound += entry.duplicatesFound;
}

function printSummary(log: IngestLog): void {
  console.log(`\n=== Ingestion Summary ===`);
  console.log(`Total records read: ${log.total.recordsRead}`);
  console.log(`Total records inserted: ${log.total.recordsInserted}`);
  console.log(`Total records updated: ${log.total.recordsUpdated}`);
  console.log(`Total records skipped: ${log.total.recordsSkipped}`);
  console.log(`Total duplicates found: ${log.total.duplicatesFound}`);
}
