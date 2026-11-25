/**
 * The one host the copy editor opens on: the staging Vercel project's production domain. Vercel sets
 * `VERCEL_PROJECT_PRODUCTION_URL` per project (the project's shortest production domain, and only while "Automatically
 * expose System Environment Variables" is on), so the production project can never equal this. A shorter alias added to
 * the staging project, or that setting turned off, shuts the editor (safe, but silent): change this value to match.
 */
export const STAGING_HOST = "staging.the-99.dev";
