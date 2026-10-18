/**
 * The origin the public pages' absolute URLs (`og:url`, `og:image`) are built on: the deployment's own production domain,
 * which Vercel sets on every deployment of a project (the staging project's is the staging domain). Unset off Vercel,
 * where Next falls back to localhost.
 */
export function siteOrigin(): URL | undefined {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? new URL(`https://${host}`) : undefined;
}
