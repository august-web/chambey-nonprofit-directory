import { Db } from "mongodb";
import { RawBmfRecord, Organization } from "../types.js";
import { IngestLogEntry } from "../types.js";

function normalizeEin(raw: string): string {
  return raw.replace(/\D/g, "").padStart(9, "0");
}

function parseRulingDate(raw: string): string | null {
  const cleaned = raw.trim();
  if (cleaned.length !== 6 || !/^\d{6}$/.test(cleaned)) return null;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}`;
}

function parseFloatSafe(raw: string): number | null {
  const cleaned = raw.trim();
  if (cleaned.length === 0) return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function splitClassification(raw: string): string[] | null {
  const cleaned = raw.trim();
  if (cleaned.length === 0 || cleaned === "0") return null;
  return cleaned.split(/\s+/).filter(Boolean);
}

function nullIfEmpty(val: string): string | null {
  const trimmed = val.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeBmfRecord(
  raw: RawBmfRecord,
  sourceFile: string
): Organization {
  const now = new Date();
  const ein = normalizeEin(raw.EIN);

  return {
    ein,
    name: nullIfEmpty(raw.NAME) ?? "",
    inCareOfName: nullIfEmpty(raw.ICO),
    address: {
      street: nullIfEmpty(raw.STREET),
      city: nullIfEmpty(raw.CITY),
      state: nullIfEmpty(raw.STATE),
      zip: nullIfEmpty(raw.ZIP),
      country: raw.STATE === "XX" ? "Non-US" : "US",
    },
    taxExemptStatus: {
      subsectionCode: nullIfEmpty(raw.SUBSECTION),
      classificationCodes: splitClassification(raw.CLASSIFICATION),
      organizationCode: nullIfEmpty(raw.ORGANIZATION),
      statusCode: nullIfEmpty(raw.STATUS),
      foundationCode: nullIfEmpty(raw.FOUNDATION),
      deductibilityCode: nullIfEmpty(raw.DEDUCTIBILITY),
      rulingDate: parseRulingDate(raw.RULING),
    },
    revocationStatus: {
      onAutoRevocationList: false,
      revocationDate: null,
      revocationPostingDate: null,
      exemptionReinstatementDate: null,
    },
    category: {
      nteeCode: nullIfEmpty(raw.NTEE_CD),
    },
    financials: {
      assetAmount: parseFloatSafe(raw.ASSET_AMT),
      incomeAmount: parseFloatSafe(raw.INCOME_AMT),
      revenueAmount: parseFloatSafe(raw.REVENUE_AMT),
      taxPeriod: nullIfEmpty(raw.TAX_PERIOD),
    },
    provenance: {
      sourceDataset: "EO_BMF",
      sourceFile,
      lastUpdated: now.toISOString(),
    },
    createdAt: now,
    updatedAt: now,
  };
}

export async function loadCanonical(
  db: Db,
  organizations: Organization[]
): Promise<IngestLogEntry> {
  const orgs = db.collection<Organization>("organizations");

  const log: IngestLogEntry = {
    state: "canonical",
    recordsRead: organizations.length,
    recordsInserted: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    duplicatesFound: 0,
  };

  if (organizations.length === 0) return log;

  const bulkOps = organizations.map((org) => {
    const { createdAt: _ignore, ...setFields } = org;
    return {
      updateOne: {
        filter: { ein: org.ein },
        update: { $set: setFields, $setOnInsert: { createdAt: new Date() } },
        upsert: true,
      },
    };
  });

  const result = await orgs.bulkWrite(bulkOps, { ordered: false });
  log.recordsInserted = result.upsertedCount;
  log.recordsUpdated = result.modifiedCount;

  return log;
}
