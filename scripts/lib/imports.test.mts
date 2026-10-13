// @vitest-environment node
import { describe, expect, it } from "vitest";
import { importsSharedBinding, resolveSpecifier, toPosix } from "./imports.mjs";

const FILE = "src/components/decks/decks-view.tsx";
const MODULE = "src/components/ui/filter-chassis";
const ask = (source: string, file = FILE) =>
  importsSharedBinding({ source, file, module: MODULE, binding: "FilterChassis" });

describe("resolveSpecifier", () => {
  it("resolves a relative specifier against the importing file", () => {
    expect(resolveSpecifier(FILE, "../ui/filter-chassis")).toBe(MODULE);
  });

  it("resolves the @/ alias to src/", () => {
    expect(resolveSpecifier(FILE, "@/components/ui/filter-chassis")).toBe(MODULE);
  });

  it("does not resolve a bare package specifier", () => {
    expect(resolveSpecifier(FILE, "react")).toBeNull();
  });

  it("separates a confusable module with the same basename", () => {
    // The reason specifiers are resolved rather than string-matched: this is a
    // different module whose path ends in the same two words.
    expect(resolveSpecifier(FILE, "../../lib/copy/filter-chassis")).not.toBe(MODULE);
  });

  it("normalises backslashes to forward slashes", () => {
    // On Windows `path.normalize` returns backslashes and the comparison against
    // a slash-written target fails for every route at once. Asserted on the pure
    // transform, because a macOS run can never produce a backslash to observe.
    expect(toPosix("src\\components\\ui\\filter-chassis")).toBe(MODULE);
    expect(resolveSpecifier(FILE, "../ui/filter-chassis")).toBe(MODULE);
  });
});

describe("importsSharedBinding", () => {
  const USE = '\nexport const View = () => <FilterChassis />;';

  it("accepts the binding among other named imports", () => {
    expect(
      ask('import { CHASSIS_WIDE_MIN_PX, FilterChassis } from "../ui/filter-chassis";' + USE),
    ).toBe(true);
  });

  it("rejects an import that is never used", () => {
    // Neither the ESLint config nor the tsconfig flags an unused local, so a
    // view could keep rendering its own FilterBar, add this line, and satisfy
    // both this check and the marker one — green for a route in exactly the
    // state the command exists to catch.
    expect(ask('import { FilterChassis } from "../ui/filter-chassis";')).toBe(false);
  });

  it("does not count a property key, a property access, or a shadowing name", () => {
    // An identifier with the right text is not a use of the import. A parameter
    // named after the component shadows it; `x.FilterChassis` names a property.
    const imp = 'import { FilterChassis } from "../ui/filter-chassis";';
    expect(ask(imp + '\nexport const o = { FilterChassis: true };')).toBe(false);
    expect(ask(imp + '\nexport const v = theme.FilterChassis;')).toBe(false);
    expect(ask(imp + '\nexport function render(FilterChassis) { return null; }')).toBe(false);
    // Shorthand IS a use — the value is the imported one.
    expect(ask(imp + '\nexport const o = { FilterChassis };')).toBe(true);
  });

  it("accepts a reference that is not JSX", () => {
    expect(
      ask('import { FilterChassis } from "../ui/filter-chassis";\nconst C = FilterChassis;'),
    ).toBe(true);
  });

  it("accepts a multi-line clause", () => {
    expect(
      ask('import {\n  CHASSIS_WIDE_MIN_PX,\n  FilterChassis,\n} from "../ui/filter-chassis";' + USE),
    ).toBe(true);
  });

  it("rejects a default import, in both spellings", () => {
    // `import FilterChassis from "…"` takes the module's DEFAULT export and
    // calls it `FilterChassis` locally. That is not the named `FilterChassis`
    // export the invariant is about — the same category error as the namespace
    // case — and the two spellings have to agree.
    // Each carries a USE, or the reference requirement would reject them for
    // the wrong reason and the assertion would prove nothing about defaults.
    expect(ask('import FilterChassis from "../ui/filter-chassis";' + USE)).toBe(false);
    expect(ask('import { default as FilterChassis } from "../ui/filter-chassis";' + USE)).toBe(
      false,
    );
    expect(
      ask('import FilterChassis, { type FilterChip } from "../ui/filter-chassis";' + USE),
    ).toBe(false);
  });

  it("still sees the named export beside a default import", () => {
    expect(ask('import Other, { FilterChassis } from "../ui/filter-chassis";' + USE)).toBe(true);
  });

  it("rejects a prose mention on a line comment", () => {
    // The first finding this file exists for: a bare `from "…"` regex reads
    // this as an import and reports a route as sharing when it does not.
    expect(ask('// import { FilterChassis } from "../ui/filter-chassis";' + USE)).toBe(false);
  });

  it("rejects an import quoted inside a block comment", () => {
    // Not hypothetical: this repo's scripts open with block comments that quote
    // example code, so a line beginning with `import` sits inside one.
    expect(
      // Column zero inside the comment — indented by a leading ` * ` it would
      // not reach the anchor anyway, and the test would prove nothing.
      ask('/*\nimport { FilterChassis } from "../ui/filter-chassis";\n*/' + USE),
    ).toBe(false);
  });

  it("rejects an import inside a template literal", () => {
    expect(
      ask('const snippet = `\nimport { FilterChassis } from "../ui/filter-chassis";\n`;' + USE),
    ).toBe(false);
  });

  it("rejects an import inside an ordinary string", () => {
    expect(
      ask('const doc = \'import { FilterChassis } from "../ui/filter-chassis"\';' + USE),
    ).toBe(false);
  });

  it("rejects a constant-only import from the shared module", () => {
    // `/collection`'s browser.tsx, exactly: it takes the breakpoint and renders
    // its own FilterBar.
    expect(ask('import { CHASSIS_WIDE_MIN_PX } from "../ui/filter-chassis";' + USE)).toBe(false);
  });

  it("rejects a type-only import, in both spellings", () => {
    // Referenced in a type position, so the rejection is about `isTypeOnly`
    // rather than about the import being unused.
    const TYPE_USE = '\ntype T = FilterChassis;';
    expect(ask('import type { FilterChassis } from "../ui/filter-chassis";' + TYPE_USE)).toBe(false);
    expect(ask('import { type FilterChassis } from "../ui/filter-chassis";' + TYPE_USE)).toBe(false);
  });

  it("rejects the binding imported from a different module", () => {
    expect(ask('import { FilterChassis } from "../../lib/copy/filter-chassis";' + USE)).toBe(
      false,
    );
  });

  it("rejects a longer name that merely starts with the binding", () => {
    expect(
      ask(
        'import { FilterChassisCopy } from "../ui/filter-chassis";\nexport const V = () => <FilterChassisCopy />;',
      ),
    ).toBe(false);
  });

  it("follows the exported name through an alias", () => {
    // `name` is the local alias and `propertyName` the exported symbol. Reading
    // the alias is wrong in both directions, so both directions are asserted.
    expect(
      ask(
        'import { FilterChassis as Chassis } from "../ui/filter-chassis";\nexport const V = () => <Chassis />;',
      ),
    ).toBe(true);
    expect(ask('import { Other as FilterChassis } from "../ui/filter-chassis";' + USE)).toBe(
      false,
    );
  });

  it("does not read a side-effect import into a later re-export", () => {
    // The round-3 finding: a lazy regex ran from `import` across the blank line
    // to the re-export's `from`, and reported a value import that is not there.
    expect(
      ask('import "./setup";\n\nexport { FilterChassis } from "../ui/filter-chassis";' + USE),
    ).toBe(false);
  });

  it("rejects a namespace import, whatever it is bound to", () => {
    // A namespace import binds the module object, not the export. A local name
    // that reads like the export says nothing about which export is used, so a
    // view importing the namespace and rendering its own control would
    // otherwise satisfy the invariant.
    expect(
      ask(
        'import * as FilterChassisNs from "../ui/filter-chassis";\nexport const V = () => <FilterChassisNs.FilterChassis />;',
      ),
    ).toBe(false);
    expect(ask('import * as FilterChassis from "../ui/filter-chassis";' + USE)).toBe(false);
  });

  it("accepts the binding loaded on demand and used", () => {
    const source = [
      'const FilterChassis = onDemand(() => import("../ui/filter-chassis").then((m) => m.FilterChassis));',
      "export const View = () => <FilterChassis />;",
    ].join("\n");
    expect(ask(source)).toBe(true);
  });

  it("rejects an on-demand load that is never used, reads another export, or comes from another module", () => {
    expect(ask('const FilterChassis = onDemand(() => import("../ui/filter-chassis").then((m) => m.FilterChassis));')).toBe(false);
    expect(ask([
      'const FilterChassis = onDemand(() => import("../ui/filter-chassis").then((m) => m.CHASSIS_WIDE_MIN_PX));',
      "export const View = () => <FilterChassis />;",
    ].join("\n"))).toBe(false);
    expect(ask([
      'const FilterChassis = onDemand(() => import("../ui/other-chassis").then((m) => m.FilterChassis));',
      "export const View = () => <FilterChassis />;",
    ].join("\n"))).toBe(false);
  });
});
