/** Shared vocabulary for content classification. Kept in one place so the
 *  filter chips, editor dropdowns and DB check constraints never drift apart. */

export const COUNTRIES = [
  { value: "all", label: "All countries", short: "Nordics" },
  { value: "dk", label: "Denmark", short: "Denmark" },
  { value: "no", label: "Norway", short: "Norway" },
  { value: "se", label: "Sweden", short: "Sweden" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["value"];

export const COUNTRY_VALUES = COUNTRIES.map((c) => c.value) as CountryCode[];

export function countryLabel(code: string | null | undefined): string {
  return COUNTRIES.find((c) => c.value === code)?.short ?? "Nordics";
}

export const CATEGORIES = [
  "Visas & Residence",
  "Jobs & Work",
  "Culture & Social",
  "Housing",
  "Money & Tax",
  "Health & Family",
  "Language",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Chip rows on the Discussions page and the article index. */
export const TOPIC_FILTERS = ["All topics", ...CATEGORIES] as const;

export const REPORT_REASONS = [
  "Spam or advertising",
  "Harassment or abuse",
  "Misinformation",
  "Off-topic",
  "Something else",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/** Comment nesting deeper than this is flattened in the UI so that narrow
 *  screens don't collapse into a column of single words. */
export const MAX_COMMENT_DEPTH = 3;

export const PAGE_SIZE = 10;
