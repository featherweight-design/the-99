// The four judgement themes' names, apart from `judged.ts` so a client file can read the list without pulling in the
// prompt, the hashing and `node:crypto` behind it.
export const JUDGED_THEMES = ["groupHug", "pillowFort", "bigMana", "politics"] as const;
export type JudgedTheme = (typeof JUDGED_THEMES)[number];
