/**
 * The deployment every cached payload is filed under.
 *
 * A build that changes what a payload says for unchanged rows would otherwise go on serving the
 * previous build's entries, for up to the hour ceiling, to a reader who writes nothing: the
 * per-reader tag is dropped only by that reader's own writes. With the deployment in the key,
 * the old entry is simply never asked for again, and no author has to remember to bump a
 * version. On a local server it is `"local"`, so restarting `next dev` keeps its entries.
 */
export const DEPLOYMENT_ID =
  process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
