/**
 * The deck synopsis's shapes (sub-project 6). Types only, and pure, so the validator, the store
 * and the UI all compile against one definition.
 */

/** The four peers the modal draws, in order (`SYNOPSIS-modal.md` §4.1). The Primer's three parts
 *  are subsections of one section, and are refused or shown together. */
export const SECTIONS = ["overview", "primer", "keyCards", "weaknesses"] as const;
export type SectionId = (typeof SECTIONS)[number];

/**
 * What the app itself classifies a card as, and so what a Key card's job may claim. The five
 * roles are the profile's (`classifyRoles`, or the cards' labels with the classifier as the
 * per-card fallback when `LABEL_ROLE_COUNTS_ENABLED` is on); `tutor` is `comboReach.tutors`; `combo` is a piece of a two-card
 * combo the deck assembles; `commander` is a command-zone card. Nothing else is checkable, so
 * nothing else can be claimed.
 */
export const CATEGORIES = ["ramp", "draw", "removal", "wipes", "land", "tutor", "combo", "commander"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Why a section was refused. Each is one rule in `validate.ts`, and one count the harness keeps. */
export const REFUSAL_REASONS = [
  /** A `[[Name]]` mark that resolves to no card in the deck (in Weaknesses: in the catalog). */
  "unknown_card",
  /** A deck card named in the prose without its mark, which would render as text that opens nothing. */
  "unmarked_card",
  /** A tip naming fewer than two distinct cards. */
  "tip_too_few_cards",
  /** A tip whose card list and its own marks disagree, or name a card not in the deck. */
  "tip_not_in_deck",
  /** A Key card claiming, or its job describing, a category the app does not hold for it. */
  "job_unsupported",
  /** A numeral in the Mulligan that is not one of the facts the app computed. */
  "uncomputed_figure",
  /** A bracket, power, score or strength word anywhere in the generated prose (brief §2.2). */
  "strength_claim",
  /** An item count outside the section's range. */
  "wrong_count",
  /** An item over its character budget. */
  "over_budget",
  /** Text that does not end a sentence. */
  "partial_sentence",
  /** A Key card that is a universal staple (`src/lib/staples/universal.ts`), which says nothing
   *  about this deck (Hugh, 2026-09-24). */
  "universal_staple",
  /** The deck's colors written as mana letters (RG, BUG) rather than their identity name. */
  "mana_letters",
  /** A Mulligan line stating a land count, which the fixed land line above it already gives. */
  "land_count",
  /** A Mulligan line treating the commander as a card in the opening hand; it starts in the
   *  command zone (Hugh's one No, 2026-09-24). */
  "commander_in_hand",
  /** A Mulligan line opening with its own heading's word ("Keep", "Send back"). */
  "heading_prefix",
  // Contract 8 (plan 2026-10-10-overview-accuracy.md, section 4.1):
  /** An evidence ref that names no card of the deck, a claim over the cap, or a tip / Key card with none. */
  "evidence_not_in_deck",
  /** A sentence giving a marked card a keyword (cascade, haste...) that card's text and keywords lack. */
  "keyword_not_on_card",
  /** A tip saying creatures enter off a card that only makes opponents sacrifice. */
  "edict_entry",
  /** A weakness that is true of the data and means nothing (color flexibility on a mono-color deck). */
  "non_weakness",
  /** A checklist that does not assess every topic exactly once, or a weakness verdict with no tier or line. */
  "checklist_incomplete",
  /** The facts list a mandatory loop and the checklist does not answer combo_vulnerability as a critical weakness. */
  "mandatory_loop_missed",
] as const;
export type RefusalReason = (typeof REFUSAL_REASONS)[number];

export type Tip = { cards: string[]; text: string };
export type KeyCard = { card: string; claims: Category[]; job: string };
export type Primer = {
  strategy: string[];
  mulligan: { keep: string[]; sendBack: string[] };
  tips: Tip[];
};

/**
 * The synopsis as written: card names are `[[Name]]` marks inside the prose, resolved by the
 * validator and rendered as card-open triggers.
 */
export type SynopsisDraft = {
  overview: string;
  primer: Primer;
  keyCards: KeyCard[];
  weaknesses: string[];
};

/**
 * One section's verdict. `failed` / `total` count the CARD NAMES checked in the section, which is
 * the per-section figure the refused slot draws (*2 of 7 cards failed checking*); a refusal for a
 * reason that is not about a card can therefore read 0 failed, and the copy says why instead.
 */
export type SectionVerdict =
  | { section: SectionId; status: "ok"; failed: 0; total: number }
  | { section: SectionId; status: "refused"; reason: RefusalReason; failed: number; total: number };

/**
 * What is stored and shown: every section's verdict, and the content of the ones that passed. A
 * refused section's content is never stored, so no partial sentence can ever reach a reader.
 */
/** The land range the Mulligan draws as its fixed first line, from the facts, never the model. */
export type LandRange = { keep: { low: number; high: number }; sendBack: { none: number; under: number; over: number } };

/** The closed topics every contract-8 answer assesses, once each. */
export const ASSESSMENT_TOPICS = [
  "graveyard_or_zone_hate",
  "artifact_enchantment_removal",
  "interaction_speed",
  "commander_dependence",
  "win_path",
  "combo_vulnerability",
  "mana_and_colors",
] as const;
export type AssessmentTopic = (typeof ASSESSMENT_TOPICS)[number];
export const ASSESSMENT_VERDICTS = ["weakness", "not_a_weakness", "unknown"] as const;
export type AssessmentVerdict = (typeof ASSESSMENT_VERDICTS)[number];
export const WEAKNESS_TIERS = ["critical", "moderate", "minor"] as const;
export type WeaknessTier = (typeof WEAKNESS_TIERS)[number];

/** What a stored contract-8 answer keeps of the checklist: the verdicts, not the lines (those render as Weaknesses). */
export type StoredAssessment = { topic: AssessmentTopic; verdict: AssessmentVerdict; tier?: WeaknessTier };

/**
 * The oracle ids each rendered line is about, aligned with the content arrays. Resolved from the
 * reply's deck-local refs; an old row has none. They anchor a claim to real cards in this list and
 * do NOT prove it true (plan 3.4).
 */
export type StoredEvidence = {
  strategy: string[][];
  keep: string[][];
  sendBack: string[][];
  tips: string[][];
  keyCards: string[][];
  weaknesses: string[][];
};

export type CheckedSynopsis = {
  verdicts: SectionVerdict[];
  /** Absent on an overview written before the fixed line existed (contract 6), which draws none. */
  lands?: LandRange;
  overview: string | null;
  primer: Primer | null;
  keyCards: KeyCard[] | null;
  weaknesses: string[] | null;
  /** Contract 8 only. */
  assessment?: StoredAssessment[];
  /** Contract 8 only. */
  evidence?: StoredEvidence;
  /** Every resolved mark, keyed by `normalizeName` of the name as written (case, curly quotes and
   *  spacing folded), to the card it opens. A renderer looks a mark up through `normalizeName`. */
  cards: Record<string, { oracleId: string; name: string }>;
};

/**
 * How a run ended, in the vocabulary tuning uses, so the eval harness counts both features alike.
 * `refused` covers a partial and a total refusal; the verdicts say which.
 */
export type SynopsisOutcome =
  | "survived"
  | "refused"
  | "malformed"
  | "upstream_busy"
  /** The upstream refused the request (a bad key, a retired model id): a retry cannot fix it. */
  | "upstream_rejected"
  | "timeout"
  | "interrupted";
