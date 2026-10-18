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
  // The eval harness's prompt variants, which append to a shipped builder's system and user. A non-callable export
  // (a variant table) is walked as a value: every function in it, its parameters and its return.
  { file: "scripts/eval/variants/tuning.mts", fns: ["TUNING_VARIANTS", "applyVariant", "setStrategyInput"] },
  { file: "scripts/eval/variants/synopsis.mts", fns: ["SYNOPSIS_VARIANTS", "applySynopsisVariant"] },
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
  "scripts/lib/card-labels-build.ts": { builders: ["src/lib/labels/prompt.ts"], note: "sends through the client its caller hands it" },
  "scripts/label-cards-collect.mts": { note: "collects batch results; sends no prompt" },
  "scripts/eval/labels-tiering.mts": { builders: ["src/lib/labels/prompt.ts"] },
  "scripts/eval/measure-pool-list.mts": { note: "counts tokens of the intake list (catalog only)" },
  "scripts/eval/lib/batch.mts": { note: "the eval batch sender: sends what its caller built" },
  "scripts/eval/lib/request.mts": { note: "the eval request shape and reply parse: types only, sends nothing" },
  "scripts/probe-card-labels-waves.mts": { note: "a fake BatchClient for the labels probe: answers locally, sends nothing" },
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
export const IDENTITY =
  /(userid|clerkid|viewerid|ownerid|senderid|friendid|actorid|inviterid|inviteeid|accountid|playerid|email|displayname|publicid|firstname|lastname|fullname|username|friendname)/;

/** Whether a property or parameter name is an identity field. */
const named = (name) => IDENTITY.test(name.toLowerCase().replaceAll("_", ""));

/** Imports a prompt builder may not take directly. */
// A specifier may carry its extension (`../auth.js`, as `.mts` callers write it), so each name allows one.
const IDENTITY_IMPORT = /^@clerk\/|(^|\/)auth(\.[cm]?[jt]sx?)?$|\/social\/|\/admin\/accounts(\.[cm]?[jt]sx?)?$/;

// `buildParams(` is the eval harness's request: a script that builds one sends it through `eval/lib/batch.mts`.
// The sending calls too, not only a client's construction: a module handed a client sends with it.
const SENDS = [
  /\bcallModel\s*(<[^()]*>)?\(/, /new Anthropic\(/, /api\.anthropic\.com\/v1\/messages/, /\bbuildParams\(/,
  /\.messages\.(create|stream|countTokens)\(/, /\.batches\.create\(/,
  // A module typed to take a client sends with whatever name it gives it (`opts.client.create(`): the SDK's own types,
  // and the app's two client types, which a new helper would import rather than respell.
  /Anthropic\["messages"\]/, /from ["']@anthropic-ai\/sdk/, /\b(BatchClient|ModelDeps)\b/,
];

/** Library types whose own members are not data a builder was handed. Utility types (`Pick`, `Omit`, `Partial`,
 *  `Record`) are NOT here: their properties are the app type's, narrowed, and are walked. */
const BUILTIN = new Set([
  "Date", "RegExp", "Map", "Set", "ReadonlyMap", "ReadonlySet", "WeakMap", "WeakSet", "Array", "ReadonlyArray",
  "Promise", "PromiseLike", "Function", "String", "Number", "Boolean", "Symbol", "BigInt", "Error", "Uint8Array",
  "ArrayBuffer", "Iterator", "IterableIterator", "Generator", "AbortSignal", "URL",
]);

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

/**
 * Callers found but not registered, and registered entries naming a builder that is not in BUILDERS.
 * @param {string[]} found
 * @param {Record<string, { builders?: string[], note?: string }>} [callers]
 * @param {{ file: string, fns: string[] }[]} [builders]
 */
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
      const sigs = type.getCallSignatures();
      if (sigs.length === 0) walk(type, `${b.file}#${fn}`, 0, new Set());
      for (const sig of sigs) {
        for (const p of sig.getParameters()) {
          const at = `${b.file}#${fn}(${p.name})`;
          if (named(p.name)) hits.push(at);
          walk(checker.getTypeOfSymbolAtLocation(p, sf), at, 0, new Set());
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
    const sym = type.getSymbol();
    const file = sym?.declarations?.[0]?.getSourceFile().fileName ?? "";
    // A built-in (Date, Map itself) or a third-party type (zod, drizzle): its own members are not data the builder
    // was handed. A utility type is declared in the TypeScript lib too, but narrows an app type, so it is walked.
    if (/[\\/]typescript[\\/]lib[\\/]/.test(file) ? BUILTIN.has(sym?.name ?? "") : /node_modules/.test(file)) return;
    // A function: what it is handed and what it hands back.
    for (const sig of type.getCallSignatures()) {
      for (const p of sig.getParameters()) {
        if (named(p.name)) hits.push(`${path}(${p.name})`);
        const d = p.valueDeclaration ?? p.declarations?.[0];
        if (d) walk(checker.getTypeOfSymbolAtLocation(p, d), `${path}(${p.name})`, depth + 1, seen);
      }
      walk(sig.getReturnType(), `${path}()`, depth + 1, seen);
    }
    for (const info of checker.getIndexInfosOfType(type)) walk(info.type, `${path}[key]`, depth + 1, seen);
    for (const prop of checker.getPropertiesOfType(type)) {
      const at = `${path}.${prop.name}`;
      if (named(prop.name)) hits.push(at);
      // A synthesized property (a finite-key `Record`, a mapped type) has no declaration; its type is read off the symbol.
      const pdecl = prop.valueDeclaration ?? prop.declarations?.[0];
      walk(pdecl ? checker.getTypeOfSymbolAtLocation(prop, pdecl) : checker.getTypeOfSymbol(prop), at, depth + 1, seen);
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
    // Static imports and re-exports, and a literal `import("...")` or `require("...")` anywhere in the module.
    const visit = (node) => {
      let spec = null;
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        spec = node.moduleSpecifier.text;
      } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])
        && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
        spec = node.arguments[0].text;
      }
      if (spec && IDENTITY_IMPORT.test(spec)) out.push(`${b.file} imports ${spec}`);
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
}

