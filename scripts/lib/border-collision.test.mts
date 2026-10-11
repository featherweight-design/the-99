import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collisionFindings, lineAt, unresolvedCollisions } from "./border-collision.mjs";

describe("unresolvedCollisions", () => {
  it("flags a bare border-b with no companion color", () => {
    const text = '<div className="border-b border-solid" />';
    expect(unresolvedCollisions(text)).toEqual([{ side: "b", offsetInFile: text.indexOf("border-b") }]);
  });

  it("flags a bare border-r the same way", () => {
    const text = '<div className="border-r" />';
    expect(unresolvedCollisions(text)).toEqual([{ side: "r", offsetInFile: text.indexOf("border-r") }]);
  });

  it("does not flag border-b-[color:...] — the side-specific override wins", () => {
    const text = '<div className="border-b border-b-[color:var(--border)]" />';
    expect(unresolvedCollisions(text)).toEqual([]);
  });

  it("accepts a side-specific NAMED color utility as the override too, not just a bracket form", () => {
    const text = '<div className="border-b border-b-accent" />';
    expect(unresolvedCollisions(text)).toEqual([]);
  });

  it("still flags a GENERIC [border-color:...] companion — it loses to the collision, confirmed by compiling the real stylesheet", () => {
    const text = '<div className="border-b border-[color:var(--border)]" />';
    expect(unresolvedCollisions(text)).toEqual([{ side: "b", offsetInFile: text.indexOf("border-b") }]);
  });

  it("never flags border-t or border-l — no --color-t/--color-l theme token exists", () => {
    const text = '<div className="border-t border-l border-solid" />';
    expect(unresolvedCollisions(text)).toEqual([]);
  });

  it("does not flag border-b-0 / border-b-2 — width-scale utilities, not the bare collision", () => {
    const text = '<div className="border-x-0 border-b-0 border-t md:border-b-0" />';
    expect(unresolvedCollisions(text)).toEqual([]);
  });

  it("keeps a variant prefix out of the match but still flags the bare collision", () => {
    const text = '<div className="md:last:border-b md:border" />';
    expect(unresolvedCollisions(text)).toEqual([{ side: "b", offsetInFile: text.indexOf("border-b") }]);
  });

  it("is unaffected by a block comment of different length, proving offsets are not shifted", () => {
    const text = `/* a longer comment line that used to shift every later offset */\n<div className="border-b border-solid" />`;
    const found = unresolvedCollisions(text);
    expect(found).toHaveLength(1);
    expect(lineAt(text, found[0].offsetInFile)).toBe(2);
    expect(text.slice(found[0].offsetInFile, found[0].offsetInFile + 8)).toBe("border-b");
  });

  it("scans each class-string span independently — a fix in a sibling string does not reach it", () => {
    const text = '<div className={"border-b " + "border-b-[color:var(--x)]"} />';
    expect(unresolvedCollisions(text)).toHaveLength(1);
  });

  it("parses a nested template literal's interpolation, not just to the next backtick (PR #1272 round 2)", () => {
    // Copilot's exact shape: closing a template at the next backtick, with no `${...}`
    // parsing, reads the INNER template's backtick as the outer one's close — so the real
    // `border-b` inside the nested template never lands in any scanned span.
    const text = 'const c = `${on ? `border-b` : ""}`;';
    const found = unresolvedCollisions(text);
    expect(found).toHaveLength(1);
    expect(text.slice(found[0].offsetInFile, found[0].offsetInFile + 8)).toBe("border-b");
  });

  it("does not double-report a collision that both the outer and inner template span cover", () => {
    const text = 'const c = `${on ? `border-b border-b-[color:var(--x)]` : ""}`;';
    expect(unresolvedCollisions(text)).toEqual([]);
  });

  it("a literal `//` inside an earlier string does not desync later string spans (PR #1272 round 1)", () => {
    // The shape that defeated the old two-pass version: `stripComments` ran a standalone `//`
    // regex before string spans were found, so `name.split(" // ")` was read as a comment start,
    // blanking the rest of that line — including the string's own closing quote — and desyncing
    // every later quote pairing in the file. The real bare `border-b` after it went unreported.
    const text = [
      'function helper() { return name.split(" // ")[0]; }',
      '<p className="border-b border-[color:var(--border)]" />',
    ].join("\n");
    const found = unresolvedCollisions(text);
    expect(found).toHaveLength(1);
    expect(lineAt(text, found[0].offsetInFile)).toBe(2);
  });
});

describe("variants", () => {
  // Tailwind emits variant rules after the unprefixed ones, so an override only fixes the bare
  // token that carries the same variant chain.
  it("flags md:border-r when only a plain override sits beside it", () => {
    const text = '<div className="md:border-r border-r-[color:var(--border)]" />';
    expect(unresolvedCollisions(text)).toEqual([{ side: "r", offsetInFile: text.indexOf("border-r") }]);
  });

  it("flags a plain border-r when only an md: override sits beside it", () => {
    const text = '<div className="border-r md:border-r-[color:var(--border)]" />';
    expect(unresolvedCollisions(text)).toHaveLength(1);
  });

  it("accepts an override spelled with the same variants, in any order of classes", () => {
    const text = '<div className="md:border-r-[color:var(--border)] md:border-r" />';
    expect(unresolvedCollisions(text)).toEqual([]);
  });

  it("reads a bracketed variant whole", () => {
    expect(unresolvedCollisions('<div className="[&>*]:border-b" />')).toHaveLength(1);
    expect(unresolvedCollisions('<div className="[&>*]:border-b [&>*]:border-b-[color:var(--x)]" />')).toEqual([]);
  });

  it("flags the important suffix form, border-b!", () => {
    expect(unresolvedCollisions('<div className="border-b!" />')).toHaveLength(1);
  });

  it("an important bare token needs an important override: a plain one loses to !important", () => {
    expect(unresolvedCollisions('<i className="border-r! border-r-[color:var(--b)]" />')).toHaveLength(1);
    expect(unresolvedCollisions('<i className="border-r! border-r-[color:var(--b)]!" />')).toEqual([]);
    expect(unresolvedCollisions('<i className="border-r border-r-[color:var(--b)]!" />')).toHaveLength(1);
    expect(unresolvedCollisions('<i className="!border-r border-r-[color:var(--b)]" />')).toHaveLength(1);
  });

  it("keeps a quoted attribute selector inside a bracketed variant whole", () => {
    const x = "[&[data-x='a']]:border-r";
    const y = "[&[data-y='a']]:border-r-[color:var(--border)]";
    expect(unresolvedCollisions(`<i className="${x} ${y}" />`)).toHaveLength(1);
    expect(unresolvedCollisions(`<i className="${x} [&[data-x='a']]:border-r-[color:var(--border)]" />`)).toEqual([]);
    expect(unresolvedCollisions('<i className="[&[data-x=\\"a\\"]]:border-r" />')).toHaveLength(1);
    // A quote inside the override's own bracketed value does not cut it short, so its `!` is still read.
    expect(unresolvedCollisions(`<i className="border-r! border-r-[color:var(--x,'a')]!" />`)).toEqual([]);
  });

  it("reads the legacy prefix ! after the variants: md:!border-r and [&>*]:!border-b", () => {
    expect(unresolvedCollisions('<i className="md:!border-r" />')).toHaveLength(1);
    expect(unresolvedCollisions('<i className="[&>*]:!border-b" />')).toHaveLength(1);
    expect(unresolvedCollisions('<i className="md:!border-r border-r-[color:var(--b)]" />')).toHaveLength(1);
    expect(unresolvedCollisions('<i className="md:!border-r md:!border-r-[color:var(--b)]" />')).toEqual([]);
    expect(unresolvedCollisions('<i className="md:!border-r !border-r-[color:var(--b)]" />')).toHaveLength(1);
  });
});

describe("stylesheets", () => {
  it("flags a bare border-r in an @apply, on its own line, and ignores a comment naming it", () => {
    const css = ["/* .a { @apply border-r; } */", ".b {", "  @apply border-r px-2;", "}"].join("\n");
    const found = unresolvedCollisions(css, "css");
    expect(found).toHaveLength(1);
    expect(lineAt(css, found[0].offsetInFile)).toBe(3);
  });

  it("accepts an @apply that carries its own side-specific color", () => {
    expect(unresolvedCollisions(".b { @apply border-r border-r-[color:var(--border)]; }", "css")).toEqual([]);
  });
});

describe("collisionFindings", () => {
  describe("a bare token also paints the OTHER drawn sides", () => {
    // findings-block.tsx (bug 3): `md:border` draws all four sides and `md:last:border-b` painted
    // them all in mana black, with only the bottom overridden. The override fixes one side.
    it("flags md:last:border-b beside md:border even with a bottom override at its variants", () => {
      const text = '<li className="md:border md:border-[color:var(--s)] md:last:border-b md:last:border-b-[color:var(--s)]" />';
      expect(unresolvedCollisions(text).map((f) => f.side)).toEqual(["b"]);
    });

    it("flags a rotated caret: border-b + border-l, the left painted by the bare token's color", () => {
      const text = '<span className="border-b border-b-[color:var(--s)] border-l border-[color:var(--s)]" />';
      expect(unresolvedCollisions(text)).toHaveLength(1);
    });

    it("accepts a bare token whose other sides are zero, the divider shape", () => {
      const text = '<div className="border border-0 border-b border-b-[color:var(--s)]" />';
      expect(unresolvedCollisions(text)).toEqual([]);
    });

    it("accepts a width a zero at a variant between the two takes back", () => {
      const text = '<div className="border-r-2 md:border-r-0 md:border-b md:border-b-[color:var(--s)]" />';
      expect(unresolvedCollisions(text)).toEqual([]);
    });

    it("accepts another drawn side that has a color of its own", () => {
      const text = '<li className="border-t border-b border-t-[color:var(--s)] border-b-[color:var(--s)]" />';
      expect(unresolvedCollisions(text)).toEqual([]);
    });

    it("reads a quoted attribute selector inside a bracketed variant as one token", () => {
      const text = `<i className="[&[data-x='a']]:border-b [&[data-x='a']]:border-b-[color:var(--s)] [&[data-x='a']]:border-l" />`;
      expect(unresolvedCollisions(text)).toHaveLength(1);
    });

    it("does not let a color active only at md cover a side drawn below it", () => {
      const text = '<i className="border-b border-b-[color:var(--s)] border-l md:border-l-[color:var(--s)]" />';
      expect(unresolvedCollisions(text)).toHaveLength(1);
    });

    it("flags a width under a variant the bare token lacks: both apply from md up", () => {
      const text = '<div className="md:border border-b border-b-[color:var(--s)]" />';
      expect(unresolvedCollisions(text)).toHaveLength(1);
    });
  });

  it("reads .tsx, .ts and .css, skips tests, and reports the line", async () => {
    const root = await mkdtemp(join(tmpdir(), "border-"));
    await mkdir(join(root, "lib"));
    await writeFile(join(root, "a.tsx"), 'export const a = <i className="border-r" />;\n');
    await writeFile(join(root, "lib", "b.ts"), 'export const b = "x";\nexport const c = "border-b px-2";\n');
    await writeFile(join(root, "c.css"), ".d {\n  @apply border-b;\n}\n");
    await writeFile(join(root, "a.test.tsx"), 'export const t = "border-r";\n');
    const { files, findings } = await collisionFindings(root);
    expect(files).toBe(3);
    expect(findings.map((f) => `${f.path.replace(root, "")}:${f.line}:${f.side}`).sort()).toEqual([
      "/a.tsx:1:r",
      "/c.css:2:b",
      "/lib/b.ts:2:b",
    ]);
  });
});

describe("the shipped tree", () => {
  it("has no unresolved border-r/border-b collisions in any .tsx, .ts or .css under src", async () => {
    const { files, findings } = await collisionFindings("src");
    expect(files).toBeGreaterThan(500);
    expect(findings.map((f) => `${f.path}:${f.line} bare "border-${f.side}"`)).toEqual([]);
  });
});
