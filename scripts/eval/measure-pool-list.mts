/**
 * Measures the read's commander list (rework plan PR 1): its rows, its characters, and its tokens on each model the
 * read may run, through the free count_tokens endpoint, against staging read-only. Variants show what each field costs.
 */
import "../lib/env.mjs";
const { connectStaging } = await import("./lib/staging.mjs");
await connectStaging();
const { loadPoolListRows, formatPoolList, colorsKey, creatureTypes, leadingThemes } = await import("../../src/lib/intake/pool-list");
const rows = await loadPoolListRows();
const list = formatPoolList(rows, "x");
console.log(`rows ${rows.length}, chars ${list.text.length}`);
const Anthropic = (await import("@anthropic-ai/sdk")).default;
const a = new Anthropic({ baseURL: "https://api.anthropic.com" });
const sorted = [...rows].sort((x, y) => x.name.localeCompare(y.name, "en"));
const variants: Record<string, string> = {
  shipped: list.text,
  "name only": sorted.map((r, i) => `${i + 1}|${r.name}`).join("\n"),
  "no colors": sorted.map((r, i) => [i + 1, r.name, creatureTypes(r.typeLine).join(" "), leadingThemes(r.tags).join(", ")].join("|")).join("\n"),
  "two themes": sorted.map((r, i) => [i + 1, r.name, colorsKey(r.colorIdentity), creatureTypes(r.typeLine).join(" "), leadingThemes(r.tags, 2).join(", ")].join("|")).join("\n"),
};
for (const model of ["claude-sonnet-5-5", "claude-haiku-5-5"]) {
  for (const [name, text] of Object.entries(variants)) {
    const r = await a.messages.countTokens({ model, system: text, messages: [{ role: "user", content: "x" }] } as never);
    console.log(`${model} ${name}: ${r.input_tokens}`);
  }
}
process.exit(0);
