// Every `aria-modal` bottom sheet slides up on a phone and appears instantly on a desktop (Hugh's ruling, modal sweep
// #3113 to #3123). The phone entry is a class, `anim-sheet-in-phone` (animation only below `md`; `max-md:` cannot
// prefix a plain-CSS class) or the older `anim-sheet-in` / `anim-sheet-up`. A surface that forgot it opens with no
// motion and nothing else notices: no type, no lint rule, and jsdom draws no animation.
//
// This reads every non-test file under `src` for a JSX `aria-modal` ATTRIBUTE (a comment or a helper that only
// names the attribute does not count) and passes the file when either
//   - it names one of the entry classes anywhere in its text, or
//   - it imports a shell that carries the entry for it (Sheet, SocialModal, ModalChrome / receipt-modal).
// Anything else must be in ALLOW with a reason. An entry in ALLOW that the file no longer needs (it gained the
// class, or lost its `aria-modal`) is a finding too, so the list cannot rot into a blanket pass.
//
// The class check is necessary, not sufficient: SocialModal once carried the class and still did not slide. The
// real motion proofs are `pnpm probe:modal-sweep`, which presses each sheet at 390 and 1300 and reads the
// computed `animation-name`.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";

export const ENTRY_CLASS = /\banim-sheet-(?:in-phone|in|up)\b/;

// A shell that draws the phone entry on its own panel, so a caller that mounts it inherits the motion.
export const SHELL_IMPORT =
  /from\s+["'](?:[^"']*\/ui\/sheet|[^"']*\/social-modal|[^"']*\/receipt-modal|\.\/sheet)["']/;

/** The files that hold an `aria-modal` surface and are deliberately without the phone entry, each with its reason. */
export const ALLOW = {
  "src/components/discovery/first-run-tour.tsx": "A tour with its own drawn motion, not a sheet.",
  "src/components/cards/card-modal.tsx": "The card modal's stack-rise is its own drawn motion.",
  "src/components/decks/guided/guided-run-view.tsx": "The guided run view draws its own motion.",
  "src/components/tracker/sheet.tsx": "Drawn motion in the seat's rotated frame; lane 58 owns the tracker.",
  "src/components/tracker/result.tsx": "Drawn motion in the seat's rotated frame; lane 58 owns the tracker.",
  "src/components/card-search/card-search.tsx": "A full-screen search surface that rises with the keyboard (visual-viewport frame), not a bottom sheet; it is mounted hidden and toggled, so an entry would replay on every veil.",
  "src/components/decks/shelf-menu.tsx": "An anchored popover placed with position: fixed beside its trigger, not a sheet.",
  "src/components/social/friends-list.tsx": "A small fixed-width delete confirmation popover, not a sheet.",
  "src/components/landing/demo/demo-card-modal.tsx": "The landing demo of the card modal, which draws the card modal's own motion (CardModalSheet).",
  "src/components/landing/demo/demo.tsx": "A full-page demo frame, not a bottom sheet.",
};

/** True when the file has a JSX attribute named `aria-modal`. */
export function hasAriaModalAttribute(text, path = "x.tsx") {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX);
  let found = false;
  const walk = (n) => {
    if (found) return;
    if (ts.isJsxAttribute(n) && n.name.getText(sf) === "aria-modal") {
      found = true;
      return;
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return found;
}

/** Why a file is fine as it stands: "class", "shell", or null when it has neither. */
export function entryRoute(text) {
  if (ENTRY_CLASS.test(text)) return "class";
  if (SHELL_IMPORT.test(text)) return "shell";
  return null;
}

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) yield p;
  }
}

/**
 * @param {string} [root]
 * @param {Record<string, string>} [allow]
 * `{ files, surfaces, findings }`: findings are `{ path, kind, detail }`, kind "missing" or "stale". */
export async function modalEntryFindings(root = "src", allow = ALLOW) {
  const findings = [];
  const seen = new Set();
  let files = 0;
  let surfaces = 0;
  for await (const path of walk(root)) {
    files += 1;
    const text = await readFile(path, "utf8");
    if (!text.includes("aria-modal") || !hasAriaModalAttribute(text, path)) continue;
    surfaces += 1;
    seen.add(path);
    const route = entryRoute(text);
    if (route === null && !(path in allow)) {
      findings.push({ path, kind: "missing", detail: "an aria-modal surface with no phone entry (anim-sheet-in-phone) and no shell import; add the class or allow-list it with a reason" });
    }
    if (route !== null && path in allow) {
      findings.push({ path, kind: "stale", detail: `allow-listed but it now has the entry through its ${route}; remove it from ALLOW` });
    }
  }
  for (const path of Object.keys(allow)) {
    if (!seen.has(path)) findings.push({ path, kind: "stale", detail: "allow-listed but it has no aria-modal attribute any more (or no longer exists); remove it from ALLOW" });
  }
  return { files, surfaces, findings };
}
