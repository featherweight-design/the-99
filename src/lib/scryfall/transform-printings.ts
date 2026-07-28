// Explicit shapes (kept in sync with the printings / skipped_printings tables) rather than
// schema imports: pure lib code stays free of DB imports, which is what keeps it unit-testable.
export type PrintingRow = {
  scryfallId: string;
  oracleId: string;
  setCode: string;
  collectorNumber: string;
  imageUri: string | null;
  imageUriSmall: string | null;
  finishes: string[];
  isVariant: boolean;
};

export type SkippedPrintingRow = { scryfallId: string; layout: string; name: string };

export type PrintingClassification =
  | { kind: "printing"; row: PrintingRow }
  | { kind: "skipped-layout"; row: SkippedPrintingRow }
  | { kind: "skipped-reversible" }
  | { kind: "skipped-digital" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Scryfall bulk JSON is untyped by design; classifyPrinting narrows it.
type Raw = Record<string, any>;

/** Layouts excluded from the catalog by transform.ts:11 — they have no row in `cards`. */
const SKIP_LAYOUTS = new Set(["token", "double_faced_token", "emblem", "art_series"]);

/**
 * Treatments that make a printing a poor default art choice. This is an explicit allowlist,
 * NOT a truthiness test on frame_effects/promo_types: `frame_effects: ["legendary"]` appears
 * on every ordinary legendary card, so a truthiness test would demote most commanders'
 * only sensible printing.
 */
const VARIANT_TREATMENTS = new Set(["showcase", "extendedart", "borderless", "etched"]);

function requiredString(raw: Raw, field: string): string {
  const value = raw[field];
  if (typeof value !== "string" || value === "") {
    throw new Error(`printing ${raw.id ?? "<unknown>"}: missing required field ${field}`);
  }
  return value;
}

function isVariant(raw: Raw): boolean {
  if (raw.border_color === "borderless") return true;
  // Both keys are ABSENT rather than [] when empty, so default before spreading.
  const tags: unknown[] = [...(raw.frame_effects ?? []), ...(raw.promo_types ?? [])];
  return tags.some((tag) => typeof tag === "string" && VARIANT_TREATMENTS.has(tag));
}

/**
 * Classifies one `default_cards` bulk entry.
 *
 * Deliberately does NOT filter on `lang`: the bulk file is already language-deduped ("every
 * card in English, or the printed language if the card is only available in one language"),
 * so an `en` filter would drop cards that have no English printing at all.
 */
export function classifyPrinting(raw: Raw): PrintingClassification {
  const layout = typeof raw.layout === "string" ? raw.layout : "";

  if (SKIP_LAYOUTS.has(layout)) {
    // Not a card, but record it so upload can say "token" instead of "unmatched".
    return {
      kind: "skipped-layout",
      row: {
        scryfallId: requiredString(raw, "id"),
        layout,
        name: typeof raw.name === "string" ? raw.name : "",
      },
    };
  }
  // reversible_card carries no top-level oracle_id (~81 exist); counted separately from FK
  // orphans so a skip spike stays diagnosable.
  if (layout === "reversible_card") return { kind: "skipped-reversible" };
  // MTGO/Arena-only printings would pollute the representative pick.
  if (raw.digital === true) return { kind: "skipped-digital" };

  const faces = raw.card_faces as Raw[] | undefined;
  // transform / modal_dfc layouts have no top-level image_uris — the same fallback the
  // cards transform already uses. Without it, every DFC gets a NULL image.
  const imageUri =
    raw.image_uris?.normal ?? faces?.find((f) => f.image_uris?.normal)?.image_uris.normal ?? null;
  const imageUriSmall =
    raw.image_uris?.small ?? faces?.find((f) => f.image_uris?.small)?.image_uris.small ?? null;

  return {
    kind: "printing",
    row: {
      scryfallId: requiredString(raw, "id"),
      oracleId: requiredString(raw, "oracle_id"),
      setCode: requiredString(raw, "set").toLowerCase(),
      collectorNumber: requiredString(raw, "collector_number"),
      imageUri,
      imageUriSmall,
      finishes: Array.isArray(raw.finishes) && raw.finishes.length > 0
        ? raw.finishes
        : ["nonfoil"],
      isVariant: isVariant(raw),
    },
  };
}

/** Digits-only prefix of a collector number, or null when it has none ("★"). */
function numericPart(collectorNumber: string): number | null {
  const digits = collectorNumber.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
}

/**
 * Reference implementation of the representative ordering. The ingest applies this in SQL
 * (see setRepresentativePrintings in seed-printings.ts) because the group set is far too
 * large to sort in memory; the two must stay in step, and this is the tested one:
 *
 *   order by is_variant asc,
 *            nullif(regexp_replace(collector_number, '\D', '', 'g'), '')::int nulls last,
 *            collector_number asc
 */
export function compareForRepresentative(a: PrintingRow, b: PrintingRow): number {
  if (a.isVariant !== b.isVariant) return a.isVariant ? 1 : -1;
  const na = numericPart(a.collectorNumber);
  const nb = numericPart(b.collectorNumber);
  // NULLS LAST.
  if (na === null || nb === null) {
    if (na !== nb) return na === null ? 1 : -1;
  } else if (na !== nb) {
    return na - nb;
  }
  if (a.collectorNumber === b.collectorNumber) return 0;
  return a.collectorNumber < b.collectorNumber ? -1 : 1;
}

/** The printing that wins `(oracle_id, set_code)` under compareForRepresentative. */
export function pickRepresentative(group: PrintingRow[]): PrintingRow | null {
  if (group.length === 0) return null;
  return [...group].sort(compareForRepresentative)[0];
}
