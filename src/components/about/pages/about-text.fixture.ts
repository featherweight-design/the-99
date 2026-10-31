// The proof that About's words render the same (Small items 7, item 6, F1): every section's sub line, every label's and
// rule's text, under three readers' switches, rendered by `render` to static markup.
// `about-text.snapshot.json` holds what the shipped renderer (the bare string) drew before labels and the sub line
// learned a second bold phrase; `about-text.test.tsx` renders the same set through `AboutText` and compares.
import { SWITCH_NAMES } from "../../../lib/switches/registry";
import { visibleSections } from "../../../lib/about/pages-visible";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

/** Off, the cart alone, and every switch on. */
export const PROOF_ENVS: Record<string, NodeJS.ProcessEnv> = {
  off: env({}),
  cart: env({ ALL_DECKS_CART_ENABLED: "true" }),
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
