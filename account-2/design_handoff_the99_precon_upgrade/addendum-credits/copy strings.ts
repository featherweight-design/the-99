// Upgrade this precon · addendum: the credits path (account 2, 2026-11-12). DRAFT: /copy-review resolves the wording.
// Reuses rather than restates: preconUpgradeCopy.strategy.freeOnly (the press line), creditsCopy.getMore / GetMoreLink (the link).

export const preconUpgradeCreditsCopy = {
  intro: {
    /** Under `2 credits a run.` when the run can't be funded, in --warning. Payments on; `Get more credits →` follows. */
    shortMore: "A free credit covers 1, so you’ll need more credits to run one.",
    /** The same, payments off: no link. */
    shortOff: "A free credit covers 1, so an upgrade can’t run on free credits alone.",
  },
} as const;

// src/lib/copy/landing.ts additions
export const landingCreditsAdditions = {
  threeTimesOne: (units: number) => `${units} credits = each 1-credit tool, three times`,
  enoughOne: "That covers every 1-credit tool three times over before you spend a thing.",
  enoughOneV2: "That covers every 1-credit tool three times over (Suggested changes, up to 10 changes) before you spend a thing.",
  two: "2 credits",
  tool: {
    id: "upgrade", short: "Upgrade", name: "Upgrade this precon", icon: "upgrade",
    tip: "Pick who leads a precon, the bracket and a strategy, and it swaps 12 to 18 of its cards toward that plan. No card it adds costs over $12.",
    example: { ask: "Prismari Artistry · Spells · bracket 3", rows: [["−", "Thopter Engineer", "off the plan"], ["+", "Veyran, Voice of Duality", "spell triggers twice"], ["+", "Storm-Kiln Artist", "Treasure on every spell"]] },
  },
} as const;
