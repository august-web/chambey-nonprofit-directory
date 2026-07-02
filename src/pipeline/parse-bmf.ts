import * as fs from "node:fs";
import { parse } from "csv-parse/sync";
import { Db } from "mongodb";
import { RawBmfRecord, IngestLogEntry } from "../types.js";

const BMF_COLUMNS = [
  "EIN", "NAME", "ICO", "STREET", "CITY", "STATE", "ZIP", "GROUP",
  "SUBSECTION", "AFFILIATION", "CLASSIFICATION", "RULING", "DEDUCTIBILITY",
  "FOUNDATION", "ACTIVITY", "ORGANIZATION", "STATUS", "TAX_PERIOD",
  "ASSET_CD", "INCOME_CD", "FILING_REQ_CD", "PF_FILING_REQ_CD", "ACCT_PD",
  "ASSET_AMT", "INCOME_AMT", "REVENUE_AMT", "NTEE_CD", "SORT_NAME",
];

export async function parseAndLoadBmf(
  db: Db,
  filePath: string,
  state: string
): Promise<IngestLogEntry> {
  const raw = db.collection<RawBmfRecord>("raw_bmf_records");
  const content = fs.readFileSync(filePath, "utf-8");
  const records: Record<string, string>[] = parse(content, {
    columns: BMF_COLUMNS,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  const log: IngestLogEntry = {
    state,
    recordsRead: records.length,
    recordsInserted: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    duplicatesFound: 0,
  };

  const now = new Date().toISOString();
  const sourceFile = `eo_${state.toLowerCase()}.csv`;

  let batch: RawBmfRecord[] = [];
  for (const row of records) {
    if (!row.EIN || row.EIN.trim().length === 0) {
      log.recordsSkipped++;
      continue;
    }

    const doc: RawBmfRecord = {
      EIN: row.EIN.trim(),
      NAME: row.NAME ?? "",
      ICO: row.ICO ?? "",
      STREET: row.STREET ?? "",
      CITY: row.CITY ?? "",
      STATE: row.STATE ?? "",
      ZIP: row.ZIP ?? "",
      GROUP: row.GROUP ?? "",
      SUBSECTION: row.SUBSECTION ?? "",
      AFFILIATION: row.AFFILIATION ?? "",
      CLASSIFICATION: row.CLASSIFICATION ?? "",
      RULING: row.RULING ?? "",
      DEDUCTIBILITY: row.DEDUCTIBILITY ?? "",
      FOUNDATION: row.FOUNDATION ?? "",
      ACTIVITY: row.ACTIVITY ?? "",
      ORGANIZATION: row.ORGANIZATION ?? "",
      STATUS: row.STATUS ?? "",
      TAX_PERIOD: row.TAX_PERIOD ?? "",
      ASSET_CD: row.ASSET_CD ?? "",
      INCOME_CD: row.INCOME_CD ?? "",
      FILING_REQ_CD: row.FILING_REQ_CD ?? "",
      PF_FILING_REQ_CD: row.PF_FILING_REQ_CD ?? "",
      ACCT_PD: row.ACCT_PD ?? "",
      ASSET_AMT: row.ASSET_AMT ?? "",
      INCOME_AMT: row.INCOME_AMT ?? "",
      REVENUE_AMT: row.REVENUE_AMT ?? "",
      NTEE_CD: row.NTEE_CD ?? "",
      SORT_NAME: row.SORT_NAME ?? "",
      _sourceFile: sourceFile,
      _ingestedAt: now,
    };
    batch.push(doc);
  }

  if (batch.length > 0) {
    const bulkOps = batch.map((doc) => ({
      updateOne: {
        filter: { EIN: doc.EIN, _sourceFile: doc._sourceFile },
        update: { $set: doc },
        upsert: true,
      },
    }));
    const result = await raw.bulkWrite(bulkOps, { ordered: false });
    log.recordsInserted = result.upsertedCount;
    log.recordsUpdated = result.modifiedCount;
    log.duplicatesFound = log.recordsRead - batch.length;
  }

  return log;
}
