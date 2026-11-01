// The proof that About's words render the same (Small items 7, item 6, F1): every section's sub line, every label's and
// rule's text, under two readers' switches, rendered by `render` to static markup.
// `about-text.snapshot.json` holds what the shipped renderer (the bare string) drew before labels and the sub line
// learned a second bold phrase; `about-text.test.tsx` renders the same set through `AboutText` and compares.
import { SWITCH_NAMES } from "../../../lib/switches/registry";
import { visibleSections } from "../../../lib/about/pages-visible";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

/**
 * Every live switch off (named `cart` for the reader it once was), and every switch on. Shopping for all decks is retired
 * (always on), so `cart` is every live switch off; the reader with the cart off, the snapshot's old `off`, no longer
 * exists and its entries were dropped. The swap tools are retired too (always on), so `cart` draws Shopping's limit and
 * stand-ins labels and the sub line's stand-ins sentence.
 */
export const PROOF_ENVS: Record<string, NodeJS.ProcessEnv> = {
  cart: env({}),
  on: env(Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"]))),
};

/** `<env>|<kind>:<key>` to the markup `render` draws for that text. */
export function aboutTextSnapshot(render: (text: string) => string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, e] of Object.entries(PROOF_ENVS)) {
    const visible = visibleSections(e);
    for (const s of visible) {
      out[`${name}|sub:${s.area}/${s.id}`] = render(s.sub);
      for (const u of [...s.labels, ...s.rules]) out[`${name}|unit:${u.key}`] = `${u.lead ?? ""}|${render(u.text)}`;
    }
  }
  return out;
}
