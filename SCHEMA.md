# Canonical Schema — `organizations` Collection

The canonical schema normalizes raw IRS BMF data into a structured, searchable document. Raw collections (`raw_bmf_records`, `raw_revocation_records`) are preserved permanently alongside the canonical collection.

## `organizations`

| Field | Type | Description |
|-------|------|-------------|
| `ein` | `string` | Employer Identification Number, normalized to 9 digits (no dashes). Primary key. |
| `name` | `string` | Organization name (from BMF `NAME`). |
| `inCareOfName` | `string \| null` | "In Care Of" name (BMF `ICO`). |
| `address.street` | `string \| null` | Street address (BMF `STREET`). |
| `address.city` | `string \| null` | City (BMF `CITY`). |
| `address.state` | `string \| null` | State code (BMF `STATE`). |
| `address.zip` | `string \| null` | ZIP code with +4 extension (BMF `ZIP`). |
| `address.country` | `string \| null` | "US" for domestic, "Non-US" for international (`eo_xx.csv`). |
| `taxExemptStatus.subsectionCode` | `string \| null` | IRS subsection code (BMF `SUBSECTION`), e.g. "03" for 501(c)(3). |
| `taxExemptStatus.classificationCodes` | `string[] \| null` | NTEE classification codes, space-separated in raw, stored as array (BMF `CLASSIFICATION`). |
| `taxExemptStatus.organizationCode` | `string \| null` | Organization type code (BMF `ORGANIZATION`). |
| `taxExemptStatus.statusCode` | `string \| null` | Exempt organization status code (BMF `STATUS`). |
| `taxExemptStatus.foundationCode` | `string \| null` | Foundation classification code (BMF `FOUNDATION`). |
| `taxExemptStatus.deductibilityCode` | `string \| null` | Deductibility code (BMF `DEDUCTIBILITY`). |
| `taxExemptStatus.rulingDate` | `string \| null` | Ruling date in `YYYY-MM` format (BMF `RULING`, raw `YYYYMM`). |
| `revocationStatus.onAutoRevocationList` | `boolean` | `true` if EIN appears in the Auto-Revocation of Exemption list. |
| `revocationStatus.revocationDate` | `string \| null` | Effective revocation date (`YYYY-MM-DD`). |
| `revocationStatus.revocationPostingDate` | `string \| null` | Date the revocation was posted to the list (`YYYY-MM-DD`). |
| `revocationStatus.exemptionReinstatementDate` | `string \| null` | Date exemption was reinstated, if applicable (`YYYY-MM-DD`). |
| `category.nteeCode` | `string \| null` | NTEE code (BMF `NTEE_CD`). |
| `financials.assetAmount` | `number \| null` | Total assets (BMF `ASSET_AMT`). |
| `financials.incomeAmount` | `number \| null` | Total income (BMF `INCOME_AMT`, may be negative). |
| `financials.revenueAmount` | `number \| null` | Form 990 revenue (BMF `REVENUE_AMT`, may be negative). |
| `financials.taxPeriod` | `string \| null` | Tax period end date in `YYYYMM` format (BMF `TAX_PERIOD`). |
| `provenance.sourceDataset` | `"EO_BMF"` | Always `"EO_BMF"` for Phase 0. |
| `provenance.sourceFile` | `string` | Source filename, e.g. `eo_de.csv`. |
| `provenance.lastUpdated` | `string` | ISO 8601 timestamp of ingestion. |
| `createdAt` | `Date` | When the canonical record was first created. |
| `updatedAt` | `Date` | When the canonical record was last updated. |

## Raw vs. Cleaned

**Raw collections** (`raw_bmf_records`, `raw_revocation_records`) preserve original field names, casing, and content exactly as received from the IRS. Additional fields `_sourceFile` and `_ingestedAt` track provenance.

**Canonical collection** (`organizations`) applies:
- EIN normalization (strip dashes, pad to 9 digits)
- Date parsing (YYYYMM → YYYY-MM, MM/DD/YYYY → YYYY-MM-DD)
- Classification splitting (space-separated string → string[])
- Financial number parsing (string → float, null on empty)
- Null coalescing (empty strings become null)
- Joining revocation data by EIN match

## Extension Notes

**Form 990 data**: A future `financials` expansion could include fields like `totalRevenue`, `totalExpenses`, `netAssets`, `compensation`, sourced from IRS Form 990 e-file data. A new `raw_990_records` collection would be added, with a normalization step populating an expanded `financials` sub-document.

**Pub 78 data**: The Pub 78 list confirms deductibility eligibility for a subset of 501(c)(3) orgs. A future `pub78Status` field could be added to the `taxExemptStatus` block, populated from the pipe-delimited Pub 78 download.

**All-states expansion**: The `--states=ALL` flag already downloads and processes every state file. No schema changes needed — the normalization is state-agnostic.
