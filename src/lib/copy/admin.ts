// The admin: copy. One reader (Hugh), so the wording is terse and names the code it reads.
//
// Taken from the handoff's `admin · copy strings.ts` (R2) for the keys the gate and the shell
// draw; the Costs page's strings, and the switch, group, account and model strings, arrive with
// their pages. A copy pass was applied to every string here: no em dashes, US English, "env var"
// throughout, and never "instantly".

export const adminCopy = {
  door: { label: "Admin" },
  eyebrow: "Admin",
  tabs: { costs: "Costs", switches: "Switches", groups: "Groups", accounts: "Accounts", models: "Models" },
  tabsLabel: "Admin pages",

  costs: {
    title: "Costs",
    sub: "What the model features cost, read from model_calls.",
  },
} as const;
