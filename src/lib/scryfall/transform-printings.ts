// Explicit shapes (kept in sync with the printings / skipped_printings tables) rather than
// schema imports: pure lib code stays free of DB imports, which is what keeps it unit-testable.
export type PrintingRow = {
  scryfallId: string;
  oracleId: string;
  setCode: string;
  collectorNumber: string;
  imageUri: string | null;
  imageUriSmall: string | null;
  /**
   * This printing's frame-free crop — what a wash draws behind a commander. Oracle-level
   * `cards.art_crop_uri` is one arbitrary printing's crop, so a player owning another
   * printing saw art that is not on their card.
   */
  artCropUri: string | null;
  /**
   * This printing's second face, which is what a flip has to swap to. Asked of the face
   * rather than of the layout, exactly as the cards transform does: split, flip and
   * adventure cards are `card_faces` arrays too and carry one image between them, so they
   * answer null here without this needing to name them.
   */
  backImageUri: string | null;
  finishes: string[];
  isVariant: boolean;
  /**
   * The name printed on this printing when it differs from its oracle card's — Secret Lair's
   * renames. Printing-level, not oracle-level: the same card is "Iroas, God of Victory"
   * everywhere else. Null on the ~99.9% of printings that carry no such name.
   */
  flavorName: string | null;
  /**
   * Scryfall's own "can be found in a booster" flag, and the only reliable base-run
   * boundary available. `isVariant` cannot serve: it is an art-treatment allowlist built
   * to choose a default art, and it flags EOE's full-art basics at #262-266, which sit
   * inside the base run. Verified against EOE: 1-276 booster, 277-399 not.
   *
   * Not sufficient alone. Every printing in a Commander product carries `booster: false`,
   * so a set with no booster printings at all falls back to its non-variant ones — a
   * set-level rule, applied by setBaseSetSizes rather than here.
   */
  booster: boolean | null;
  /**
   * Rarity of THIS printing. `cards.rarity` is oracle-level, taken from one arbitrary
   * printing, and is wrong per set: Sacred Foundry is rare in `eoe` and mythic in `exp`.
   */
  rarity: string | null;
};

export type SkippedPrintingRow = { scryfallId: string; layout: string; name: string };

export type PrintingClassification =
  | { kind: "printing"; row: PrintingRow }
  | { kind: "skipped-layout"; row: SkippedPrintingRow }
  | { kind: "skipped-reversible" }
  | { kind: "skipped-digital" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Scryfall bulk JSON is untyped by design; classifyPrinting narrows it.
type Raw = Record<string, any>;

/** Layouts the oracle transform excludes from `cards` — a printing of one has no FK target. */
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
  // REVERSIBLE CARDS ARE READ FROM THEIR FACES, not skipped.
  //
  // Scryfall gives this layout no top-level `oracle_id` — it sits on each face — so the
  // obvious read produces a row with no FK target, and the original rule dropped the layout
  // wholesale rather than store an orphan. What that cost is a printing the player owns and
  // the catalog denies: Hugh's `sld/2214` foil, whose art resolved to the set's
  // representative printing (`sld/1721`) and drew a different card's picture under his
  // collection row. Reported 2026-09-21.
  //
  // Both faces carry the SAME oracle id on every one of the 82 that exist (measured against
  // Scryfall the same day), which is what makes face 0 an answer rather than a guess: this
  // layout is one card printed on both sides, not two cards sharing stock. The skip is kept
  // for the case that would be a guess — faces naming different oracles — which exists
  // nowhere today and would be a different thing entirely if it ever shipped.
  //
  // TWO THINGS THIS DOES NOT DO, both deliberate:
  //
  //   · `toCardRow` still drops the layout, so `cards` gains no row from a reversible entry
  //     and the oracle it links to comes from an ordinary printing of the same card. Reading
  //     the face there instead would UPSERT over that row with this layout's doubled name
  //     (`Teferi's Ageless Insight // Teferi's Ageless Insight`), which is a worse defect
  //     than the one being fixed. The consequence is a real risk and is named rather than
  //     papered over: a reversible printing whose oracle has NO other printing now reaches
  //     the FK-orphan check instead of being turned away here, and one orphan refuses the
  //     whole refresh's base-set sizing. Zero of the 82 are in that position — all 71 of
  //     their oracles are in `cards`, checked including the 17 newest non-Secret-Lair ones —
  //     and if one ever is, the run fails loudly with a named count rather than silently.
  //
  //   · `back_image_uri` is stored for these printings and NOT drawn. The flip control is
  //     gated on `isTwoFaced(card.layout)`, which is oracle-level and reads `normal` here,
  //     and `faces.ts` deliberately excludes this layout. Storing it costs nothing, keeps
  //     this transform's face handling uniform, and leaves the data ready if that ruling
  //     ever moves.
  const reversible = layout === "reversible_card";
  let reversibleOracleId: string | null = null;
  if (reversible) {
    const revFaces = (raw.card_faces as Raw[] | undefined) ?? [];
    // A TOKEN PRINTED AS A REVERSIBLE CARD IS STILL A TOKEN, and the layout gate above
    // cannot see it: Scryfall files `sld/1969` Mechtitan as `reversible_card`, and only its
    // faces' type lines say `Token Legendary Artifact Creature`. Its other printing is
    // `tneo/14`, layout `token`, which `toCardRow` skips — so there is no `cards` row for it
    // and there should not be. Ingesting the printing anyway made it an FK ORPHAN, and one
    // orphan refuses the whole run's base-set sizing: the 2026-09-22 staging refresh seeded
    // 103,306 printings and then sized 0 sets because of this single row.
    //
    // Routed to the skipped LEDGER rather than counted as reversible, because that is what
    // it is — the ledger is what lets an upload say "token" instead of "unmatched". One of
    // the 82 is in this position; the check is on the type line rather than on the name so
    // it stays a rule about tokens rather than a list of them.
    if (revFaces.some((f) => typeof f.type_line === "string" && f.type_line.startsWith("Token"))) {
      return {
        kind: "skipped-layout",
        row: {
          scryfallId: requiredString(raw, "id"),
          layout,
          name: typeof raw.name === "string" ? raw.name : "",
        },
      };
    }
    // `firstString`, not a `typeof` test: an `oracle_id: ""` is as absent as a missing one,
    // and a type check calls it present. It would then agree with itself across both faces,
    // pass this guard, and be stored as a printing with an EMPTY oracle id — which the FK
    // check counts as an orphan, and one orphan refuses the whole run's base-set sizing.
    // The same shape as the `filter(Boolean)` hole above it, one notch narrower.
    const faceIds = revFaces.map((f) => firstString(f.oracle_id));
    // EVERY face must name one, and they must agree. Sizing a set of the ids that are
    // PRESENT is the version that looks right and is not: a first face carrying no id and a
    // second carrying one gives a set of size 1, passes, and then throws on the row's own
    // `requiredString` — which is an exception inside the bulk stream, and that aborts the
    // whole refresh where the old code skipped a single entry.
    const distinct = new Set(faceIds);
    if (faceIds.length === 0 || faceIds.some((id) => id === null) || distinct.size !== 1) {
      return { kind: "skipped-reversible" };
    }
    reversibleOracleId = faceIds[0];
  }
  // MTGO/Arena-only printings would pollute the representative pick.
  if (raw.digital === true) return { kind: "skipped-digital" };

  const faces = raw.card_faces as Raw[] | undefined;
  // transform / modal_dfc layouts have no top-level image_uris — the same fallback the
  // cards transform already uses. Without it, every DFC gets a NULL image.
  const imageUri =
    raw.image_uris?.normal ?? faces?.find((f) => f.image_uris?.normal)?.image_uris.normal ?? null;
  const imageUriSmall =
    raw.image_uris?.small ?? faces?.find((f) => f.image_uris?.small)?.image_uris.small ?? null;
  // Same face fallback, same reason: the two-sided layouts carry no top-level image_uris,
  // and without it every DFC printing would store a NULL crop.
  const artCropUri =
    raw.image_uris?.art_crop
    ?? faces?.find((f) => f.image_uris?.art_crop)?.image_uris.art_crop
    ?? null;

  return {
    kind: "printing",
    row: {
      scryfallId: requiredString(raw, "id"),
      // The id every face agreed on, for a reversible card whose top level has none. Taken
      // from the guard above rather than re-read from face 0, so the value asserted and the
      // value stored cannot drift apart.
      oracleId: reversibleOracleId ?? requiredString(raw, "oracle_id"),
      setCode: requiredString(raw, "set").toLowerCase(),
      collectorNumber: requiredString(raw, "collector_number"),
      imageUri,
      imageUriSmall,
      artCropUri,
      backImageUri: faces?.[1]?.image_uris?.normal ?? null,
      finishes: Array.isArray(raw.finishes) && raw.finishes.length > 0
        ? raw.finishes
        : ["nonfoil"],
      isVariant: isVariant(raw),
      // A reversible card's printed name is on its FACE — `Mimir's Ancient Wisdom` over
      // `Teferi's Ageless Insight` — and the top level carries none, so reading only there
      // would ingest the printing and still draw the oracle's name on it. Same shape as the
      // image fallbacks above: ask the top level, then the face.
      flavorName: firstString(raw.flavor_name) ?? firstString(faces?.[0]?.flavor_name),
      // NULL, not false, when the key is absent: the column is nullable precisely so
      // "nobody has classified this" stays distinct from "this is not in a booster", and
      // writing false would file an unknown printing under extras.
      booster: typeof raw.booster === "boolean" ? raw.booster : null,
      rarity: typeof raw.rarity === "string" && raw.rarity !== "" ? raw.rarity : null,
    },
  };
}

/** A non-empty string, or null — the shape every optional Scryfall text field wants. */
function firstString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** Every digit in a collector number, non-digits stripped, or null when it has none ("★"). */
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
