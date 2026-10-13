// Every admin page and layout is gated first (the admin plan's Security section; STATES D3): a
// static read of each `page.tsx` and `layout.tsx` under src/app/admin. Its default export's first
// statement must await `requireAdmin()`, and its metadata must come through `adminMetadata`, since
// Next resolves metadata apart from the render and a static `metadata` would name the page on a
// stranger's 404. The server actions have their own static gate in `actions.test.ts`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return /^(page|layout)\.tsx?$/.test(entry) ? [path] : [];
  });
}

const flat = (node: ts.Node, source: ts.SourceFile) => node.getText(source).replace(/\s+/g, " ");
const isGate = (node: ts.Node | undefined, source: ts.SourceFile) =>
  !!node && /^(const \{[^}]*\} = |const \w+ = )?await requireAdmin\(\);?$/.test(flat(node, source));
const callsAdminMetadata = (node: ts.Node | undefined, source: ts.SourceFile) =>
  !!node && /^(return )?adminMetadata(<[^>]*>)?\(/.test(flat(node, source));

/** What is wrong with one route module's gating, or an empty list. */
function gateProblems(path: string, text: string): string[] {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const problems: string[] = [];
  let defaultGated: boolean | null = null;
  for (const st of source.statements) {
    const mods = ts.getModifiers(st as ts.HasModifiers) ?? [];
    const exported = mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const isDefault = mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    if (ts.isExportAssignment(st)) defaultGated = false; // `export default X`: a body this read cannot see
    // `export { Page as default }`, `export { metadata }` and `export * from` are refused outright,
    // as `actions.test.ts` refuses them: each can expose a body or a value this read never sees.
    if (ts.isExportDeclaration(st) && !st.isTypeOnly) {
      const named = st.exportClause && ts.isNamedExports(st.exportClause) ? st.exportClause.elements.filter((e) => !e.isTypeOnly) : null;
      if (!named) problems.push("`export *` re-exports names this check cannot read");
      else for (const e of named) problems.push(`\`export { ${e.getText(source)} }\` exposes \`${e.name.text}\` through a re-export this check cannot read`);
      continue;
    }
    if (exported && isDefault && ts.isFunctionDeclaration(st)) defaultGated = isGate(st.body?.statements[0], source);
    if (!exported || !ts.isVariableStatement(st)) {
      if (exported && ts.isFunctionDeclaration(st) && st.name?.text === "generateMetadata" && !callsAdminMetadata(st.body?.statements[0], source)) {
        problems.push("generateMetadata does not return adminMetadata(...)");
      }
      continue;
    }
    for (const d of st.declarationList.declarations) {
      const name = d.name.getText(source);
      if (name === "metadata") problems.push("a static `metadata` export names the page on a stranger's 404");
      if (name !== "generateMetadata") continue;
      const init = d.initializer;
      const body = init && ts.isArrowFunction(init) ? (ts.isBlock(init.body) ? init.body.statements[0] : init.body) : undefined;
      if (!callsAdminMetadata(body, source)) problems.push("generateMetadata does not return adminMetadata(...)");
    }
  }
  if (defaultGated !== true) problems.push("the default export does not await requireAdmin() first");
  return problems;
}

describe("every admin page and layout is gated first", () => {
  const files = routeFiles(HERE);

  it("finds the admin's routes", () => {
    const rel = files.map((f) => f.slice(HERE.length + 1));
    expect(rel).toContain("layout.tsx");
    expect(rel).toContain("page.tsx");
    expect(rel).toContain(join("switches", "page.tsx"));
  });

  it.each(files.map((f) => [f.slice(HERE.length + 1), f]))("%s", (_rel, path) => {
    expect(gateProblems(path, readFileSync(path, "utf8"))).toEqual([]);
  });
});

describe("the gate check's failure paths", () => {
  const page = (body: string, meta = 'export const generateMetadata = () => adminMetadata({ title: "X" });') =>
    `${meta}\nexport default async function Page() {\n${body}\n}`;

  it("passes a gated page", () => {
    expect(gateProblems("p.tsx", page("const { userId } = await requireAdmin();\nreturn null;"))).toEqual([]);
  });

  it("fails a page whose gate is not the first statement", () => {
    expect(gateProblems("p.tsx", page("const now = new Date();\nawait requireAdmin();"))).toEqual(["the default export does not await requireAdmin() first"]);
  });

  it("fails a page with no gate, or a default export it cannot read", () => {
    expect(gateProblems("p.tsx", page("return null;"))).toHaveLength(1);
    expect(gateProblems("p.tsx", "const Page = async () => null;\nexport default Page;")).toContain("the default export does not await requireAdmin() first");
  });

  it("fails a default export or metadata exposed through a re-export", () => {
    const gatedMeta = 'export const generateMetadata = () => adminMetadata({ title: "X" });';
    expect(gateProblems("p.tsx", `${gatedMeta}\nconst Page = async () => { await requireAdmin(); return null; };\nexport { Page as default };`)).toEqual([
      "`export { Page as default }` exposes `default` through a re-export this check cannot read",
      "the default export does not await requireAdmin() first",
    ]);
    const metadata = 'const metadata = { title: "X" };\nexport { metadata };';
    expect(gateProblems("p.tsx", page("await requireAdmin();", metadata))).toEqual([
      "`export { metadata }` exposes `metadata` through a re-export this check cannot read",
    ]);
    expect(gateProblems("p.tsx", page("await requireAdmin();", `${gatedMeta}\nexport * from "./other";`))).toEqual([
      "`export *` re-exports names this check cannot read",
    ]);
    // A type-only re-export carries no value and passes.
    expect(gateProblems("p.tsx", page("await requireAdmin();", `${gatedMeta}\nexport type { Metadata } from "next";`))).toEqual([]);
  });

  it("fails static metadata and metadata not gated through adminMetadata", () => {
    expect(gateProblems("p.tsx", page("await requireAdmin();", 'export const metadata = { title: "X" };'))).toEqual([
      "a static `metadata` export names the page on a stranger's 404",
    ]);
    expect(gateProblems("p.tsx", page("await requireAdmin();", 'export const generateMetadata = async () => ({ title: "X" });'))).toEqual([
      "generateMetadata does not return adminMetadata(...)",
    ]);
    expect(gateProblems("p.tsx", page("await requireAdmin();", 'export async function generateMetadata() { const t = "X"; return adminMetadata({ title: t }); }'))).toEqual([
      "generateMetadata does not return adminMetadata(...)",
    ]);
  });
});
