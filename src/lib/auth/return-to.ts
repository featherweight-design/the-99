// Where a sign-in lands the reader: the page they were sent from, read off the address Clerk built (`redirect_url`, or a
// `<SignInButton forceRedirectUrl>`'s `sign_in_force_redirect_url`), and only ever somewhere on this site. Anything a stranger
// could have written into a link (another host, a protocol-relative path, a script URL, a backslash a browser reads as a
// slash) lands Home instead, so the sign-in page can never be used to send a reader off the site. No React here: the server
// pages (`/sign-in`, `/sso-callback`) and the client flow all read it.

/** Where a sign-in lands when the address names nowhere safe. */
export const HOME = "/";

/**
 * The query parameters a sign-in's destination arrives in, in Clerk's own order of precedence (`RedirectUrls` in
 * @clerk/shared): a button's forced destination first, then the page the reader was sent from. The app's own ways back
 * (`/sso-callback`, Google's refusal) carry it as `redirect_url` too.
 */
export const RETURN_PARAMS = ["sign_in_force_redirect_url", "redirect_url"] as const;
export const RETURN_PARAM = "redirect_url";

// Any control character: a URL parser strips tabs and newlines, so "/\t/evil.com" would read as "//evil.com".
const UNSAFE_CHARS = /[\x00-\x1f\x7f]/;

/** A same-site path, as written, or `null`: it starts with one "/" and, decoded once or not, never with "//" or a backslash. */
function safePath(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (decoded.startsWith("//") || decoded.includes("\\")) return null;
  return path;
}

/**
 * The path (with its query and fragment) a sign-in may land on, from what arrived in `raw`, or `HOME`. `host` is the
 * request's own host: an absolute URL is taken only on that host, over http or https, and only its path is kept, so the
 * landing is always a navigation inside the app. A repeated parameter (an array) is refused rather than guessed at.
 */
export function returnTo(raw: string | string[] | undefined | null, host: string | null | undefined): string {
  if (typeof raw !== "string" || raw.length === 0) return HOME;
  if (raw.includes("\\") || /%5c/i.test(raw) || UNSAFE_CHARS.test(raw)) return HOME;
  if (raw.startsWith("/")) return safePath(raw) ?? HOME;
  if (!/^https?:\/\//i.test(raw) || !host) return HOME;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return HOME;
  }
  if (url.username || url.password || url.host.toLowerCase() !== host.toLowerCase()) return HOME;
  return safePath(`${url.pathname}${url.search}${url.hash}`) ?? HOME;
}

/**
 * The sign-in's destination from a page's search params: the first of `RETURN_PARAMS` that is present and safe, else `HOME`.
 * An unsafe one falls through to the next, so a bad forced destination never costs the reader the page they came from.
 */
export function signInReturn(params: Record<string, string | string[] | undefined>, host: string | null | undefined): string {
  for (const key of RETURN_PARAMS) {
    if (params[key] === undefined) continue;
    const to = returnTo(params[key], host);
    if (to !== HOME) return to;
  }
  return HOME;
}

/**
 * The sign-in's destination from the address's fragment, or `null` when it carries none. A `<SignInButton>` (Clerk's browser
 * `redirectToSignIn`) writes its redirect parameters after the hash, as `/sign-in#/?redirect_url=…` (`#buildUrl` in clerk-js
 * puts them in `hashSearchParams`), so the server page never sees them and the flow reads them here. Only the proxy's
 * redirect (`auth.protect()`) puts them in the query.
 */
export function hashReturn(hash: string, host: string | null | undefined): string | null {
  const at = hash.indexOf("?");
  if (!hash.startsWith("#") || at < 0) return null;
  const query = new URLSearchParams(hash.slice(at + 1));
  const params: Record<string, string | string[]> = {};
  for (const key of RETURN_PARAMS) {
    const all = query.getAll(key);
    if (all.length > 0) params[key] = all.length === 1 ? all[0] : all;
  }
  return Object.keys(params).length > 0 ? signInReturn(params, host) : null;
}

/** `path` with the destination added as `redirect_url`, or unchanged when the destination is Home. */
export function withReturn(path: string, to: string): string {
  if (to === HOME) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${RETURN_PARAM}=${encodeURIComponent(to)}`;
}

/**
 * The request's own host, for `returnTo`: the forwarded host first, as Clerk reads it when it builds `redirect_url`, then
 * `host`. Neither is anything a link can set in a reader's browser.
 */
export function requestHost(headers: { get(name: string): string | null }): string | null {
  return headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host");
}
