// THE STRATIFIED RE-SAMPLE (the vocabulary plan's Task 5): about 40 regex-selected cards per new job,
// beside the random 500. A random draw gives a job that appears on one card in two hundred almost no
// instances to score; the regex is what puts enough of each in front of the model. The random half is what
// keeps the empty rate honest, so the two are reported apart and never pooled.
//
// The regexes CHOOSE candidates and decide nothing: the model labels what it is sent, and a card a pattern
// admits that does not do the job is exactly the hard negative the stratum needs. Postgres AREs, matched
// case-insensitively against the cast face's text.
export const STRATUM_SIZE = 40;

export const STRATA: Record<string, string> = {
  tutor: "search your library for (?![^.]*\\mland\\M)[^.]*\\mcard",
  counterspell: "\\mcounter target\\M",
  graveyardHate: "exile (all cards from |all )?(target player's|each opponent's|all|all cards in all) graveyards?|cards in graveyards can't",
  discard: "\\mdiscards?\\M",
  stax: "costs? \\{\\d\\} more|don't untap|can't (cast|search)|destroy all lands",
  clones: "as a copy of|becomes? a copy of",
  theft: "gain control of",
  poison: "poison counter|\\minfect\\M|\\mtoxic\\M",
  goad: "\\mgoad|attacks? each combat if able",
  doublers: "twice that many|\\mdouble\\M",
  fog: "prevent all combat damage",
  costReduction: "costs? (\\{\\d\\}|\\{[wubrgc]\\}) less|cost (\\{\\d\\} )?less to cast",
  extraLandDrop: "play an additional land|play (two|three) additional lands",
  // d9's rulings of 2026-10-02: a ramp kind, two methods and a widened protection, each its own stratum.
  multiplies: "(twice|three times) as much|adds an additional|an additional (one )?mana|that much (additional )?mana",
  sacrifice: "(each opponent|target player|each player|target opponent) sacrifices",
  bottom: "on the bottom of (its|their) owner's library",
  shroud: "\\mshroud\\M|you have hexproof",
};
