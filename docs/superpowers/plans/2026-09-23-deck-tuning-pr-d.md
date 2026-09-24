# Deck tuning — PR D — the surfaces (BLOCKED ON DESIGN — placement addendum)

> Part of the deck tuning plan. **Read the index first:** [`2026-09-07-deck-tuning-suggestions.md`](2026-09-07-deck-tuning-suggestions.md) — the Global Constraints, File Structure, PR boundaries and Cost there apply to every task below. Task numbers are shared across all six files.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## What C-fix changed under D (2026-09-23)

The placement addendum's audit (`design/design_handoff_the99_deck_tuning/READINESS-addendum-audit.md`,
findings 3, 4, 6 and 7) landed its engineering half before D. D builds against this contract:

- **Up to five swaps.** `MAX_SUGGESTIONS = 5` (Hugh, 2026-09-23); the panel's copy says "up to five".
- **A fifth citation kind, `mix`:** `draw 4 of 10`, checked against the pack's own cell.
- **`TuningState.retired`**, `{ from, to }` or null. A deck version was committed since the newest ok
  run, which is Design's "retired by a commit" state, so the gate reopens though the list did not
  move. **`TuningItem.applies`**: the deck still holds the cut and not the add. That is the
  `no longer applies` row, and the apply refuses one that does not.
- **`versionMoved` is now `modelVersionMoved`**, named for what moved: the prompt or the profile.
- **Note dates are quoted in the game log's form** (`26 Aug`), in the prompt and the validator
  alike. A note citation names the date, and the rationale carries the quotation.
- **Two more rules**: a rationale may not name a bracket (the app flags one), or promise a result.

**Finding 12 still applies to this file:** r2 removed the consequence and ownership atoms, so the
card test below asserting `card.notOwned`, the `Complete` status test, and `statusPill` as a
dependency are retired when D is built. They are left in the text until then, so this diff stays
about the contract.

---

### Task 2 (continued): the component-only copy keys — PR D

Add the keys only a component draws — `panel` (`heading`, `ready*`, `stop`, `results*`, `again*`, `tally*`, `unchangedCta`, `improved`), `card`, `announce`, `manifestCopy` — transcribed as Task 2 in the PR B1 file describes, through `/copy-review`, and enable the guard-test cases marked PR D.

---

### Task 5 (continued): The intent control — PR D

Interfaces and the action: see Task 5 in the PR C file.

- [ ] **Step 4: Write the failing component test**

```typescript
// src/components/decks/deck-intent.test.tsx
it("offers the ask below the chip when there is no intent", () => {
  render(<DeckIntent deckId="d1" intent={null} seeded={false} axis="mana" count={4} />);
  expect(screen.getByText(deckTuningCopy.intent.ask("Mana", 4))).toBeInTheDocument();
});

it("marks an app-seeded intent as seeded and drops the mark once edited", () => {
  const { rerender } = render(<DeckIntent deckId="d1" intent="go wide" seeded />);
  expect(screen.getByLabelText(deckTuningCopy.intent.seededAria)).toBeInTheDocument();
  rerender(<DeckIntent deckId="d1" intent="go wide" seeded={false} />);
  expect(screen.queryByLabelText(deckTuningCopy.intent.seededAria)).not.toBeInTheDocument();
});

it("keeps the typed intent when the save is refused", async () => {
  render(<DeckIntent deckId="d1" intent={null} seeded={false} action={async () => ({ ok: false, message: "no" })} />);
  await userEvent.click(screen.getByRole("button", { name: deckTuningCopy.intent.askLabel }));
  const field = screen.getByPlaceholderText(deckTuningCopy.intent.placeholder);
  await userEvent.type(field, "go wide");
  await userEvent.click(screen.getByRole("button", { name: deckTuningCopy.intent.save }));
  expect(field).toHaveValue("go wide");
});
```

- [ ] **Step 5: Build the component to satisfy those tests and the S3 table rows**

Four states: no intent (the ask), an intent as a chip, the chip in edit, and a seeded chip. `maxLength={deckTuningCopy.intent.maxLength}` on the field. The component stays mounted through the pending save — a chip that vanishes and returns is the mid-write unmount the global constraints forbid. `Skip` dismisses the ask for the visit without writing anything.

---

### Task 13: The manifest

**Split.** `readTuningEvidence` ships in **PR C**; `ManifestRows` in **PR D**. The `games` and `notes` steps report 0 truthfully on a deck with no games — the manifest discloses what the model was handed, and nothing is what it was handed.

**Files:**
- Create: `src/components/decks/manifest-rows.tsx`
- Modify: `src/app/decks/tuning-actions.ts` (adds `readTuningEvidence`)
- Test: `src/components/decks/manifest-rows.test.tsx`

**Interfaces:**
- Consumes: `manifestCopy` (Task 2).
- Produces:
  ```typescript
  export type ManifestStep = "games" | "notes" | "decklist" | "intent";
  export function readTuningEvidence(deckId: string, step: ManifestStep): Promise<{ ok: true; count: number } | { ok: false }>;
  export function ManifestRows(props: { steps: { step: ManifestStep; count: number | null }[] }): JSX.Element;
  ```

**The rule this task exists to honour:** the manifest ticks on a read genuinely completing, never on a timer. It is the honest disclosure of what the model was handed, and a faked progression is exactly the theatre the design rejects.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/decks/manifest-rows.test.tsx
it("shows a row as pending until its count arrives", () => {
  render(<ManifestRows steps={[{ step: "games", count: null }]} />);
  expect(screen.queryByText(manifestCopy.games.count(5))).not.toBeInTheDocument();
});

it("shows the count once the read has landed", () => {
  render(<ManifestRows steps={[{ step: "games", count: 5 }]} />);
  expect(screen.getByText(manifestCopy.games.count(5))).toBeInTheDocument();
});

it("uses the singular form at one", () => {
  render(<ManifestRows steps={[{ step: "games", count: 1 }]} />);
  expect(screen.getByText(manifestCopy.games.countOne)).toBeInTheDocument();
});

it("reports progress against the real total", () => {
  render(<ManifestRows steps={[{ step: "games", count: 5 }, { step: "notes", count: null }]} />);
  expect(screen.getByText(manifestCopy.progress(1, 2))).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify it fails, then build the component**

Row tap-target floor is **44px mobile, 38px desktop** — the design table's manifest row. Collapsed form uses `manifestCopy.collapsed(parts)`, with callers joining parts with `' · '`.

- [ ] **Step 4: Run the test and commit**

```bash
pnpm test src/components/decks/manifest-rows.test.tsx
git add src/components/decks/manifest-rows.tsx src/components/decks/manifest-rows.test.tsx src/app/decks/tuning-actions.ts
git commit -m "feat(tuning): evidence manifest that ticks on real reads"
```

---

### Task 14: The tuning panel

**PR D — BLOCKED ON DESIGN — placement addendum.** Two things the addendum returns before this task starts: where the panel lives (Task 16), and the panel with **no game gate**. S4 state 1 (*Below threshold*) is retired, and S4 state 2 (*Ready*) was drawn assuming at least `PATTERN_MIN` games — its briefing names "the strongest Fix". A deck with no games, or games with no marks, has no Fix to name, so *Ready* needs a drawing for that case, and the allowance's exhausted state needs one too. Eng does not improvise either.

**Files:**
- Create: `src/components/decks/tuning-panel.tsx`
- Test: `src/components/decks/tuning-panel.test.tsx`

**Interfaces:**
- Consumes: `deckTuningCopy.panel` and `.failure` and `.announce` (Task 2); `TuningState` and `gateReason` (Task 12); `runTuning` / `cancelTuningRun` (Task 11); `ManifestRows` (Task 13).
- Produces: the `TuningPanel` component, mounted wherever the placement addendum says (Task 16).

**Design table rows to satisfy:** S4 states 2 (and the addendum's zero-evidence *Ready*), 3, 4, 5, 6a–6d, the allowance state, **6e (interrupted, undrawn)**, and the `Stop` transition. The action row is a **fixed band across all six states** — 56px desktop, primaries 44px on mobile. Getting that band right is what stops the panel jumping as it changes state.

State 6e has no drawing. Build it from the four drawn failure states' shared structure — tag, body, kept line, note — with `deckTuningCopy.failure.interrupted`'s strings. That is the audit's finding A resolution, and it is eng's to build, not a Design round-trip.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/components/decks/tuning-panel.test.tsx
it("draws state 5 as the table does: the reason, and an enabled Suggest again anyway", async () => {
  // design-tables/deck-tuning.md:737 and :1207 draw the primary enabled.
  const run = vi.fn(async () => ({ ok: true as const }));
  render(<TuningPanel state={unchangedState} run={run} />);
  expect(screen.getByText(/nothing has changed/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: deckTuningCopy.panel.unchangedCta }));
  expect(run).toHaveBeenCalledWith({ anyway: true });
});

it("offers Stop only while a run is pending", () => {
  const { rerender } = render(<TuningPanel state={pendingState} />);
  expect(screen.getByRole("button", { name: deckTuningCopy.panel.stop })).toBeInTheDocument();
  rerender(<TuningPanel state={okState} />);
  expect(screen.queryByRole("button", { name: deckTuningCopy.panel.stop })).not.toBeInTheDocument();
});

it("renders the interrupted failure with its own copy", () => {
  render(<TuningPanel state={interruptedState} />);
  expect(screen.getByText(deckTuningCopy.failure.interrupted.tag)).toBeInTheDocument();
});

it("announces once per settle, not once per intermediate state", async () => {
  render(<TuningPanel state={pendingState} />);
  const live = screen.getByRole("status");
  expect(live).toHaveTextContent(deckTuningCopy.announce.started);
  // advance the manifest through all four steps
  expect(live.textContent?.match(/read/g) ?? []).toHaveLength(0);
});

it("opens at zero games rather than gating", () => {
  // No gate at zero games: the primary is enabled, and the panel says the
  // suggestions will come from the list alone. Copy per the addendum.
  render(<TuningPanel state={{ ...fresh, gameCount: 0 }} />);
  expect(screen.getByRole("button", { name: deckTuningCopy.panel.readyCta })).toBeEnabled();
});
```

- [ ] **Step 2: Run them to verify they fail, then build the panel**

Six states driven off `TuningState` plus `gateReason`. Never render a percentage or a net figure; every count carries its denominator; a disabled primary always shows why beside it.

- [ ] **Step 3: Run the tests and commit**

```bash
pnpm test src/components/decks/tuning-panel.test.tsx
git add src/components/decks/tuning-panel.tsx src/components/decks/tuning-panel.test.tsx
git commit -m "feat(tuning): the tuning panel across all six states"
```

---

### Task 15 (continued): the card — PR D

Interfaces and the actions: Task 15 in the PR C file.

- [ ] **Step 3: Write the failing card tests**

```typescript
it("cites with the denominator intact and never a percentage", () => {
  render(<SuggestionCard item={itemCitingGames} />);
  expect(screen.getByText(/of 5 games/)).toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});

it("quotes a cited note verbatim", () => {
  render(<SuggestionCard item={itemCitingNote} />);
  expect(screen.getByText(/flooded out on turn six/)).toBeInTheDocument();
});

it("states ownership as a fact, not a ranking", () => {
  render(<SuggestionCard item={unownedItem} />);
  expect(screen.getByText(deckTuningCopy.card.notOwned)).toBeInTheDocument();
});

it("formats an unowned card's price through formatCents", () => {
  render(<SuggestionCard item={{ ...unownedItem, priceCents: 120 }} />);
  expect(screen.getByText(/\$1\.20/)).toBeInTheDocument();
});

it("shows the applied verdict with the shipped status wording", () => {
  render(<SuggestionCard item={appliedItem} built={99} ownedCount={99} />);
  expect(screen.getByText(/Complete/)).toBeInTheDocument();
});

it("stays mounted while applying and keeps the card in place", async () => {
  render(<SuggestionCard item={item} action={pendingForever} />);
  await userEvent.click(screen.getByRole("button", { name: deckTuningCopy.card.apply }));
  expect(screen.getByText(deckTuningCopy.card.applying)).toBeInTheDocument();
  expect(screen.getByText(item.addName)).toBeInTheDocument();
});
```

The status test is why `statusPill` is a dependency: the applied verdict tells the player what their deck is now, and it must say it in the words the rest of the app already uses.

- [ ] **Step 4: Build the card, run the tests, commit**

```bash
pnpm test src/components/decks/suggestion-card.test.tsx
git add src/components/decks/suggestion-card.tsx src/components/decks/suggestion-card.test.tsx
git commit -m "feat(tuning): suggestion card with apply, undo, dismiss, and restore"
```

---

### Task 16: Mount it — BLOCKED ON DESIGN, placement addendum

**PR D.** Not started until the placement addendum returns and its readiness audit is approved.

The tuning handoff mounts the panel and the intent control on the **Games** tab. It was drawn before the **Analysis** tab existed (#753), which now reads the same Deck Profile the evidence is built from and is where the synopsis (sub-project 6) is headed. (`SynopsisSlot`, `src/components/decks/analysis-panel.tsx:211`, is being removed by the `analysis-tab` lane, so do not plan against it.) Where the panel belongs — Games, Analysis, or split between them — is a design decision, and this plan does not make it.

What the addendum must return, as named asks:

1. **The tab** the panel and the intent control live on, at both widths.
2. **The zero-evidence *Ready* state** and the retirement of S4 state 1 (Task 14).
3. **The allowance's exhausted state**, drawn once for both model features.
4. **The bracket flag on a suggestion card** — "this swap would take the deck to bracket N" (Hugh, 2026-09-23: shown, flagged), and the case where a swap lowers it.

What eng already knows about any answer, so the addendum need not solve it:

- **Neither tab has an address.** `BuilderTabs` (`src/components/decks/builder-tabs.tsx:89`) is client state, so the mount cannot be a route loader conditional on the tab. The panel reads through `readTuningPanel` (Task 12) on first open, as the Analysis tab's `peekProfile` does, or the page loads it unconditionally; Task 12 step 4 leaves that choice here.
- **`BuilderShell` is not mounted in jsdom** — `src/lib/decks/builder-tab-specs.ts` says it is too heavy, and no `builder-shell.test.tsx` exists. The mount's test is a `builderTabSpecs` case plus a browser probe that presses the tab (a URL sweep cannot reach a surface a press opens), not a render of the shell.
- **`maxDuration`.** Server actions inherit the invoking route's limit, and `runTuning`'s budget is `MODEL_TIMEOUT_MS` (90s) plus the outcome write. Add `export const maxDuration = 120;` to `src/app/decks/[id]/page.tsx`; precedent `src/app/collection/replace/page.tsx:12`.
- **The shell's owner.** `BuilderTabs` and the Analysis tab's frame are a shared surface (playbook); if the answer is the Analysis tab, the orchestrator sequences the edit.

- [ ] **Step 1: Wire the panel where the addendum says, with the test named above**
- [ ] **Step 2: Run the whole gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
```

---

### Task 18: Design review and PR

**Files:** none created. This task is the gate. Steps 1–3 are PR D's; steps 4–5 run for **each** of the four PRs, and every PR also runs the `pr-review` §10b pre-open pass before `gh pr create`.

- [ ] **Step 1: Run the design-review skill's verify pass**

Agent 2 against `docs/superpowers/design-tables/deck-tuning.md` and the four new components plus the three modified ones. Both passes: visual properties, and state reachability across S1–S5 including S4's 6e.

- [ ] **Step 2: Fix every gap, then run Agent 3**

Only previously-flagged items. Zero gaps before the PR opens.

- [ ] **Step 3: Write the gap report**

`docs/superpowers/gap-report-deck-tuning-implementation.md`.

- [ ] **Step 4: Full gate, rebase, push, open the PR**

```bash
pnpm typecheck && pnpm lint && pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git fetch origin && git rebase origin/main
git push -u origin <branch>
```

PR A's body names the new tables and that `ANTHROPIC_API_KEY` must be set in every Vercel project serving the builder before PR C merges. PR C's body names the durability contract, the five failure classes, the `cancelled` status, and the fact that `ANTHROPIC_API_KEY` must be set in every Vercel project serving the builder before this merges.

- [ ] **Step 5: Copilot review rounds**

Per the `pr-review` skill, including its round and time limits. PR C touches a destructive path (apply and undo mutate the deck), so its merge bar is clean-after-clean on that path.

- [ ] **Step 6: Close out**

Keep `design/design_handoff_the99_deck_tuning/` and the placement addendum — handoffs are kept after a build. The property table and the gap reports stay. Update `docs/superpowers/design-pipeline-status.md` through whoever owns it at the time (the orchestrator sequences that file). Run `feature-acceptance` on PR D and again at the line's close.

---
