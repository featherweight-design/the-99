/**
 * Whether this deployment offers Help me choose (sub-project 8; Hugh's release ruling,
 * 2026-09-24): every feature ships behind its own switch, on in staging and off in production
 * until Hugh walks it.
 *
 * Modelled on `noticesEnabled`: SERVER-SIDE (never `NEXT_PUBLIC_*`), it needs a REDEPLOY to
 * change, and it DEFAULTS OFF. Absent, empty, or any string but `'true'` is off.
 *
 * ONE READER gates every part (audit F3): the `/decks/new/choose` route answers not-found when
 * off, and both doors to it, the create picker's box and Discover's link, are not drawn.
 */
export function helpMeChooseEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.HELP_ME_CHOOSE_ENABLED === "true";
}
