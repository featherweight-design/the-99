/**
 * Cards revealed per activation, and so the size of a lane's first window. Deliberately > the 24
 * generals the beta collection yields, so the control stays unreachable on real data for now.
 *
 * Here rather than in `reveal-control.tsx`, which is a client module: a server component importing
 * a constant from one receives a client reference instead of the number, and `/discover`'s page
 * needs the number to cut its first window.
 */
export const REVEAL_STEP = 25;
