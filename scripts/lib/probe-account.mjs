// The guard for a probe that CLEARS a whole account's collection and uploads on its way in and out
// (`probe:onboarding`, `probe:locked-nav`, `probe:issues-sheet`). They are meant for one account, the dedicated
// empty `onboard-probe` one on Clerk's development instance. `PROBE_EMAIL` can point them elsewhere, and
// pointed at a fixture account that holds real data they would wipe it, so a wipe needs both: the signed-in
// email is the dedicated one, and that account owns no decks (a real fixture account always does; first run
// needs none). That keeps them runnable on local-dev, where the dedicated account is the only thing they touch.
export const ONBOARD_PROBE_EMAIL = "onboard-probe+clerk_test@the99.app";

/** Throws unless `userId`, signed in as `email`, is the dedicated empty probe account. Call before every wipe. */
export async function assertDisposableAccount(sql, { email, userId, what }) {
  if (email.toLowerCase() !== ONBOARD_PROBE_EMAIL) {
    throw new Error(`${what} refuses to clear ${email}: only ${ONBOARD_PROBE_EMAIL} may be wiped. Unset PROBE_EMAIL.`);
  }
  const [{ decks }] = await sql`select count(*)::int as decks from decks where user_id = ${userId}`;
  if (decks > 0) {
    throw new Error(`${what} refuses to clear ${userId}: it owns ${decks} deck(s), so it is not the empty probe account.`);
  }
}
