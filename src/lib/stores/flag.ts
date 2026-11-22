/**
 * `STORE_PREFERENCE_ENABLED` (store preference, design #3200): whether a reader's chosen store
 * (`user_prefs.preferred_store`) prices the app for them. Off, every read stays Mana Pool and the Settings choice is
 * neither offered nor written. App-wide default off; on per account while it is tried. Exactly `'true'` turns it on.
 */
export function storePreferenceEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.STORE_PREFERENCE_ENABLED === "true";
}
