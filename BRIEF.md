# Technical Brief — Chambey IRS Nonprofit Directory (Phase 0)

## Data Sources Used

### 1. EO BMF (Exempt Organizations Business Master File Extract) — PRIMARY

- **Source**: https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf
- **Format**: CSV, one file per state + DC + PR + international
- **URL pattern**: `https://www.irs.gov/pub/irs-soi/eo_{state}.csv`
- **Frequency**: Updated monthly by the IRS
- **Contents**: All organizations that have received a determination of tax-exempt status. ~30 fields including EIN, name, address, subsection code, NTEE classification, financials, and ruling date.
- **Why primary**: It is the authoritative, cumulative registry of all IRS-recognized tax-exempt organizations. Every other data source joins to it.

### 2. Automatic Revocation of Exemption List — JOIN

- **Source**: https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads
- **Format**: Pipe-delimited ASCII text inside a ZIP archive
- **ZIP URL**: `https://apps.irs.gov/pub/epostcard/data-download-revocation.zip`
- **Fields**: EIN, legal name, address, exemption type, revocation date, posting date, reinstatement date
- **Frequency**: Updated monthly
- **Why joined**: Enables flagging of organizations that lost exemption due to non-filing. Critically, presence on this list does NOT mean currently revoked — reinstatement is a separate date field.

### 3. Pub 78 Data — NOT INGESTED (Phase 0 out of scope)

- **Format**: Pipe-delimited, similar structure to revocation file
- **Purpose**: Confirms which organizations are eligible to receive tax-deductible charitable contributions
- **Why skipped**: Adds complexity to the deductibility field but the BMF already includes a `DEDUCTIBILITY` column that covers the same information for most use cases. A Pub 78 join would refine accuracy for a subset of orgs.

### 4. Form 990 Data — EXPLICITLY OUT OF SCOPE

- Not ingested in Phase 0. Listed as a recommended next step for Phase 1.

## Access Method & Compliance

- **Bulk download only**: All data is obtained via official IRS bulk download URLs. No scraping of `apps.irs.gov` or any web interface.
- **Public data**: All data sources are public domain information released by the US Treasury Department.
- **Attribution**: The IRS should be cited as the source. Suggested attribution: "Source: IRS Exempt Organizations Business Master File Extract. The IRS makes this data available as a public service."
- **Revocation-date semantics**: An EIN appearing on the auto-revocation list does not necessarily mean the organization is currently revoked. The `exemptionReinstatementDate` field captures reinstatements. Always check the EO BMF `STATUS` field for current exempt status.

## Pipeline Stages

1. **Download** — Fetch CSV files from IRS to `data/raw/` (one per state/territory)
2. **Raw load** — Parse BMF CSV into `raw_bmf_records` collection (original field names preserved)
3. **Normalize** — Transform raw BMF records into canonical schema
4. **Load canonical** — Upsert into `organizations` collection (idempotent by EIN)
5. **Download revocation file** — Fetch and cache the auto-revocation list (pipe-delimited TXT, ~137MB)
6. **Index** — Create MongoDB `text`, compound, and single-field indexes on organizations
7. **Join revocation** — Read the revocation file directly, batch-match EINs, update revocation flags on organizations (no MongoDB storage of raw revocation records — saves ~200MB)
8. **Log** — Write ingest stats to console and `data/logs/ingest-<timestamp>.json`

## Current Dataset Status (as of July 2026)

| Metric | Value |
|--------|-------|
| Total canonical organizations | **1,974,831** |
| Raw BMF records | **1,974,883** |
| Organizations on revocation list | **159,938** |
| States + territories covered | **55** (all 50 states + DC + PR + VI + GU + MP + AS + FM + MH + PW + international) |
| Largest state | CA: 203,528 |
| Active orgs (status 01) | 1,966,684 |
| Revocation file entries | 1,206,628 |

## Known Limitations

- **No Form 990**: Financial fields are limited to `ASSET_AMT`, `INCOME_AMT`, `REVENUE_AMT` from the BMF. Form 990 provides much richer financial data (revenue breakdowns, expenses, compensation, grants).
- **No NTEE-to-category mapping**: NTEE codes are stored raw (e.g. "T20"). A lookup table mapping codes to human-readable categories has not been implemented.
- **No Pub 78 join**: The Pub 78 dataset could refine deductibility information for potential donors.
- **No geocoding**: Addresses are stored as text. No lat/lng or census tract enrichment.
- **Single-threaded download**: Each state file is downloaded sequentially (~2 hours for all states, bounded by IRS server response time).
- **Disk space**: MongoDB with the full dataset requires ~2-3 GB of storage. Ensure adequate free space before running `--states=ALL`.

## Recommended Next Steps

1. **Pub 78 join** — Download pipe-delimited Pub 78 data, join by EIN, add `pub78Eligible` field.
2. **NTEE category labels** — Import the Urban Institute's NTEE category table and add `category.nteeLabel`.
3. **Form 990 financials** — Download IRS Form 990 e-file data (XML, via AWS Open Data Registry). Parse selected fields to enrich financial profiles.
4. **Geocoding** — Use the Census Geocoder or a GIS service to add lat/lng coordinates.
5. **Litany integration** — Pipe canonical records into Litany's entity-resolution pipeline for cross-referencing.
6. **Scheduled refreshes** — Cron or similar to re-run ingestion monthly when IRS publishes updated files.
7. **Search enhancements** — Autocomplete, fuzzy matching, advanced filtering (asset range, ruling date range, deduction eligibility).
8. **Improved revocation-date parsing** — Some date formats in the revocation file may not be parsed; a more robust date parser (e.g. `date-fns` with locale support) could improve match rate.
