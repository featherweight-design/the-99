import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { popoverPlacement } from "./filter-panel";

// Hugh's modal rule, for every modal: the box has a max height within the viewport, the list or body is a scroll
// container, the header and footer stay visible, and the shared scroll lock is respected. It is kept in the SHARED
// shells, never per screen, so this names each shell's file and reads its box from the parse tree:
//
// 1. CAP. The box's classes bound its height by the viewport at the phone AND at the desktop: a `h-`/`max-h-`
//    holding a vh/dvh/svh or % term (`max-h-[78dvh]`, `h-full`, `max-h-dvh`), or `inset-0`/`inset-y-0`. A level's
//    value is its own prefixed token when it has one (`md:h-auto` overrides a bare `h-full`), else the bare one.
//    A cap measured at run time names its style key instead (the FilterPanel popover's `maxHeight`).
// 2. THE BOX IS NOT THE SCROLLER. A box that scrolls carries its title and buttons away with the body.
// 3. A BODY SCROLLS. Some other element in the file is `overflow-y-auto` (or `overflow-auto`) and may shrink
//    (`min-h-0` or `flex-1`), so the box's cap squeezes the body and not the header or footer.
// 4. A COLUMN. The box is `flex-col`, so the header and footer sit outside the body as its siblings.
// 5. THE LOCK. The file takes the shared lock (`useDialogA11y` or `useScrollLock`), unless its callers do.
//
// A static scan cannot add a frame's padding to a box's cap: SocialModal's 10dvh pad plus its cap is asserted in
// src/components/social/modals.test.tsx. The render-level proofs live in each shell's own test (sheet.test.tsx).

type Shell = {
  name: string;
  file: string;
  /** A substring unique to the box's opening tag. */
  box: string;
  /** Names of string constants (in the file or `constFiles`) whose classes the box takes, when its className is a prop. */
  classConsts?: string[];
  constFiles?: string[];
  /** The style key carrying a cap measured at run time, instead of a class. */
  styleCap?: string;
  /** Who takes the scroll lock when the shell itself does not. */
  lockBy?: string;
  /** Why a shell is exempt from the body-scroll rule. */
  noBody?: string;
  /** The attribute holding the box's classes, when it is not `className` (a `Sheet` caller's `panelClassName`). */
  classAttr?: string;
  /** Files whose elements may supply the body scroller, when the box's children are drawn there. */
  bodyFiles?: string[];
};

// A `Sheet` caller that overrides the panel draws the box in its own class; the Sheet draws the body scroller.
const sheetOverride = (name: string, file: string): Shell => ({ name: `Sheet override: ${name}`, file, box: "panelClassName=", classAttr: "panelClassName", bodyFiles: ["src/components/ui/sheet.tsx"] });

export const SHELLS: Shell[] = [
  // `Sheet` takes its panel classes as a prop defaulting to PANEL; callers that override them keep the cap in their
  // own class. `SheetHeader` is the header slot it renders above the body, outside the scroller (sheet.test.tsx).
  { name: "Sheet (+ SheetHeader)", file: "src/components/ui/sheet.tsx", box: "className={panelClassName}", classConsts: ["PANEL"], lockBy: "each caller (sheet.tsx header comment)" },
  { name: "SocialModal", file: "src/components/social/social-modal.tsx", box: 'data-social-modal=""' },
  { name: "ModalChrome / ModalPanel", file: "src/components/decks/receipt-modal.tsx", box: 'role="dialog"' },
  { name: "FilterPanel popover (desktop)", file: "src/components/ui/filter-panel.tsx", box: "top-[calc(100%+6px)]", styleCap: "maxHeight" },
  { name: "FilterPanel sheet (phone)", file: "src/components/ui/filter-panel.tsx", box: 'aria-modal="true"' },
  { name: "Rack FilterSheet", file: "src/components/commanders/rack/filter-sheet.tsx", box: 'role="dialog"' },
  { name: "SetListSheet", file: "src/components/ui/set-list-sheet.tsx", box: 'role="dialog"' },
  { name: "Collection side sheet: Edit copies", file: "src/components/collection/edit-copies-sheet.tsx", box: "className={SHEET_PANEL_CLASS}", constFiles: ["src/components/collection/sheet-frame.ts"] },
  { name: "Collection side sheet: Add cards", file: "src/components/collection/add-cards-sheet.tsx", box: "className={SHEET_PANEL_CLASS}", constFiles: ["src/components/collection/sheet-frame.ts"] },
  { name: "ModelConfirm", file: "src/components/admin/model-confirm.tsx", box: 'role="dialog"' },
  { name: "PreconLinkDialogs", file: "src/components/decks/precons/precon-link-dialogs.tsx", box: 'role="dialog"' },
  { name: "GotItConfirm", file: "src/components/decks/got-it-confirm.tsx", box: 'role="dialog"' },
  { name: "RevertConfirm", file: "src/components/collection/revert-confirm.tsx", box: 'role="dialog"' },
  { name: "CopyChooserDialog", file: "src/components/decks/copy-chooser-dialog.tsx", box: 'role="dialog"' },
  { name: "GotItReceipt undo warning", file: "src/components/decks/got-it-receipt.tsx", box: 'role="dialog"', bodyFiles: ["src/components/collection/short-deck-warning.tsx"] },
  { name: "ShelfSheet", file: "src/components/decks/shelf-sheet.tsx", box: 'role="dialog"' },
  sheetOverride("collection FilterSheet", "src/components/collection/filter-sheet.tsx"),
  sheetOverride("DeckFilterSheet", "src/components/decks/deck-filter-sheet.tsx"),
  sheetOverride("IssueInspector (phone)", "src/components/collection/issue-inspector.tsx"),
  { name: "FolderCreateDialog", file: "src/components/decks/folder-create-dialog.tsx", box: 'role="dialog"', noBody: "a heading, one name field, an error line and two buttons: nothing in it grows" },
  // App-wide by reach: one provider mounts each. The card modal is the desktop card dialog and, below md, the phone
  // card-details sheet (the same box, full height).
  { name: "Card modal / card-details sheet", file: "src/components/cards/card-modal.tsx", box: 'role="dialog"' },
  { name: "Help panel", file: "src/components/help/help-panel.tsx", box: 'role="dialog"' },
];

/** A height token: its variant chain, the property, and the value. */
const HEIGHT = /(?<![\w[-])((?:[\w[\]():@-]+:)*)(max-h|h|inset-y|inset)-(\[[^\]]*\]|[\w.]+)/g;
const SCROLLS = /(?<![\w-])(?:[\w[\]():@-]+:)*overflow-(?:y-)?(?:auto|scroll)(?![\w-])/;

function isCapValue(prop: string, value: string): boolean {
  if (prop === "inset" || prop === "inset-y") return value === "0";
  if (value.startsWith("[")) return /(?:vh|dvh|svh|lvh|%)/.test(value);
  return /^(?:full|dvh|svh|lvh|screen)$/.test(value);
}

/** Whether `classes` bound the box's height at the phone and at the desktop (see rule 1). */
export function capsAt(classes: string): { phone: boolean; desktop: boolean } {
  const tokens = [...classes.matchAll(HEIGHT)].map((m) => ({ variants: m[1], prop: m[2] === "inset-y" ? "inset" : m[2], cap: isCapValue(m[2], m[3]) }));
  const level = (own: string) => {
    for (const prop of ["h", "max-h", "inset"]) {
      const mine = tokens.filter((t) => t.prop === prop && t.variants === own);
      const bare = tokens.filter((t) => t.prop === prop && t.variants === "");
      if ((mine.length > 0 ? mine : bare).some((t) => t.cap)) return true;
    }
    return false;
  };
  return { phone: level("max-md:"), desktop: level("md:") };
}

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const parse = (file: string, text: string) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

/** Every top-level string constant in a file, by name, as its source text. */
function constants(sf: ts.SourceFile): Map<string, string> {
  const out = new Map<string, string>();
  sf.forEachChild((n) => {
    if (!ts.isVariableStatement(n)) return;
    for (const d of n.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer) out.set(d.name.text, d.initializer.getText());
  });
  return out;
}

type Tag = { node: ts.JsxOpeningElement | ts.JsxSelfClosingElement; attrs: string; className: string; style: string; attr: (name: string) => string };

function tags(sf: ts.SourceFile): Tag[] {
  const out: Tag[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const attr = (name: string) =>
        n.attributes.properties.find((a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText() === name)?.initializer?.getText() ?? "";
      out.push({ node: n, attrs: n.attributes.getText(), className: attr("className"), style: attr("style"), attr });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** Each way `shell` breaks the rule, as `file:line: why`. Pass `text` to check a fixture instead of the file. */
export function shellFailures(shell: Shell, text?: string): string[] {
  const where = (line?: number) => `${shell.file}${line ? `:${line}` : ""}`;
  if (text === undefined && !existsSync(join(process.cwd(), shell.file))) return [`${where()}: the file is gone; update SHELLS`];
  const sf = parse(shell.file, text ?? read(shell.file));
  const consts = constants(sf);
  for (const f of shell.constFiles ?? []) for (const [k, v] of constants(parse(f, read(f)))) consts.set(k, v);
  const all = tags(sf);
  const bodyTags = (shell.bodyFiles ?? []).flatMap((f) => {
    const other = parse(f, read(f));
    for (const [k, v] of constants(other)) if (!consts.has(k)) consts.set(k, v);
    return tags(other);
  });
  const boxes = all.filter((t) => t.attrs.includes(shell.box));
  if (boxes.length !== 1) return [`${where()}: ${boxes.length} elements match the box locator ${JSON.stringify(shell.box)}; it must be exactly one`];
  const box = boxes[0];
  const at = where(sf.getLineAndCharacterOfPosition(box.node.getStart()).line + 1);
  // The box's classes, with every constant it names inlined.
  const own = box.attr(shell.classAttr ?? "className");
  const named = [...(shell.classConsts ?? []), ...[...own.matchAll(/\b[A-Z][A-Z0-9_]+\b/g)].map((m) => m[0])];
  const classes = [own, ...named.map((n) => consts.get(n) ?? "")].join(" ");
  const found: string[] = [];

  if (shell.styleCap) {
    if (!new RegExp(`\\b${shell.styleCap}\\s*:`).test(box.style)) found.push(`${at}: no ${shell.styleCap} in the box's style; its cap is measured at run time`);
  } else {
    const cap = capsAt(classes);
    if (!cap.phone) found.push(`${at}: no viewport-bounded height on the box at the phone (max-h-[..dvh], h-full, inset-0)`);
    if (!cap.desktop) found.push(`${at}: no viewport-bounded height on the box at the desktop (md: overrides the bare cap, or there is none)`);
  }
  if (SCROLLS.test(classes)) found.push(`${at}: the box itself scrolls, so its header and footer scroll away with the body`);
  if (!/(?<![\w-])flex-col(?![\w-])/.test(classes)) found.push(`${at}: the box is not a flex column, so nothing keeps its header and footer outside the body`);
  if (!shell.noBody) {
    const body = [...all, ...bodyTags].some((t) => {
      if (t === box) return false;
      const c = [t.className, ...[...t.className.matchAll(/\b[A-Z][A-Z0-9_]+\b/g)].map((m) => consts.get(m[0]) ?? "")].join(" ");
      return /(?<![\w-])overflow-(?:y-)?auto(?![\w-])/.test(c) && /(?<![\w-])(?:min-h-0|flex-1)(?![\w-])/.test(c);
    });
    if (!body) found.push(`${at}: no body scroll container (overflow-y-auto with min-h-0 or flex-1) besides the box`);
  }
  if (!shell.lockBy && !/\b(?:useDialogA11y|useScrollLock)\(/.test(sf.getText())) found.push(`${at}: takes no scroll lock (useDialogA11y or useScrollLock)`);
  return found;
}

// The cap is in dvh, never vh: dvh tracks the browser's dynamic toolbars (a phone's address bar showing or
// hiding), where vh is the large viewport, so a vh-capped box can run under a shown toolbar and lose its footer.
// dvh does NOT track the on-screen keyboard: on iOS Safari and default Android Chrome the keyboard shrinks the
// VISUAL viewport, not the layout viewport dvh measures. Keyboard framing is visual-viewport framing, which
// SocialModal does with --social-vv-h; the other input-bearing shells get it in a follow-up. Every height and
// max-height under src/components is swept, class token or style key, so a new modal cannot bring vh back.
// `h-screen` is 100vh.
const VH_TOKEN = /(?<![\w-])(?:[\w[\]():@-]+:)*(?:max-h-|h-|min-h-)(?:\[[^\]\s]*\]|screen)(?![\w-])/g;
const VH_STYLE = /\b(?:maxHeight|height|minHeight)\s*:\s*["'`][^"'`]*/g;
/** A vh length, once dvh, svh and lvh are struck out. */
const hasVh = (v: string) => /\dvh\b/.test(v.replace(/[dsl]vh/g, ""));
const isVh = (v: string) => hasVh(v) || /(?:^|:)(?:max-h|h)-screen$/.test(v);

/** A `vh` height that is not a modal's cap, with the reason it may stay, by `file` and the exact token. */
export const VH_ALLOWED: { file: string; token: string; why: string }[] = [
  { file: "src/components/shell/nav.tsx", token: "h-screen", why: "the desktop rail is a sticky page column, not a modal, and its touch form is already `touch:h-dvh`" },
  { file: "src/components/decks/builder-shell.tsx", token: "h-screen", why: "a comment naming the frame the deck page used to have, not a class" },
];

/** Every `vh` height or max-height in `text`, as `file:line: token`, less the allowlist. */
export function vhHeights(file: string, text: string): string[] {
  const out: string[] = [];
  text.split("\n").forEach((line, i) => {
    const found = [...line.matchAll(VH_TOKEN)].map((m) => m[0]).filter(isVh);
    found.push(...[...line.matchAll(VH_STYLE)].map((m) => m[0]).filter(hasVh));
    for (const token of found) if (!VH_ALLOWED.some((a) => a.file === file && a.token === token)) out.push(`${file}:${i + 1}: ${token}`);
  });
  return out;
}

function componentFiles(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? componentFiles(`${dir}/${e.name}`) : e.name.endsWith(".tsx") && !/\.test\.tsx$/.test(e.name) ? [`${dir}/${e.name}`] : [],
  );
}

describe("no vh height under src/components", () => {
  it("every height and max-height is in dvh (or not viewport-bound)", () => {
    const files = componentFiles("src/components");
    expect(files.length).toBeGreaterThan(100);
    expect(files.flatMap((f) => vhHeights(f, read(f)))).toEqual([]);
  });

  it("names a vh class, a vh style key and h-screen, and passes dvh, svh and a vh width", () => {
    expect(vhHeights("f.tsx", 'className="flex max-h-[86vh] flex-col"')).toEqual(["f.tsx:1: max-h-[86vh]"]);
    expect(vhHeights("f.tsx", 'className="md:max-h-[calc((100vh+min(620px,85dvh))/2-60px)]"')).toHaveLength(1);
    expect(vhHeights("f.tsx", 'style={{ maxHeight: "min(85vh, 760px)" }}')).toEqual(['f.tsx:1: maxHeight: "min(85vh, 760px)']);
    expect(vhHeights("f.tsx", 'className="h-screen"')).toEqual(["f.tsx:1: h-screen"]);
    expect(vhHeights("f.tsx", 'className="max-h-[86dvh] h-[100svh] w-[50vw] min-h-screen"')).toEqual([]);
    expect(VH_ALLOWED.every((a) => vhHeights(a.file, read(a.file)).length === 0 && read(a.file).includes(a.token))).toBe(true);
  });
});

describe("modal shells: capped box, scrolling body, pinned header and footer", () => {
  it("every shared shell keeps the rule", () => {
    expect(SHELLS.flatMap((s) => shellFailures(s))).toEqual([]);
  });

  const fixture = (box: string, rest = "") =>
    `export function M() { useDialogA11y(r, c); return <div role="dialog" className="${box}"><h2 /><div className="min-h-0 flex-1 overflow-y-auto">${rest}</div><footer /></div>; }`;
  const shell: Shell = { name: "fixture", file: "f.tsx", box: 'role="dialog"' };

  it("passes a capped column with a scrolling body", () => {
    expect(shellFailures(shell, fixture("flex max-h-[90dvh] flex-col overflow-hidden"))).toEqual([]);
    expect(shellFailures(shell, fixture("flex h-full flex-col md:h-[620px] md:max-h-[85vh]"))).toEqual([]);
    expect(shellFailures(shell, fixture("fixed inset-0 flex flex-col md:inset-y-0"))).toEqual([]);
  });

  it("names a box that scrolls whole, an uncapped box, a desktop override and a missing body", () => {
    expect(shellFailures(shell, fixture("flex max-h-[92vh] flex-col overflow-y-auto"))).toEqual(["f.tsx:1: the box itself scrolls, so its header and footer scroll away with the body"]);
    expect(shellFailures(shell, fixture("flex w-full flex-col"))).toHaveLength(2);
    expect(shellFailures(shell, fixture("flex h-[calc(100%-52px)] flex-col md:h-auto"))).toEqual([
      "f.tsx:1: no viewport-bounded height on the box at the desktop (md: overrides the bare cap, or there is none)",
    ]);
    const noBody = `export function M() { useDialogA11y(r, c); return <div role="dialog" className="flex max-h-[90dvh] flex-col"><p /></div>; }`;
    expect(shellFailures(shell, noBody)).toEqual(["f.tsx:1: no body scroll container (overflow-y-auto with min-h-0 or flex-1) besides the box"]);
  });

  it("reads a px height as no cap, and a viewport calc as one", () => {
    expect(capsAt("h-[620px]")).toEqual({ phone: false, desktop: false });
    expect(capsAt("max-md:max-h-[calc(var(--vv,100vh)*0.92)] md:max-h-[calc(90dvh-24px)]")).toEqual({ phone: true, desktop: true });
  });
});

describe("popoverPlacement", () => {
  const GUTTER = 16;
  /** The placed box's top and bottom in viewport px, for a trigger [top, bottom] and the box's natural height. */
  const placed = (top: number, bottom: number, vh: number, wanted: number) => {
    const p = popoverPlacement(top, bottom, vh, wanted);
    const h = Math.min(wanted, p.maxHeight);
    return p.side === "below" ? { ...p, top: bottom + 6, bottom: bottom + 6 + h } : { ...p, top: top - 6 - h, bottom: top - 6 };
  };

  it("opens below with the room under the trigger, less the 6px drop and the 16px gutter, when it fits", () => {
    expect(popoverPlacement(60, 100, 900, 500)).toEqual({ side: "below", maxHeight: 778 });
  });

  it("flips above a trigger near the fold, capped to the room above", () => {
    expect(popoverPlacement(760, 800, 900, 500)).toEqual({ side: "above", maxHeight: 738 });
  });

  it("stays below, capped to the room there, when below has at least as much room as above", () => {
    expect(popoverPlacement(400, 440, 900, 600)).toEqual({ side: "below", maxHeight: 438 });
  });

  it("never places the box past the viewport, at any trigger and height", () => {
    const off: string[] = [];
    for (const vh of [500, 700, 900, 1200])
      for (let top = 0; top + 40 <= vh; top += 20)
        for (const wanted of [0, 80, 200, 384, 520, 900, 2000]) {
          const b = placed(top, top + 40, vh, wanted);
          if (b.top < GUTTER || b.bottom > vh - GUTTER) off.push(`vh ${vh} trigger ${top} wanted ${wanted}: ${b.side} ${b.top}..${b.bottom}`);
        }
    expect(off).toEqual([]);
  });
});
