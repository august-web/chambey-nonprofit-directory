import * as fs from "node:fs";
import * as path from "node:path";
import { Db } from "mongodb";
import { RAW_DIR } from "../config.js";

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

const REVOCATION_FIELDS = [
  "EIN", "LegalName", "DoingBusinessAsName", "Address", "City",
  "State", "ZIPCode", "Country", "ExemptionType", "RevocationDate",
  "RevocationPostingDate", "ExemptionReinstatementDate",
];

function normalizeIrsDate(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned || cleaned.length === 0) return null;
  const parts = cleaned.split("-");
  if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
    const mon = MONTH_MAP[parts[1].toLowerCase()];
    if (mon) return `${parts[2]}-${mon}-${parts[0]}`;
  }
  const slashParts = cleaned.split("/");
  if (slashParts.length === 3 && slashParts[0].length === 2 && slashParts[2].length === 4) {
    return `${slashParts[2]}-${slashParts[0]}-${slashParts[1]}`;
  }
  return null;
}

export async function joinRevocationData(db: Db): Promise<number> {
  const orgs = db.collection("organizations");
  const filePath = path.join(RAW_DIR, "data-download-revocation.txt");

  if (!fs.existsSync(filePath)) {
    console.log("  [join] No revocation file found, skipping join");
    return 0;
  }

  console.log("  [join] Reading revocation file...");
  const content = fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  console.log(`  [join] ${lines.length} revocation records loaded`);

  const BATCH_SIZE = 10000;
  let joinedCount = 0;
  let batch: { filter: any; update: any }[] = [];

  for (const line of lines) {
    const parts = line.split("|");
    if (parts.length < 12) continue;

    const ein = parts[0].replace(/\D/g, "").padStart(9, "0");
    const revocationDate = normalizeIrsDate(parts[9]);
    const revocationPostingDate = normalizeIrsDate(parts[10]);
    const exemptionReinstatementDate = normalizeIrsDate(parts[11]);

    const updates: Record<string, any> = {
      "revocationStatus.onAutoRevocationList": true,
    };
    if (revocationDate) updates["revocationStatus.revocationDate"] = revocationDate;
    if (revocationPostingDate) updates["revocationStatus.revocationPostingDate"] = revocationPostingDate;
    if (exemptionReinstatementDate) updates["revocationStatus.exemptionReinstatementDate"] = exemptionReinstatementDate;
    updates.updatedAt = new Date();

    batch.push({
      filter: { ein },
      update: { $set: updates },
    });

    if (batch.length >= BATCH_SIZE) {
      const result = await orgs.bulkWrite(
        batch.map((op) => ({ updateOne: op })),
        { ordered: false }
      );
      joinedCount += (result.matchedCount || 0);
      batch = [];
    }
  }

  if (batch.length > 0) {
    const result = await orgs.bulkWrite(
      batch.map((op) => ({ updateOne: op })),
      { ordered: false }
    );
    joinedCount += (result.matchedCount || 0);
  }

  console.log(`  [join] ${joinedCount} organizations flagged with revocation data`);
  return joinedCount;
}
