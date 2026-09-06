/**
 * Ruling 4: buildability is a floor, never a term in the sort.
 *
 * Its own module because both sides of the wire need it and `novelty.ts` cannot
 * be one of them: that file imports `src/db`, whose module body throws when
 * DATABASE_URL is unset, so a client component naming the floor through it would
 * pull the neon driver into the browser bundle. The empty state has to print the
 * same number the ranking applied, and this is the one place it is written.
 */
export const NOVELTY_FLOOR = 0.3;
