// What Ask needs from the tool registry, in one module the card search loads with `import()` when it opens: the registry,
// the matcher and the tool cards pull in the Tuning copy, which the startup graph keeps off Home and /decks
// (`scripts/lib/client-graph.test.mts`). Static importers: none; `use-ask.ts` is the only door.

import { askWords, matchTools, startersFor } from "../../lib/discovery/ask";
import { toolCardOf, type ToolCardModel } from "../../lib/discovery/showcase";
import { TOOLS, type Tool, type ToolId } from "../../lib/discovery/tools";

export { askWords, matchTools, startersFor };

/** A tool's answer with nothing read: a route tool lands on its page, a deck tool on the deck list. */
export function offlineModel(id: ToolId): ToolCardModel {
  const t = (TOOLS as readonly Tool[]).find((x) => x.id === id);
  if (!t) throw new Error(`unknown tool ${id}`);
  const m = toolCardOf(t, { isOn: () => true, fits: {}, deckCount: 1, hasSyncBase: true, place: true });
  // A deck tool with no deck read lands on the list of decks: the reader picks one there.
  return m.state.kind === "none" ? { ...m, state: { kind: "page", href: "/decks", label: m.copy.press ?? m.copy.name } } : m;
}
