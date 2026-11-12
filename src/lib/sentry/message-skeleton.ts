// An exception's message as a readable skeleton for Sentry: its error words kept, everything else gone (FWD Sentry plan
// 2026-11-08, item 1; option B, orchestrator ruling 2026-11-12). Pure: it imports nothing, so every runtime and the tests
// load it.
//
// A CLOSED VOCABULARY, NOT A SHAPE RULE. The rule this replaces dropped every message but a closed list of exact strings,
// because a client error's message can carry a card name, a deck name or a query, and a pattern lets one through the first
// time it is interpolated. This keeps that guarantee word by word: a word survives only when it is on `ERROR_WORDS` (the words
// JavaScript engines, React, Next, fetch, Clerk and Postgres write into their errors) or is shaped like code (`camelCase`,
// `snake_case`, `a.dotted.path`, a class name ending `Error`). Every other word, every quoted span, every number of four or more
// digits, every URL, email and token becomes `·`. "Sol Ring" and "my jank deck" never survive, because neither is a
// programming word.
//
// Adding a word: only one an engine or framework writes into its own error text, never one a player would type as a name.

/** The words error texts are made of, lower case. Closed: see the header. */
export const ERROR_WORDS: ReadonlySet<string> = new Set([
  // Grammar of error sentences.
  "a", "an", "the", "of", "to", "in", "on", "at", "by", "for", "from", "with", "without", "as", "is", "are", "was", "were", "be",
  "been", "being", "has", "have", "had", "not", "no", "and", "or", "but", "if", "it", "its", "this", "that", "than", "then", "there",
  "which", "while", "when", "after", "before", "only", "must", "should", "can", "cannot", "could", "may", "might", "will",
  "would", "does", "do", "did", "did", "please", "more", "than", "too", "many", "much", "already", "yet", "still", "also",
  "either", "neither", "nor", "any", "all", "some", "each", "every", "one", "two", "into", "out", "up", "down", "over", "under",
  "between", "because", "so", "such", "same", "other", "unexpected", "unexpectedly", "unknown", "unable", "expected",
  // JavaScript engines.
  "error", "errors", "type", "typeerror", "referenceerror", "syntaxerror", "rangeerror", "evalerror", "urierror", "aggregateerror",
  "read", "reading", "set", "setting", "properties", "property", "undefined", "null", "function", "object", "objects", "array",
  "string", "number", "boolean", "symbol", "bigint", "defined", "declared", "initialization", "initialized", "access", "accessed",
  "iterable", "iterator", "constructor", "call", "called", "calling", "stack", "size", "exceeded", "maximum", "minimum", "invalid",
  "length", "token", "json", "parse", "position", "column", "line", "end", "input", "convert", "converting", "circular",
  "structure", "assign", "assignment", "constant", "variable", "extensible", "frozen", "sealed", "configurable", "writable",
  "redefine", "define", "getter", "setter", "only", "argument", "arguments", "parameter", "parameters", "value", "values",
  "valid", "date", "time", "precision", "radix", "digits", "range", "index", "out", "bounds", "key", "keys", "missing",
  "required", "optional", "promise", "rejected", "rejection", "resolved", "unhandled", "uncaught", "async", "await", "awaited",
  "generator", "module", "modules", "import", "imported", "export", "exported", "dynamically", "chunk", "chunks", "loading",
  "load", "loaded", "script", "scripts", "operation", "operations", "aborted", "abort", "aborterror", "timeout", "timed",
  "timeouterror", "domexception", "notallowederror", "securityerror", "quotaexceedederror", "storage", "quota", "permission",
  "denied", "allowed", "blocked", "insecure", "secure", "context", "origin", "cross", "same", "document", "window", "node",
  "element", "child", "parent", "removechild", "insertbefore", "appendchild", "failed", "fail", "failure", "execute", "executing",
  "construct", "instance", "class", "method", "methods", "prototype", "readonly", "proxy", "trap", "returned", "return",
  "result", "results", "empty", "found", "exist", "exists", "existing", "match", "matched", "matches", "duplicate", "unique",
  "supported", "unsupported", "implemented", "available", "unavailable", "disabled", "enabled", "ready", "closed", "open",
  "opened", "connection", "connections", "socket", "network", "networkerror", "fetch", "fetching", "request", "requests",
  "response", "responses", "status", "code", "body", "header", "headers", "url", "redirect", "redirected", "redirects", "cors",
  "server", "client", "service", "worker", "unavailable", "internal", "gateway", "bad", "forbidden", "unauthorized",
  "unauthenticated", "authenticated", "authentication", "authorization", "session", "sessions", "expired", "expire", "token",
  "signed", "sign", "user", "users", "account", "too", "rate", "limit", "limited", "retry", "retried", "retries", "again", "later",
  "try", "attempt", "attempts", "reached", "reach", "process", "memory", "heap", "allocation", "out", "killed", "crashed",
  // React and Next.
  "react", "render", "rendered", "rendering", "component", "components", "hook", "hooks", "hydration", "hydrate", "hydrating",
  "mismatch", "server", "text", "content", "tree", "root", "suspense", "boundary", "boundaries", "lazy", "state", "update",
  "updates", "unmounted", "mounted", "mount", "effect", "effects", "ref", "refs", "key", "prop", "props", "children", "element",
  "elements", "minified", "next", "page", "pages", "route", "routes", "router", "layout", "segment", "segments", "params",
  "action", "actions", "dynamic", "static", "prerender", "prerendering", "cache", "cached", "revalidate", "revalidation",
  "middleware", "edge", "runtime", "digest", "navigation", "navigate", "notfound", "found",
  // Clerk.
  "clerk", "auth", "clerkmiddleware", "detect", "usage", "ensure", "following", "configured", "configuration", "matcher",
  "file", "directory", "inside", "verified", "issue", "problem", "communicating", "details", "see",
  // Postgres, Drizzle and Neon.
  "database", "query", "queries", "relation", "column", "columns", "row", "rows", "table", "tables", "violates", "violation",
  "constraint", "foreign", "primary", "check", "deadlock", "detected", "serialize", "serialization", "concurrent", "transaction",
  "transactions", "lock", "locked", "terminated", "terminating", "canceling", "statement", "syntax", "near", "permission",
  "schema", "migration", "migrations", "pool", "client", "clients", "idle", "neon", "drizzle", "postgres", "sql",
  "insert", "update", "delete", "select", "into", "values", "returning",
]);

/**
 * A word shaped like code, which a player does not type as a name: `camelCase`, `snake_case`, `SCREAMING_CASE`,
 * `a.dotted.path`, `TypeError`. Letters only, every hump a real lowercase run: a Clerk id (`user_3HdjdocERC…`), a base64 token
 * or a hash has digits or single-letter humps and fails every shape, so it is scrubbed like any other unknown word.
 */
function codeShaped(word: string): boolean {
  if (word.length > 40) return false;
  if (/^[a-z]{2,}(?:[A-Z][a-z]{2,})+$/.test(word)) return true; // camelCase
  if (/^[a-z]{2,}(?:_[a-z]{2,})+$/.test(word) || /^[A-Z]{2,}(?:_[A-Z]{2,})+$/.test(word)) return true; // snake_case, SCREAMING_CASE
  if (/^[a-z][A-Za-z]{0,19}(?:\.[a-z][A-Za-z]{0,19})+$/.test(word)) return true; // a.dotted.path
  return /^(?:[A-Z][a-z]{2,})+(?:Error|Exception)$/.test(word); // a class name
}

const DOT = "·";
const MAX_IN = 1000;
const MAX_OUT = 300;

/**
 * The message with only error words and code-shaped words kept, each run of anything else one `·`. Punctuation and spacing
 * between kept words stay, so `Cannot read properties of undefined (reading 'name')` reads
 * `Cannot read properties of undefined (reading '·')`. Null when nothing at all is kept (the caller says `[redacted]`).
 */
export function messageSkeleton(value: string): string | null {
  let s = value.slice(0, MAX_IN);
  // Whole spans first, so nothing inside them is read as words: URLs, emails, quoted text.
  s = s.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, DOT);
  s = s.replace(/[^\s@'"`]+@[^\s@'"`]+/g, DOT);
  s = s.replace(/(['"`])[^'"`\n]{1,200}\1/g, (_m, q: string) => `${q}${DOT}${q}`);
  let kept = 0;
  s = s.replace(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*|\d+/g, (word) => {
    if (/^\d+$/.test(word)) return word.length <= 3 ? word : DOT;
    if (ERROR_WORDS.has(word.toLowerCase()) || codeShaped(word)) {
      kept++;
      return word;
    }
    return DOT;
  });
  if (kept === 0) return null;
  // One `·` for each run of scrubbed words, whatever stood between them.
  s = s.replace(new RegExp(`${DOT}(?:[\\s\\-–—,/:;&+#]*${DOT})+`, "g"), DOT);
  s = s.replace(/\s+/g, " ").trim();
  return s.length > MAX_OUT ? `${s.slice(0, MAX_OUT)}…` : s;
}
