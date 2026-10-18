// No model prompt carries who the player is. The privacy page says Anthropic receives no account id, email or name
// (launch epic B1), and this check holds that claim to the code rather than to a grep someone ran once.
//
// What a prompt can say is bounded by what its builder is handed. So for every registered prompt builder this walks
// the TYPES of its parameters with the type checker, through objects, arrays, maps, unions and index signatures, and
// fails on any property whose name is an identity field: a Clerk or user id, an email, a display, first, last or full
// name, a username, a public id, or a friend's name snapshot. It also fails a builder module that imports from an
// identity source directly (Clerk, the auth helpers, `src/lib/social/`, the admin account readers).
//
// Coverage is by registry, and the registry is checked: every file that calls `callModel(` or reaches Anthropic's
// API itself (`new Anthropic(`, a fetch of `api.anthropic.com/v1/messages`) must be listed in CALLERS, so a new
// prompt path fails here until someone registers its builders and the walk covers them.
//
// What it cannot see: a value typed as a plain `string` that happens to hold an email. A deck's intent or a note is
// the player's own words, typed on purpose, and goes through `playerText`; that is not an identity FIELD and is not in
// scope here.
import { readdir, readFile } from "node:fs/promises";
import { join, sep } from "node:path";
import ts from "typescript";

/** Each builder: the module and the exported functions whose output becomes a prompt. */
export const BUILDERS = [
  { file: "src/lib/tuning/prompt.ts", fns: ["buildPrompt"] },
  { file: "src/lib/tuning/cuts-prompt.ts", fns: ["buildCutsPrompt"] },
  { file: "src/lib/swaps/fits-read.ts", fns: ["buildFitsReadPrompt"] },
  { file: "src/lib/intake/the-read.ts", fns: ["shortlistRequest", "judgeRequest"] },
  { file: "src/lib/intake/the-read-run.ts", fns: ["shortlistPrefix"] },
  { file: "src/lib/synopsis/prompt.ts", fns: ["buildSynopsisPrompt"] },
  { file: "src/lib/synopsis/generate.ts", fns: ["repairPrompt"] },
  { file: "src/lib/labels/prompt.ts", fns: ["buildRequest"] },
  { file: "src/lib/prose/prompt.ts", fns: ["buildProsePrompt", "buildProseRetryPrompt"] },
];

/**
 * Every file that sends a model request, with what builds its prompt. `builders` names entries of BUILDERS (by
 * file); `note` says why a caller adds nothing of its own, for the scripts that wrap shipped builders or send a
 * fixed text.
 */
export const CALLERS = {
  "src/lib/model/client.ts": { note: "the one client: sends what its caller built" },
  "src/app/decks/tuning-actions.ts": { builders: ["src/lib/tuning/prompt.ts"] },
  "src/app/decks/cuts-actions.ts": { builders: ["src/lib/tuning/cuts-prompt.ts"] },
  "src/lib/swaps/fits-read-run.ts": { builders: ["src/lib/swaps/fits-read.ts"] },
  "src/lib/intake/the-read-run.ts": { builders: ["src/lib/intake/the-read.ts", "src/lib/intake/the-read-run.ts"] },
  "src/lib/synopsis/generate.ts": { builders: ["src/lib/synopsis/prompt.ts", "src/lib/synopsis/generate.ts"] },
  "scripts/generate-commander-prose.ts": { builders: ["src/lib/prose/prompt.ts"] },
  "scripts/build-card-labels.ts": { builders: ["src/lib/labels/prompt.ts"] },
  "scripts/label-cards-run.mts": { builders: ["src/lib/labels/prompt.ts"] },
  "scripts/label-cards-collect.mts": { note: "collects batch results; sends no prompt" },
  "scripts/eval/labels-tiering.mts": { builders: ["src/lib/labels/prompt.ts"] },
  "scripts/eval/measure-pool-list.mts": { note: "counts tokens of the intake list (catalog only)" },
  "scripts/eval/lib/batch.mts": { note: "the eval batch sender: sends what its caller built" },
  "scripts/eval/corpus.mts": { builders: ["src/lib/synopsis/prompt.ts", "src/lib/tuning/prompt.ts"] },
  "scripts/eval/tuning.mts": { builders: ["src/lib/tuning/prompt.ts"] },
  "scripts/eval/tuning-lists.mts": { builders: ["src/lib/tuning/prompt.ts"] },
  "scripts/eval/tuning-model-arms.mts": { builders: ["src/lib/tuning/prompt.ts"] },
  "scripts/eval/tuning-blind-judge.mts": { builders: ["src/lib/tuning/prompt.ts"], note: "adds the two candidate lists: card names" },
  "scripts/eval/cuts-model.mts": { builders: ["src/lib/tuning/cuts-prompt.ts"] },
  "scripts/eval/cuts-plan.mts": { builders: ["src/lib/tuning/cuts-prompt.ts"], note: "the deck's name stays in its local output" },
  "scripts/eval/repair.mts": { builders: ["src/lib/synopsis/prompt.ts"] },
  "scripts/eval/smoke-v2.mts": { builders: ["src/lib/synopsis/prompt.ts"] },
  "scripts/eval/intake-read.mts": { builders: ["src/lib/intake/the-read.ts"] },
  "scripts/eval/synopsis.mts": { builders: ["src/lib/synopsis/prompt.ts"] },
  "scripts/eval/cuts-blind.mts": { builders: ["src/lib/tuning/cuts-prompt.ts"] },
  "scripts/eval/fits-read.mts": { builders: ["src/lib/swaps/fits-read.ts"] },
  "scripts/probe-tuning-owned.mts": { builders: ["src/lib/tuning/prompt.ts"] },
  "scripts/check-tuning.ts": { builders: ["src/lib/tuning/prompt.ts"] },
};

/** An identity field, matched on the property name lowercased with `_` removed. */
export const IDENTITY = /(userid|clerkid|email|displayname|publicid|firstname|lastname|fullname|username|friendname)/;

/** Imports a prompt builder may not take directly. */
const IDENTITY_IMPORT = /^@clerk\/|(^|\/)auth$|\/social\/|\/admin\/accounts$/;

// `buildParams(` is the eval harness's request: a script that builds one sends it through `eval/lib/batch.mts`.
const SENDS = [/\bcallModel\(/, /new Anthropic\(/, /api\.anthropic\.com\/v1\/messages/, /\bbuildParams\(/];

async function walkFiles(root, dir, out) {
  for (const e of await readdir(join(root, dir), { withFileTypes: true })) {
    const rel = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      await walkFiles(root, rel, out);
    } else if (/\.(ts|tsx|mts|mjs)$/.test(e.name) && !/\.test\.(ts|tsx|mts|mjs)$/.test(e.name)) {
      out.push(rel.split(sep).join("/"));
    }
  }
  return out;
}

/** Files under `src/` and `scripts/` that send a model request, by the text that does it. */
export async function findCallers(root) {
  const files = [...(await walkFiles(root, "src", [])), ...(await walkFiles(root, "scripts", []))];
  const found = [];
  for (const f of files) {
    if (f === "scripts/lib/prompt-identity.mjs") continue;
    const text = await readFile(join(root, f), "utf8");
    if (SENDS.some((re) => re.test(text))) found.push(f);
  }
  return found.sort();
}

/** Callers found but not registered, and registered entries naming a builder that is not in BUILDERS. */
export function registryGaps(found, callers = CALLERS, builders = BUILDERS) {
  const known = new Set(builders.map((b) => b.file));
  return {
    unregistered: found.filter((f) => !(f in callers)),
    unknownBuilders: Object.entries(callers).flatMap(([f, c]) => (c.builders ?? []).filter((b) => !known.has(b)).map((b) => `${f} -> ${b}`)),
  };
}

function program(root, files) {
  const config = ts.getParsedCommandLineOfConfigFile(join(root, "tsconfig.json"), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: () => {},
  });
  return ts.createProgram(files.map((f) => join(root, f)), { ...(config?.options ?? {}), noEmit: true });
}

/** The identity fields reachable from a builder's parameters, as `fn(param).path.to.field`. */
export function identityPaths(root, builders = BUILDERS) {
  const prog = program(root, builders.map((b) => b.file));
  const checker = prog.getTypeChecker();
  const hits = [];
  const missing = [];

  for (const b of builders) {
    const sf = prog.getSourceFile(join(root, b.file));
    if (!sf) {
      missing.push(b.file);
      continue;
    }
    const exports = new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(sf)).map((s) => [s.name, s]));
    for (const fn of b.fns) {
      const sym = exports.get(fn);
      if (!sym) {
        missing.push(`${b.file}#${fn}`);
        continue;
      }
      const type = checker.getTypeOfSymbolAtLocation(sym, sf);
      for (const sig of type.getCallSignatures()) {
        for (const p of sig.getParameters()) {
          const seen = new Set();
          walk(checker.getTypeOfSymbolAtLocation(p, sf), `${b.file}#${fn}(${p.name})`, 0, seen);
        }
      }
    }
  }

  function walk(type, path, depth, seen) {
    if (depth > 14 || seen.has(type)) return;
    seen.add(type);
    if (type.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void | ts.TypeFlags.Never | ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.ESSymbolLike)) return;
    if (type.isUnionOrIntersection()) {
      for (const t of type.types) walk(t, path, depth + 1, seen);
      return;
    }
    // Arrays, tuples, Map, Set, Promise: their element types.
    const args = type.flags & ts.TypeFlags.Object && type.objectFlags & ts.ObjectFlags.Reference ? checker.getTypeArguments(type) : [];
    for (const a of args) walk(a, `${path}[]`, depth + 1, seen);
    const decl = type.getSymbol()?.declarations?.[0];
    // A library type (Date, RegExp, Map itself): its own members are not data the builder was handed.
    if (decl && /node_modules|typescript\/lib/.test(decl.getSourceFile().fileName)) return;
    if (type.getCallSignatures().length > 0 && checker.getPropertiesOfType(type).length === 0) return;
    for (const info of checker.getIndexInfosOfType(type)) walk(info.type, `${path}[key]`, depth + 1, seen);
    for (const prop of checker.getPropertiesOfType(type)) {
      const at = `${path}.${prop.name}`;
      if (IDENTITY.test(prop.name.toLowerCase().replaceAll("_", ""))) hits.push(at);
      const pdecl = prop.valueDeclaration ?? prop.declarations?.[0];
      if (!pdecl) continue;
      walk(checker.getTypeOfSymbolAtLocation(prop, pdecl), at, depth + 1, seen);
    }
  }

  return { hits: [...new Set(hits)].sort(), missing };
}

/** A builder module's direct imports from an identity source. */
export async function identityImports(root, builders = BUILDERS) {
  const out = [];
  for (const b of builders) {
    const text = await readFile(join(root, b.file), "utf8");
    const sf = ts.createSourceFile(b.file, text, ts.ScriptTarget.Latest, true);
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) && !ts.isExportDeclaration(st)) continue;
      const spec = st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) ? st.moduleSpecifier.text : null;
      if (spec && IDENTITY_IMPORT.test(spec)) out.push(`${b.file} imports ${spec}`);
    }
  }
  return out;
}

