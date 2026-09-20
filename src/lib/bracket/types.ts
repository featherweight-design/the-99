import type { Bracket, CardRef, ComboRef, DetectionCoverage, FlaggedCardRef } from "../profile/types";

export type { Bracket, CardRef, ComboRef, DetectionCoverage, FlaggedCardRef };

/**
 * The four things the bracket system quantifies. Tutors are deliberately NOT here: the
 * profile reports them as a fact and no bracket rule counts them.
 */
export type RuleId = "gameChangers" | "massLandDenial" | "extraTurns" | "twoCardCombos";

export type Violation = {
  rule: RuleId;
  bracket: 1 | 2 | 3;
  /** Receipts, never a count alone — a figure the reader cannot check is an assertion. */
  cards: CardRef[];
  /** When the RECEIPT is a combo: the twoCardCombos rule, and the B3 looping-extra-turns
   *  clause, where the combo IS the evidence the bracket fell. */
  combos?: ComboRef[];
  have: number;
  /** 0 where the bracket forbids the thing outright. */
  limit: number;
};

export type BracketLimitReport = {
  bracket: 1 | 2 | 3;
  gameChangers: { have: number; limit: number; violated: boolean; cards: CardRef[] };
  massLandDenial: { have: number; violated: boolean; cards: FlaggedCardRef[] };
  extraTurns:
    | { counted: true; have: number; violated: boolean; cards: FlaggedCardRef[] }
    | {
        /** B2 and B3 do not count extra turns. The figure is REPORTED with no verdict
         *  attached, and only a measured loop violates. */
        counted: false;
        have: number;
        cards: FlaggedCardRef[];
        /** An assembled combo producing infinite turns — Spellbook's own data, and the
         *  receipt. The self-recurring single card is NOT detected, and the detection copy
         *  says so rather than letting the absence read as a clean deck. */
        loopCombos: ComboRef[];
        violated: boolean;
      };
  twoCardCombos:
    | { policy: "forbidden"; have: number; violated: boolean; combos: ComboRef[] }
    /** B3 permits an early-game combo and not a late one, and LATENESS IS NOT COMPUTABLE
     *  from anything stored. So this widens the permitted range and never violates. */
    | { policy: "earlyGameOnly"; have: number; combos: ComboRef[] };
};

export type BracketLean = {
  likely: 3 | 4;
  /** `reachable` — a tutor in the deck finds a piece. `drawOnly` — the combo is assembled
   *  only by drawing into it. */
  reason: "reachable" | "drawOnly";
  /** Every card behind the lean, so a reader who disagrees can see what it read. */
  receipts: { combo: ComboRef; tutors: CardRef[] }[];
};

/** Facts the system reports and refuses to score. */
export type UnquantifiedFacts = { extraTurns: FlaggedCardRef[] };

export type BracketVerdict = {
  /** `[1,2] | [2] | [3] | [3,4] | [4,5]`. A RANGE, because the bracket system does not
   *  produce a single number and this app never invents one. */
  permits: Bracket[];
  declared: Bracket | null;
  /** Drift is its own finding: a declaration outside the permitted range is reported, and
   *  the declaration is never corrected, overridden or inferred. */
  declaredOutsidePermits: boolean;
  /** Only when `permits` is `[3, 4]` — the one place the range is wide enough that a reader
   *  is owed a reason to prefer one end. */
  lean: BracketLean | null;
  limits: Record<"bracket1" | "bracket2" | "bracket3", BracketLimitReport>;
  violations: Violation[];
  unquantified: UnquantifiedFacts;
  detection: DetectionCoverage;
};
