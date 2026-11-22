import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { entryRoute, hasAriaModalAttribute, modalEntryFindings } from "./modal-entry.mjs";

describe("hasAriaModalAttribute", () => {
  it("finds the JSX attribute", () => {
    expect(hasAriaModalAttribute('export const a = <div role="dialog" aria-modal="true" />;')).toBe(true);
    expect(hasAriaModalAttribute("export const a = <div aria-modal={open ? 'true' : undefined} />;")).toBe(true);
  });
  it("ignores a comment or a string that only names it", () => {
    expect(hasAriaModalAttribute("// aria-modal lives on the panel\nexport const a = <div />;")).toBe(false);
    expect(hasAriaModalAttribute('export const a = "aria-modal";')).toBe(false);
  });
});

describe("entryRoute", () => {
  it("accepts the three entry classes", () => {
    expect(entryRoute('<div className="anim-sheet-in-phone x" />')).toBe("class");
    expect(entryRoute('<div className="anim-sheet-in" />')).toBe("class");
    expect(entryRoute('<div className="anim-sheet-up" />')).toBe("class");
  });
  it("accepts a shell import", () => {
    expect(entryRoute('import { Sheet } from "../ui/sheet";')).toBe("shell");
    expect(entryRoute('import { SocialModal } from "@/components/social/social-modal";')).toBe("shell");
  });
  it("does not read an unrelated module named sheet as a shell (the lib/guided/sheet false pass)", () => {
    expect(entryRoute('import { x } from "../../../lib/guided/sheet";')).toBeNull();
    expect(entryRoute('import { SheetGrabber } from "../../ui/sheet-grabber";')).toBeNull();
  });
  it("does not accept a near-miss class", () => {
    expect(entryRoute('<div className="anim-sheet-inx" />')).toBeNull();
  });
});

describe("modalEntryFindings", () => {
  it("reports a missing entry, honours the allow-list, and flags a stale allow entry", async () => {
    const root = await mkdtemp(join(tmpdir(), "modal-entry-"));
    await mkdir(join(root, "c"));
    await writeFile(join(root, "c", "bare.tsx"), 'export const a = <div role="dialog" aria-modal="true" />;\n');
    await writeFile(join(root, "c", "ok.tsx"), 'export const a = <div aria-modal="true" className="anim-sheet-in-phone" />;\n');
    await writeFile(join(root, "c", "listed.tsx"), 'export const a = <div aria-modal="true" />;\n');
    await writeFile(join(root, "c", "gone.tsx"), "export const a = 1;\n");
    await writeFile(join(root, "c", "bare.test.tsx"), 'export const t = <div aria-modal="true" />;\n');
    const allow = { [join(root, "c", "listed.tsx")]: "popover", [join(root, "c", "gone.tsx")]: "popover" };
    const { findings, surfaces } = await modalEntryFindings(root, allow);
    expect(surfaces).toBe(3);
    expect(findings.map((f) => `${f.path.replace(root, "")}:${f.kind}`).sort()).toEqual(["/c/bare.tsx:missing", "/c/gone.tsx:stale"]);
  });

  it("holds over the shipped tree", async () => {
    const { findings } = await modalEntryFindings("src");
    expect(findings.map((f) => `${f.path}: ${f.kind}`)).toEqual([]);
  });
});
