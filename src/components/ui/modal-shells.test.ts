import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { popoverRoom } from "./filter-panel";

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
};

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

type Tag = { node: ts.JsxOpeningElement | ts.JsxSelfClosingElement; attrs: string; className: string; style: string };

function tags(sf: ts.SourceFile): Tag[] {
  const out: Tag[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const attr = (name: string) =>
        n.attributes.properties.find((a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText() === name)?.initializer?.getText() ?? "";
      out.push({ node: n, attrs: n.attributes.getText(), className: attr("className"), style: attr("style") });
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
  const boxes = all.filter((t) => t.attrs.includes(shell.box));
  if (boxes.length !== 1) return [`${where()}: ${boxes.length} elements match the box locator ${JSON.stringify(shell.box)}; it must be exactly one`];
  const box = boxes[0];
  const at = where(sf.getLineAndCharacterOfPosition(box.node.getStart()).line + 1);
  // The box's classes, with every constant it names inlined.
  const named = [...(shell.classConsts ?? []), ...[...box.className.matchAll(/\b[A-Z][A-Z0-9_]+\b/g)].map((m) => m[0])];
  const classes = [box.className, ...named.map((n) => consts.get(n) ?? "")].join(" ");
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
    const body = all.some((t) => {
      if (t === box) return false;
      const c = [t.className, ...[...t.className.matchAll(/\b[A-Z][A-Z0-9_]+\b/g)].map((m) => consts.get(m[0]) ?? "")].join(" ");
      return /(?<![\w-])overflow-(?:y-)?auto(?![\w-])/.test(c) && /(?<![\w-])(?:min-h-0|flex-1)(?![\w-])/.test(c);
    });
    if (!body) found.push(`${at}: no body scroll container (overflow-y-auto with min-h-0 or flex-1) besides the box`);
  }
  if (!shell.lockBy && !/\b(?:useDialogA11y|useScrollLock)\(/.test(sf.getText())) found.push(`${at}: takes no scroll lock (useDialogA11y or useScrollLock)`);
  return found;
}

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

describe("popoverRoom", () => {
  it("is the room under the trigger less the 6px drop and the 16px gutter, never under 160", () => {
    expect(popoverRoom(100, 900)).toBe(778);
    expect(popoverRoom(800, 900)).toBe(160);
  });
});
