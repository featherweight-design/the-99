// An exception's message as a readable skeleton for Sentry: its error words kept, everything else gone (FWD Sentry plan
// 2026-11-08, item 1; option B, orchestrator ruling 2026-11-12). Pure: it imports nothing, so every runtime and the tests
// load it.
//
// A CLOSED VOCABULARY, NOT A SHAPE RULE. The rule this replaces dropped every message but a closed list of exact strings,
// because a client error's message can carry a card name, a deck name or a query, and a pattern lets one through the first
// time it is interpolated. This keeps that guarantee word by word: a word survives only when it is on `ERROR_WORDS` (the words
// JavaScript engines, React, Next, fetch, Clerk and Postgres write into their errors) or is an error class name
// (`ChunkLoadError`). Every other word (in any script), every quoted span, every number of four or more digits, every URL,
// email and token becomes `·`. "Sol Ring" and "my jank deck" never survive. A name leaves only where every word of it is itself
// an error word (the card Root Out, a deck called "Bad Request"): the residual this design accepts, since those words alone
// identify nobody.
//
// Adding a word: only one an engine or framework writes into its own error text, never one a player would type as a name.

/** The words error texts are made of, lower case. Closed: see the header. */
export const ERROR_WORDS: ReadonlySet<string> = new Set([
  // Grammar of error sentences.
  "a", "an", "the", "of", "to", "in", "on", "at", "by", "for", "from", "with", "without", "as", "is", "are", "was", "were", "be",
  "been", "being", "has", "have", "had", "not", "no", "and", "or", "but", "if", "it", "its", "this", "that", "than", "then", "there",
  "which", "while", "when", "after", "before", "only", "must", "should", "can", "cannot", "could", "may", "might", "will",
  "would", "does", "do", "did", "please", "more", "too", "many", "much", "already", "yet", "still", "also",
  "either", "neither", "nor", "any", "all", "some", "each", "every", "one", "two", "into", "out", "up", "down", "over", "under",
  "between", "because", "so", "such", "same", "other", "unexpected", "unexpectedly", "unknown", "unable", "expected",
  // JavaScript engines.
  "error", "errors", "type", "typeerror", "referenceerror", "syntaxerror", "rangeerror", "evalerror", "urierror", "aggregateerror",
  "read", "reading", "set", "setting", "properties", "property", "undefined", "null", "function", "object", "objects", "array",
  "string", "number", "boolean", "symbol", "bigint", "defined", "declared", "initialization", "initialized", "access", "accessed",
  "iterable", "iterator", "constructor", "call", "called", "calling", "stack", "size", "exceeded", "maximum", "minimum", "invalid",
  "length", "token", "json", "parse", "position", "column", "line", "end", "input", "convert", "converting", "circular",
  "structure", "assign", "assignment", "constant", "variable", "extensible", "frozen", "sealed", "configurable", "writable",
  "redefine", "define", "getter", "setter", "argument", "arguments", "parameter", "parameters", "value", "values",
  "valid", "date", "time", "precision", "radix", "digits", "range", "index", "bounds", "key", "keys", "missing",
  "required", "optional", "promise", "rejected", "rejection", "resolved", "unhandled", "uncaught", "async", "await", "awaited",
  "generator", "module", "modules", "import", "imported", "export", "exported", "dynamically", "chunk", "chunks", "loading",
  "load", "loaded", "script", "scripts", "operation", "operations", "aborted", "abort", "aborterror", "timeout", "timed",
  "timeouterror", "domexception", "notallowederror", "securityerror", "quotaexceedederror", "storage", "quota", "permission",
  "denied", "allowed", "blocked", "insecure", "secure", "context", "origin", "cross", "document", "window", "node",
  "element", "child", "parent", "removechild", "insertbefore", "appendchild", "failed", "fail", "failure", "execute", "executing",
  "construct", "instance", "class", "method", "methods", "prototype", "readonly", "proxy", "trap", "returned", "return",
  "result", "results", "empty", "found", "exist", "exists", "existing", "match", "matched", "matches", "duplicate", "unique",
  "supported", "unsupported", "implemented", "available", "unavailable", "disabled", "enabled", "ready", "closed", "open",
  "opened", "connection", "connections", "socket", "network", "networkerror", "fetch", "fetching", "request", "requests",
  "response", "responses", "status", "code", "body", "header", "headers", "url", "redirect", "redirected", "redirects", "cors",
  "server", "client", "service", "worker", "internal", "gateway", "bad", "forbidden", "unauthorized",
  "unauthenticated", "authenticated", "authentication", "authorization", "session", "sessions", "expired", "expire",
  "signed", "sign", "user", "users", "account", "rate", "limit", "limited", "retry", "retried", "retries", "again", "later",
  "try", "attempt", "attempts", "reached", "reach", "process", "memory", "heap", "allocation", "killed", "crashed",
  // React and Next.
  "react", "render", "rendered", "rendering", "component", "components", "hook", "hooks", "hydration", "hydrate", "hydrating",
  "mismatch", "text", "content", "tree", "root", "suspense", "boundary", "boundaries", "lazy", "state", "update",
  "updates", "unmounted", "mounted", "mount", "effect", "effects", "ref", "refs", "prop", "props", "children",
  "elements", "minified", "next", "page", "pages", "route", "routes", "router", "layout", "segment", "segments", "params",
  "action", "actions", "dynamic", "static", "prerender", "prerendering", "cache", "cached", "revalidate", "revalidation",
  "middleware", "edge", "runtime", "digest", "navigation", "navigate", "notfound",
  // Clerk.
  "clerk", "auth", "clerkmiddleware", "detect", "usage", "ensure", "following", "configured", "configuration", "matcher",
  "file", "directory", "inside", "verified", "issue", "problem", "communicating", "details", "see",
  // Postgres, Drizzle and Neon.
  "database", "query", "queries", "relation", "columns", "row", "rows", "table", "tables", "violates", "violation",
  "constraint", "foreign", "primary", "check", "deadlock", "detected", "serialize", "serialization", "concurrent", "transaction",
  "transactions", "lock", "locked", "terminated", "terminating", "canceling", "statement", "syntax", "near",
  "schema", "migration", "migrations", "pool", "clients", "idle", "neon", "drizzle", "postgres", "sql",
  "insert", "delete", "select", "returning",

]);

/**
 * An error class name (`ChunkLoadError`, `ZodError`): the one shape kept besides the vocabulary. camelCase, snake_case and
 * dotted words are NOT kept, because a player types names like that too (`spicyJank`, `sol.ring`); `x.map is not a function`
 * reads `· is not a function`, which still tells issues apart.
 */
function errorClassName(word: string): boolean {
  return word.length <= 40 && /^(?:[A-Z][a-z]{2,})+(?:Error|Exception)$/.test(word);
}

const DOT = "·";
const MAX_IN = 1000;
const MAX_OUT = 300;

/**
 * The message with only error words (a capitalised one only where a sentence starts) and error class names kept, each run of
 * anything else one `·`. Punctuation and spacing
 * between kept words stay, so `Cannot read properties of undefined (reading 'name')` reads
 * `Cannot read properties of undefined (reading '·')`. Null when nothing at all is kept (the caller says `[redacted]`).
 */
export function messageSkeleton(value: string): string | null {
  // Whole spans first, on the whole message, so nothing inside them is read as words and a cut cannot split one: URLs, emails,
  // a link token, a UUID, any long run with a digit in it (a token, a hash, an id), then quoted text. Double quotes and
  // backticks first, so a name's apostrophe inside them ("Rootha's Value Engine") cannot end the span.
  let s = redactPaths(value)
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, DOT)
    .replace(/[^\s@'"`]+@[^\s@'"`]+/g, DOT)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, DOT)
    .replace(/[\w-]*\d[\w-]*/g, (run) => (run.length >= 8 ? DOT : run))
    .replace(/(["`])[^"`\n]{1,200}\1/g, (_m, q: string) => `${q}${DOT}${q}`)
    .replace(/'[^'\n]{1,200}'/g, `'${DOT}'`)
    .slice(0, MAX_IN)
    .replace(/\s+/g, " ");
  let kept = 0;
  // Words in any script: the vocabulary is ASCII, so a Cyrillic, Japanese or accented word is never kept. A capitalised word
  // is kept only where a sentence starts (a name is capitalised mid-sentence: "No card named Root Out", a friend called Will)
  // or when it is one of the framework's own proper words.
  s = s.replace(/[\p{L}\p{M}_$][\p{L}\p{M}\p{N}_$]*|\p{N}+/gu, (word, at: number, whole: string) => {
    if (/^\p{N}+$/u.test(word)) return /^\d{1,3}$/.test(word) ? word : DOT;
    const known = ERROR_WORDS.has(word.toLowerCase()) && (word === word.toLowerCase() || startsSentence(whole, at) || PROPER_WORDS.has(word));
    if (known || errorClassName(word) || PROPER_WORDS.has(word)) {
      kept++;
      return word;
    }
    return DOT;
  });
  if (kept === 0) return null;
  // Anything else outside printable ASCII (a symbol, an emoji, a stray mark) goes too.
  s = s.replace(/[^\x20-\x7E·]/g, DOT);
  // One `·` for each run of scrubbed words, whatever stood between them.
  s = s.replace(new RegExp(`${DOT}(?:[\\s\\-–—,./:;&+#'_]*${DOT})+`, "g"), DOT);
  s = s.replace(/\s+/g, " ").trim();
  return s.length > MAX_OUT ? `${s.slice(0, MAX_OUT)}…` : s;
}

/** The framework's own capitalised words, kept anywhere: an engine writes them mid-sentence. */
// Product and acronym names only: an ordinary capitalised word ("Map", "Window") could be a card's, so it is kept only where a
// sentence starts, like any other.
const PROPER_WORDS: ReadonlySet<string> = new Set(["React", "Next", "Clerk", "JSON", "URL", "HTTP", "HTTPS", "API", "DOM", "SQL", "NaN", "Postgres", "Drizzle", "Neon"]);

/** The word at `at` begins the message or a sentence: only space before it back to the start, or to `.`, `:`, `!`, `?`, `;` or `(`. */
function startsSentence(whole: string, at: number): boolean {
  for (let i = at - 1; i >= 0; i--) {
    const c = whole[i];
    if (c === " ") continue;
    return ".:!?;(".includes(c);
  }
  return true;
}

/** A friend, join or admin-account path's token, before anything reads the words of it. */
function redactPaths(value: string): string {
  return value.replace(/(\/(?:friend|join|admin\/accounts)\/)[^/?#\s]+/g, `$1${DOT}`);
}
