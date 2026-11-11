/**
 * The picks Upgrade this precon is made of, in a module of their own: the flow's client components and the server's run both read them, and
 * neither should pull the other's imports (`hold.ts` reads the bracket rules and the combo tables; `run.ts` the database and the model).
 */
export const BRACKET_TARGETS = [2, 3, 4] as const;
export type BracketTarget = (typeof BRACKET_TARGETS)[number];

/** The key one run is kept under: who leads, the bracket held and the strategy. The same three picks are the same run. */
export const runKey = (commanderKey: string, bracket: BracketTarget, strategyKey: string): string => `${commanderKey}/${bracket}/${strategyKey}`;
