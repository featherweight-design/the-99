// `check:client-values`'s failure paths: each fixture is a shape that hands a server module a client reference.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { clientValueFindings, isComponentName, valueBindings } from "./client-value-imports.mjs";

const ROOT = "/repo";
const at = (path: string) => resolve(ROOT, path);
const tree = (files: Record<string, string>) => new Map(Object.entries(files).map(([path, source]) => [at(path), source]));

const CLIENT = `"use client";\nexport const HEADING_ID = "h";\nexport function Banner() { return null; }\nexport function useThing() {}\nexport type Props = {};\n`;

describe("isComponentName", () => {
  it("accepts PascalCase and refuses constants and hooks", () => {
    expect(["Banner", "HomeView"].map(isComponentName)).toEqual([true, true]);
    expect(["HEADING_ID", "ROW", "useThing", "readRaw", "A"].map(isComponentName)).toEqual([false, false, false, false, false]);
  });
});

describe("valueBindings", () => {
  it("reads default, named and re-exported values, skips types, and names a namespace `*`", () => {
    const source = `import Def, { a, type B, c as d } from "./x";\nimport type { E } from "./y";\nimport * as ns from "./z";\nexport { f } from "./w";\nimport { g } from "react";\n`;
    expect(valueBindings(source)).toEqual([
      { spec: "./x", name: "Def" }, { spec: "./x", name: "a" }, { spec: "./x", name: "c" }, { spec: "./z", name: "*" }, { spec: "./w", name: "f" },
    ]);
  });
});

describe("clientValueFindings", () => {
  it("reports a server page that takes a constant from a client module", () => {
    const files = tree({
      "src/app/page.tsx": `import { Banner, HEADING_ID } from "../components/banner";\n`,
      "src/components/banner.tsx": CLIENT,
    });
    expect(clientValueFindings(ROOT, files)).toEqual([{ path: "src/app/page.tsx", name: "HEADING_ID", from: "../components/banner" }]);
  });

  it("follows the server graph through a module with no directive", () => {
    const files = tree({
      "src/app/page.tsx": `import { Dash } from "../components/dash";\n`,
      "src/components/dash.tsx": `import { useThing } from "./banner";\n`,
      "src/components/banner.tsx": CLIENT,
    });
    expect(clientValueFindings(ROOT, files).map((f) => f.name)).toEqual(["useThing"]);
  });

  it("lets components, types and a client module's own imports through", () => {
    const files = tree({
      "src/app/page.tsx": `import { Banner, type Props } from "../components/banner";\nimport type { HEADING_ID } from "../components/banner";\n`,
      "src/components/banner.tsx": CLIENT,
      "src/components/other.tsx": `"use client";\nimport { HEADING_ID } from "./banner";\n`,
    });
    expect(clientValueFindings(ROOT, files)).toEqual([]);
  });

  it("reads only a leading directive, and follows export * and a namespace import", () => {
    const files = tree({
      "src/app/page.tsx": `import * as Parts from "../components/barrel";\n`,
      "src/components/barrel.ts": `export * from "./banner";\nimport { useThing } from "./banner"\nexport const a = 1\n`,
      "src/components/banner.tsx": CLIENT,
      "src/components/list.ts": `export const FIXTURE = ['"use client"',\n  "x"];\n`,
    });
    expect(clientValueFindings(ROOT, files)).toEqual([{ path: "src/components/barrel.ts", name: "useThing", from: "./banner" }]);
  });

  it("treats only a file named like a Next entry as a server entry", () => {
    const files = tree({
      "src/app/foo/sidebar-layout.tsx": `import { HEADING_ID } from "../../components/banner";\n`,
      "src/components/banner.tsx": CLIENT,
    });
    expect(clientValueFindings(ROOT, files)).toEqual([]);
  });

  it("does not ask a module only client code reaches", () => {
    const files = tree({
      "src/app/page.tsx": `import { Banner } from "../components/banner";\n`,
      "src/components/banner.tsx": CLIENT,
      "src/components/client-only.ts": `import { HEADING_ID } from "./banner";\n`,
      "src/components/shell.tsx": `"use client";\nimport "./client-only";\nimport { used } from "./client-only";\n`,
    });
    expect(clientValueFindings(ROOT, files)).toEqual([]);
  });
});
