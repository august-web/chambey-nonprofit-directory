# Chambey Nonprofit Directory — Phase 0

Ingest IRS nonprofit data → MongoDB → searchable API. Phase 0 prototype covering all 50 US states + territories (~1.97M organizations, 160K flagged on revocation list).

## Quick Start

### Prerequisites

- **Node.js** v18+ (v22+ recommended)
- **MongoDB** installed and running on `localhost:27017`

### 1. MongoDB Setup (Windows)

1. Download **MongoDB Community Server** from https://www.mongodb.com/try/download/community
2. Run the installer — select **Complete** setup, install as a **Windows Service**
3. MongoDB starts automatically and listens on `mongodb://localhost:27017`
4. Verify: `mongosh` or check Services panel for "MongoDB Server" running

### 2. Install & Ingest

```bash
# Install dependencies
npm install

# Ingest default states (DE + VT) + auto-revocation data
npm run ingest

# Ingest ALL states
npm run ingest -- --states=ALL

# Ingest specific states
npm run ingest -- --states=CA,NY,TX
```

### 3. Start the API Server

```bash
npm run serve
```

### 4. Search

```
GET http://localhost:3000/organizations/search?name=foundation&state=DE
GET http://localhost:3000/organizations/010548657
GET http://localhost:3000/stats
```

Or open http://localhost:3000 in a browser for the minimal search UI.

## Demo Walkthrough

Once the API is running, here's how to verify and explore the data:

### Check the stats

```
GET http://localhost:3000/stats
```

Returns total organizations (~1.97M), breakdown by state, and count on the revocation list (~160K).

### Search by organization name

```
GET /organizations/search?name=red+cross&limit=5
```

MongoDB `$text` search across the `name` field. Supports partial/word matching.

### Filter by state and city

```
GET /organizations/search?state=CA&city=San+Francisco&limit=10
```

Compound index on `address.state + address.city` makes this fast even at scale.

### Look up by EIN

```
GET /organizations/010548657
```

Returns the full canonical organization record including address, tax status, financials, and revocation data.

### Filter by BMF status code

```
GET /organizations/search?status=01&state=NY&limit=10
```

Status `01` = active/paying. Status `02` = terminated. The revocation list status is stored separately under `revocationStatus`.

### Check revocation data

Revocation data from the IRS Auto-Revocation list is joined into each organization record:

```json
{
  "revocationStatus": {
    "onAutoRevocationList": true,
    "revocationDate": "2023-05-15",
    "revocationPostingDate": "2023-06-01",
    "exemptionReinstatementDate": null
  }
}
```

### What the ingestion pipeline does

1. Downloads IRS EO BMF `.csv` files per state
2. Parses CSV → inserts raw records into `raw_bmf_records`
3. Normalizes → upserts canonical records into `organizations`
4. Downloads IRS Auto-Revocation list (pipe-delimited, ~1.2M records)
5. Joins revocation data by EIN → flags matching orgs
6. Creates search indexes (`text`, compound, single-field)
7. Writes an ingestion log to `data/logs/`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run ingest` | Run ingestion pipeline (default: DE + VT) |
| `npm run ingest -- --states=ALL` | Ingest all 50 states + DC + PR + territories |
| `npm run ingest -- --states=CA,NY` | Ingest specific states |
| `npm run serve` | Start Express API on port 3000 |
| `npm run build` | Compile TypeScript to `dist/` |

## API Endpoints

### `GET /organizations/search`

Query parameters: `name`, `ein`, `state`, `city`, `zip`, `status`, `category`, `limit`, `skip`

Returns `{ total, limit, skip, results }`.

### `GET /organizations/:ein`

Returns a single canonical organization record by EIN.

### `GET /stats`

Returns `{ totalOrganizations, organizationsByState, organizationsOnRevocationList }`.

## Project Structure

```
├── src/
│   ├── cli.ts              # Entry point: ingest or serve
│   ├── config.ts           # Environment config, state lists, URLs
│   ├── types.ts            # TypeScript interfaces for all schemas
│   ├── db/
│   │   ├── connection.ts   # MongoDB connection singleton
│   │   └── indexes.ts      # Index creation
│   ├── pipeline/
│   │   ├── download.ts     # Fetch files from IRS
│   │   ├── parse-bmf.ts    # CSV → raw_bmf_records
│   │   ├── parse-revocation.ts  # Pipe-delimited parser (kept for reference)
│   │   ├── normalize.ts    # Raw → canonical schema
│   │   ├── join.ts         # Merge revocation data by EIN (reads file directly)
│   │   └── runner.ts       # Orchestrate pipeline stages
│   └── api/
│       └── routes.ts       # Express routes
├── public/
│   └── index.html          # Minimal search UI
├── data/
│   ├── raw/                # Downloaded IRS files (gitignored)
│   ├── sample/             # Committed sample records
│   └── logs/               # Ingestion log JSON files
├── SCHEMA.md               # Canonical schema documentation
├── BRIEF.md                # Technical brief
└── README.md               # This file
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `nonprofit_directory` | Database name |
| `PORT` | `3000` | API server port |

## Design Decisions

- **csv-parse** for CSV parsing (robust with quoted fields)
- **Native MongoDB driver** (not Mongoose) — schema is enforced in TypeScript
- **tsx** for TypeScript execution — no build step during development
- **Upsert by EIN** — re-running ingestion is idempotent
- **Raw collections preserved** — `raw_bmf_records` kept permanently; revocation raw file cached on disk to save space
- **Revocation dates preserved** — no collapsing to a single boolean; reinstatement date is stored separately
- **Revocation file joined in-memory** — reads ~137MB text file directly instead of storing 1.2M revocation records in MongoDB (saves ~200MB)
