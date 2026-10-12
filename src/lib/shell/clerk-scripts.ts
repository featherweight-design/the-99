// The exact Clerk script versions the browser loads (speed plan, 2026-10-12).
//
// Left unset, Clerk asks for a MAJOR tag (`clerk-js@6`, `ui@1`), and its frontend API answers each
// with a 307 to the newest release in that major, marked `no-store`. So every full page load paid
// two uncacheable redirects before either script, which is a round trip each: about 560ms on a slow
// phone connection, measured on staging. An exact version is served `immutable` with no redirect.
//
// Pinned by hand because nothing installed names the exact release: `@clerk/shared` carries only
// the major it targets, and the server picks the patch. `clerk-scripts.test.ts` reads that major out
// of the installed package and fails when a dependency bump moves it, so a pin can never point at
// a major the SDK no longer speaks. Within the major, bumping these is how a reader gets Clerk's
// fixes: check the tag's redirect for the current release.
export const CLERK_JS_VERSION = "6.39.0";
export const CLERK_UI_VERSION = "1.40.0";
