# Reader-facing copy

Strings a reader sees live here, not in components. `pnpm check:copy-drift` holds the design tables to what these modules say.

## Save refusals: say only what you know

The shape is **"We couldn’t <verb> that. <The thing> is unchanged."** (`The deck is unchanged.`, `Your collection is unchanged.`). Whether you may write "unchanged" depends on which path shows the string:

| Path | What it knows | Say |
|---|---|---|
| The server **returned** a refusal that its code guarantees happened before any write (a bad id, a switch off, a transaction that rolled back) | Nothing was written | `We couldn’t move that. The deck or the folder is gone.` / `... is unchanged.` |
| The write **threw** (a `catch`, a rejected promise, an outage) | It may have committed with its response lost | `We couldn’t confirm that saved. Reload to see ...` / `Check your decks before you try again.` |
| One string serves **both** paths | Neither | `That may not have saved. Reload to see ...` |

- A returned `{ ok: false }` is not enough on its own: `commitTopOff` returns one when its receipt read fails after the deck change committed. Read the action and confirm the refusal comes before the write; if any later step can also return it, treat the string as shared.
- Never write "unchanged", "nothing was saved" or "wasn't made" from a `catch`. The deck, the rename, the import and the add all commit before their page refresh runs, so a late failure follows a real write. Copilot found this claim false in five places across three PRs.
- Say where to look. Prefer "Reload" only where a reload shows the answer; on a form that holds the reader's typed text or pasted list, say to open the page in another tab instead.
- A failure that happened before any write was tried (a list that did not load) gets its own string. It is not a failed save.
- Trace the call site before choosing: open the component that shows the string and read whether it is reached from a returned refusal or a `catch`.
- Where the surface has its own retry button, do not add "Try again" to the sentence.
