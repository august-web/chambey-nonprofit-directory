export const DEFAULT_STATES = ["DE", "VT"];

export const ALL_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "XX",
];

export function getBmfUrl(state: string): string {
  return `https://www.irs.gov/pub/irs-soi/eo_${state.toLowerCase()}.csv`;
}

export const REVOCATION_ZIP_URL =
  "https://apps.irs.gov/pub/epostcard/data-download-revocation.zip";

export const REVOCATION_FILE_INSIDE_ZIP = "data-download-revocation.txt";

export const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
export const DB_NAME = process.env.DB_NAME ?? "nonprofit_directory";
export const PORT = parseInt(process.env.PORT ?? "3000", 10);
export const RAW_DIR = "data/raw";
export const LOG_DIR = "data/logs";
export const SAMPLE_DIR = "data/sample";
