import * as fs from "node:fs";
import { parse } from "csv-parse/sync";
import { Db } from "mongodb";
import { Organization, IngestLogEntry } from "../types.js";
import { normalizeBmfRecord, loadCanonical } from "./normalize.js";

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

  const sourceFile = `eo_${state.toLowerCase()}.csv`;

  const organizations: Organization[] = [];
  for (const row of records) {
    if (!row.EIN || row.EIN.trim().length === 0) {
      log.recordsSkipped++;
      continue;
    }

    const raw = {
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
    };

    const org = normalizeBmfRecord(raw as any, sourceFile);
    organizations.push(org);
  }

  const canonicalLog = await loadCanonical(db, organizations);
  log.recordsInserted = canonicalLog.recordsInserted;
  log.recordsUpdated = canonicalLog.recordsUpdated;

  return log;
}
