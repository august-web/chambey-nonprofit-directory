export interface Address {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}

export interface TaxExemptStatus {
  subsectionCode: string | null;
  classificationCodes: string[] | null;
  organizationCode: string | null;
  statusCode: string | null;
  foundationCode: string | null;
  deductibilityCode: string | null;
  rulingDate: string | null;
}

export interface RevocationStatus {
  onAutoRevocationList: boolean;
  revocationDate: string | null;
  revocationPostingDate: string | null;
  exemptionReinstatementDate: string | null;
}

export interface Category {
  nteeCode: string | null;
}

export interface Financials {
  assetAmount: number | null;
  incomeAmount: number | null;
  revenueAmount: number | null;
  taxPeriod: string | null;
}

export interface Provenance {
  sourceDataset: "EO_BMF";
  sourceFile: string;
  lastUpdated: string;
}

export interface Organization {
  ein: string;
  name: string;
  inCareOfName: string | null;
  address: Address;
  taxExemptStatus: TaxExemptStatus;
  revocationStatus: RevocationStatus;
  category: Category;
  financials: Financials;
  provenance: Provenance;
  createdAt: Date;
  updatedAt: Date;
}

export interface RawBmfRecord {
  EIN: string;
  NAME: string;
  ICO: string;
  STREET: string;
  CITY: string;
  STATE: string;
  ZIP: string;
  GROUP: string;
  SUBSECTION: string;
  AFFILIATION: string;
  CLASSIFICATION: string;
  RULING: string;
  DEDUCTIBILITY: string;
  FOUNDATION: string;
  ACTIVITY: string;
  ORGANIZATION: string;
  STATUS: string;
  TAX_PERIOD: string;
  ASSET_CD: string;
  INCOME_CD: string;
  FILING_REQ_CD: string;
  PF_FILING_REQ_CD: string;
  ACCT_PD: string;
  ASSET_AMT: string;
  INCOME_AMT: string;
  REVENUE_AMT: string;
  NTEE_CD: string;
  SORT_NAME: string;
  _sourceFile: string;
  _ingestedAt: string;
}

export interface RawRevocationRecord {
  EIN: string;
  LegalName: string;
  DoingBusinessAsName: string;
  Address: string;
  City: string;
  State: string;
  ZIPCode: string;
  Country: string;
  ExemptionType: string;
  RevocationDate: string;
  RevocationPostingDate: string;
  ExemptionReinstatementDate: string;
  _sourceFile: string;
  _ingestedAt: string;
}

export interface IngestLogEntry {
  state: string;
  recordsRead: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  duplicatesFound: number;
}

export interface IngestLog {
  timestamp: string;
  states: string[];
  entries: IngestLogEntry[];
  total: {
    recordsRead: number;
    recordsInserted: number;
    recordsUpdated: number;
    recordsSkipped: number;
    duplicatesFound: number;
  };
}
