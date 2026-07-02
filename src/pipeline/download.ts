import * as fs from "node:fs";
import * as path from "node:path";
import { getBmfUrl, REVOCATION_ZIP_URL, RAW_DIR } from "../config.js";

export async function downloadBmfFile(
  state: string
): Promise<string> {
  const url = getBmfUrl(state);
  const dest = path.join(RAW_DIR, `eo_${state.toLowerCase()}.csv`);

  if (fs.existsSync(dest)) {
    console.log(`  [${state}] Already cached: ${dest}`);
    return dest;
  }

  console.log(`  [${state}] Downloading ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  fs.writeFileSync(dest, text, "utf-8");
  console.log(`  [${state}] Saved to ${dest} (${(text.length / 1024 / 1024).toFixed(1)} MB)`);
  return dest;
}

export async function ensureRevocationFile(): Promise<string> {
  const destZip = path.join(RAW_DIR, "data-download-revocation.zip");
  const destTxt = path.join(RAW_DIR, "data-download-revocation.txt");

  if (fs.existsSync(destTxt)) {
    console.log(`  [revocation] Already cached: ${destTxt}`);
    return destTxt;
  }

  console.log(`  [revocation] Downloading ${REVOCATION_ZIP_URL} ...`);
  const res = await fetch(REVOCATION_ZIP_URL);
  if (!res.ok) {
    throw new Error(`Failed to download revocation file: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destZip, buffer);
  console.log(`  [revocation] Saved zip to ${destZip}`);

  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip(destZip);
  const entry = zip.getEntry("data-download-revocation.txt");
  if (!entry) {
    throw new Error("data-download-revocation.txt not found inside zip");
  }
  fs.writeFileSync(destTxt, entry.getData().toString("utf-8"));
  fs.unlinkSync(destZip);
  console.log(`  [revocation] Extracted to ${destTxt}`);
  return destTxt;
}
