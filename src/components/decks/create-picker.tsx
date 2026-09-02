"use client";

// One picker, two sources.
//
//   mode="create" — §Create — Picker (/decks/new). Search over owned+legal
//                   commanders, sticky Selected summary, name field.
//   mode="import" — deck-import states 11. The same row, sidebar and footer,
//                   reading from the imported list instead of the collection.
//
// A second component would be a second thing to keep in sync: the handoff
// specifies the import row as create-picker's row "verbatim" (design table §8).
// Only the source list, the row's meta line, the header and the submit differ,
// so those are the only things the mode switches on — everything below the row
// is shared markup.

import { useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { createDeck } from "../../app/decks/actions";
import type { ImportCommanderCandidate } from "../../app/decks/import-actions";
import type { OwnedLegalCommander } from "../../lib/decks/read";
import { colorLabel } from "../../lib/decks/format";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { PrimaryButton } from "@/components/ui/button";
import { SearchField, TextField } from "@/components/ui/text-field";

const copy = deckImportCopy.commander;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CreateModeProps = {
  mode?: "create";
  legalCommanders: OwnedLegalCommander[];
};

type ImportModeProps = {
  mode: "import";
  /** Only the legendary creatures the import brought over. Never empty — an empty
   *  list is state 12, a dead end, and is a different surface entirely. */
  candidates: ImportCommanderCandidate[];
  /** Pre-filled from the source, and editable (design table §8, README:224–226). */
  initialName: string;
  onSubmit: (oracleId: string, name: string) => void;
};

export type CreatePickerProps = CreateModeProps | ImportModeProps;

/**
 * What the shared row renders. Both modes normalise into this so there is exactly
 * one row implementation — the meta line is the only thing that differs, and it
 * arrives as finished copy rather than as a flag the row has to interpret.
 */
type PickerRow = {
  oracleId: string;
  name: string;
  colorIdentity: string[];
  imageUri: string | null;
  metaMobile: string;
  metaDesktop: string;
};

function importRow(c: ImportCommanderCandidate): PickerRow {
  const identity = colorLabel(c.colorIdentity);
  return {
    oracleId: c.oracleId,
    name: c.name,
    colorIdentity: c.colorIdentity,
    imageUri: c.imageUri,
    metaMobile: copy.rowMetaMobile(identity, c.sourceLine),
    metaDesktop: c.owned
      ? copy.rowMetaOwned(identity, c.sourceLine)
      : copy.rowMetaUnowned(identity, c.sourceLine),
  };
}

function createRow(c: OwnedLegalCommander): PickerRow {
  const meta = `${colorLabel(c.colorIdentity)} · ${c.poolCount} cards`;
  return {
    oracleId: c.oracleId,
    name: c.name,
    colorIdentity: c.colorIdentity,
    imageUri: c.imageUri,
    metaMobile: meta,
    metaDesktop: meta,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreatePicker(props: CreatePickerProps) {
  const isImport = props.mode === "import";
  // Pulled out of `props` so the memo below can depend on the array itself. A
  // dependency on `props` would be a fresh object on every parent render — which
  // in import mode is every keystroke in the owner — and memoise nothing.
  const candidates = props.mode === "import" ? props.candidates : null;
  const legalCommanders = props.mode === "import" ? null : props.legalCommanders;

  // Memoised because create mode maps the player's whole legal-commander pool,
  // and every keystroke in the search or the name field re-renders this component.
  const rows: PickerRow[] = useMemo(
    () => (candidates ? candidates.map(importRow) : (legalCommanders ?? []).map(createRow)),
    [candidates, legalCommanders],
  );

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deckName, setDeckName] = useState(props.mode === "import" ? props.initialName : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inFlight = useRef(false);

  // The dock is `fixed`, so it reserves no space of its own and the last
  // commander row would sit under it. Its height is not a constant — an error
  // line pushes it taller — so the reserve is measured rather than hard-coded.
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  // Layout rather than passive: a passive effect runs after paint, so the
  // measurement below would still leave one frame in which the dock covers the
  // last row.
  useLayoutEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    // Border box, not `contentRect`: the footer's own padding and top border
    // are part of what covers the row beneath it.
    // Measured here as well as observed — the observer's first callback is
    // asynchronous, so on its own it leaves the reserve at nothing on mount.
    setFooterHeight(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(() =>
      setFooterHeight(el.getBoundingClientRect().height),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Client-side substring filter over loaded list. The import picker has no search:
  // it lists the handful of legends one decklist contained.
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (isImport || needle.length === 0) return rows;
    return rows.filter((c) => c.name.toLowerCase().includes(needle));
  }, [isImport, rows, query]);

  const selected = rows.find((r) => r.oracleId === selectedId) ?? null;

  const canCreate =
    selected !== null && deckName.trim().length > 0 && deckName.trim().length <= 120;

  function handleCreate() {
    // `isPending` only turns true on the re-render that follows `startTransition`,
    // so two clicks in one tick both read false and both reach the server. Neither
    // `createDeck` nor `importDeck` dedupes, so that is two decks. The ref flips
    // synchronously; import mode is guarded again by its own owner.
    if (!selected || inFlight.current) return;
    const trimmed = deckName.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      setError("Name must be 1–120 characters.");
      return;
    }
    setError(null);
    inFlight.current = true;
    if (props.mode === "import") {
      // The import owns its own submission: it still holds the list, and a second
      // pass through `importDeck` is what actually writes the deck. That owner
      // unmounts this picker while it runs, so the flag is never released here.
      props.onSubmit(selected.oracleId, trimmed);
      return;
    }
    startTransition(async () => {
      try {
        await createDeck(selected.oracleId, trimmed);
      } catch {
        setError("Failed to create deck. Try again.");
        // Released only on failure: success navigates away, and reopening the
        // door mid-navigation is what this guard exists to prevent.
        inFlight.current = false;
      }
    });
  }

  // "Name & create →" used to point at a name field the dock itself carried.
  // The field is in the flow now, so the label is just the action (CV:267).
  const submitLabel = isImport ? copy.submit : isPending ? "Creating…" : "Create deck →";

  return (
    <section>
      {/* ── Page header ── */}
      <div
        className={
          isImport
            ? "p-[30px_18px_14px] md:p-[32px_40px_24px]"
            : "p-[20px_18px_14px] md:p-[34px_40px_28px]"
        }
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {/* §Page header — "Pick a commander" / "New deck" */}
        <h1
          className="font-display font-bold text-[20px] md:text-[28px] m-0"
          style={{ color: "var(--fg)" }}
        >
          {isImport ? (
            copy.heading
          ) : (
            <>
              <span className="md:hidden">Pick a commander</span>
              <span className="hidden md:inline">New deck</span>
            </>
          )}
        </h1>
        <p
          className="font-mono text-[10px] md:text-[14px] mt-[2px] md:mt-[4px]"
          style={{ color: "var(--fg-faint)" }}
        >
          {isImport ? (
            <>
              <span className="md:hidden">{copy.subMobile}</span>
              <span className="hidden md:inline md:font-sans" style={{ color: "var(--fg-muted)" }}>
                {copy.sub}
              </span>
            </>
          ) : (
            <>
              <span className="md:hidden">Choose a commander you own.</span>
              <span className="hidden md:inline" style={{ color: "var(--fg-muted)" }}>
                Choose a commander from your collection.
              </span>
            </>
          )}
        </p>
      </div>

      {/* ── Body: mobile = single-col + sticky footer, desktop = two-col ── */}
      <div className="md:flex md:items-start md:gap-0">

        {/* ── Left: search + picker list ── */}
        <div
          className={
            (isImport
              ? "flex-1 min-w-0 p-[16px_18px_12px] md:p-[24px_40px]"
              : "flex-1 min-w-0 p-[16px_18px] md:p-[24px_40px_24px_40px]") +
            " pb-[var(--picker-reserve)] md:pb-[24px]"
          }
          // The shell's `main` already reserves the tab bar, so the picker owes
          // only the footer stacked on top of it.
          style={{ "--picker-reserve": `${footerHeight + 12}px` } as CSSProperties}
        >
          {isImport ? (
            /* §Commander picker — intro (mobile) / count (desktop) */
            <>
              <p
                className="md:hidden text-[13px] leading-[1.55] mb-[14px]"
                style={{ color: "var(--fg-body)" }}
              >
                {copy.introMobile(rows.length)}
              </p>
              <p
                className="hidden md:block font-mono text-[11px] mb-[14px]"
                style={{ color: "var(--fg-faint)" }}
              >
                {copy.count(rows.length)}
              </p>
            </>
          ) : (
            /* §Search input: mobile border var(--border-strong) p 9px 12px gap 8; desktop border var(--accent) p 12px 15px gap 10 */
            <SearchField
              containerClassName="md:rounded-[9px] mb-[16px] p-[9px_12px] md:p-[12px_15px] gap-[8px] md:gap-[10px] md:border-[color:var(--accent)]"
              className="text-[14px] md:text-[15px]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commanders…"
              aria-label="Search commanders"
              trailing={
                /* §Search input — results count (desktop only) */
                <span
                  className="hidden md:block font-mono ml-auto shrink-0"
                  style={{ fontSize: 11, color: "var(--fg-faint)" }}
                >
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </span>
              }
            />
          )}

          {/* The name field lives in the scrolling flow on a phone (CV:263).
              The dock carries the summary and the button only, so everything
              else it used to hold comes back up here. Rendered whether or not
              a commander is picked — a field that appears on selection would
              reflow the list under the thumb that just tapped it.

              Above the list, not below it: the list is every legal commander
              the player owns and it scrolls, so a required field after it is
              one the Create button can be blocked on and never found. This is
              also the only order in which the canvas's fold marker below the
              field — "list continues under the dock" — can be true.

              Gated on the pool, not on the filter: a search that matches
              nothing is still a screen you can name a deck on, but a player who
              owns no commanders has nothing to name. */}
          {rows.length > 0 && (
          <div className="md:hidden mb-[16px]">
            {isImport && (
              <label
                htmlFor="picker-deck-name-mobile"
                className="block font-mono"
                style={{ fontSize: 10, color: "var(--fg-faint)", marginBottom: 9 }}
              >
                {copy.nameLabelFromSource}
              </label>
            )}
            <TextField
              id="picker-deck-name-mobile"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              maxLength={120}
              placeholder="Deck name…"
              disabled={isPending}
              aria-label={isImport ? undefined : "Deck name"}
              // 16px on mobile: anything smaller makes iOS Safari zoom the field.
              className="block w-full p-[11px_13px] text-[16px]"
            />
          </div>
          )}

          {/* §Commander picker rows */}
          {rows.length === 0 ? (
            <p
              className="font-mono text-[12px] text-center py-[40px]"
              style={{ color: "var(--fg-faint)" }}
            >
              No owned commanders found. Add cards to your collection first.
            </p>
          ) : filtered.length === 0 ? (
            <p
              className="font-mono text-[12px] text-center py-[40px]"
              style={{ color: "var(--fg-faint)" }}
            >
              No commanders match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul className="flex flex-col gap-[10px] md:gap-[11px]">
              {filtered.map((c) => {
                const isSelected = selectedId === c.oracleId;
                const gradient = commanderGradient(c.colorIdentity);
                return (
                  <li key={c.oracleId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(isSelected ? null : c.oracleId)}
                      className="w-full flex items-center gap-[11px] md:gap-[14px] rounded-[10px] md:rounded-[11px] text-left transition-colors p-[10px_12px] md:p-[12px_15px] min-h-[44px]"
                      style={{
                        background: isSelected ? "var(--elevated-hover)" : "var(--surface-rail)",
                        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      }}
                      aria-pressed={isSelected}
                    >
                      {/* §Commander picker row — art thumb: 34×48px mobile / 40×56px desktop */}
                      <div
                        className="shrink-0 rounded-[6px] w-[34px] h-[48px] md:w-[40px] md:h-[56px]"
                        style={{
                          background: c.imageUri
                            ? `url(${c.imageUri}) center/cover`
                            : gradient,
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
                        }}
                      />

                      {/* Name + pips + meta caption */}
                      <div className="flex-1 min-w-0">
                        {/* §Commander picker row — name: Cinzel 600 14/16px var(--fg), ellipsis */}
                        <p
                          className="font-display font-semibold truncate text-[14px] md:text-[16px]"
                          style={{
                            color: "var(--fg)",
                            lineHeight: 1.3,
                            margin: 0,
                          }}
                        >
                          {c.name}
                        </p>

                        {/* §Commander picker row — pip + caption: mobile gap 5 mt 4 fs 10; desktop gap 6 mt 5 fs 11 */}
                        <div
                          className="flex items-center font-mono gap-[5px] md:gap-[6px] mt-[4px] md:mt-[5px] text-[10px] md:text-[11px]"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {c.colorIdentity.map((color) => (
                            <span
                              key={color}
                              className="rounded-full shrink-0 w-[9px] h-[9px] md:w-[11px] md:h-[11px]"
                              style={{
                                background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
                              }}
                              aria-hidden
                            />
                          ))}
                          {c.metaMobile === c.metaDesktop ? (
                            <span>{c.metaMobile}</span>
                          ) : (
                            <>
                              <span className="md:hidden">{c.metaMobile}</span>
                              <span className="hidden md:inline">{c.metaDesktop}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* §Commander picker row — radio control: mobile 20×20, desktop 22×22 */}
                      <div
                        className="shrink-0 rounded-full w-[20px] h-[20px] md:w-[22px] md:h-[22px]"
                        style={{
                          border: `2px solid ${isSelected ? "var(--accent)" : "var(--border-dashed)"}`,
                          background: isSelected ? "var(--accent)" : "transparent",
                        }}
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* §Commander picker — footnote (desktop only) */}
          {isImport && (
            <p
              className="hidden md:block text-[12.5px] leading-[1.6] mt-[16px]"
              style={{ color: "var(--fg-faint)" }}
            >
              {copy.footnote}
            </p>
          )}
        </div>

        {/* ── Right: Selected summary (desktop sidebar / mobile sticky footer) ── */}

        {/* Desktop sidebar */}
        <div
          className="hidden md:block shrink-0 sticky top-0 rounded-[12px] m-[24px_40px_24px_0]"
          style={{
            width: 300,
            background: "var(--surface-rail)",
            border: "1px solid var(--border)",
            padding: 20,
          }}
        >
          {/* §Selected summary — "Selected" label */}
          <p
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 10, color: "var(--fg-faint)", marginBottom: 14 }}
          >
            {copy.selectedLabel}
          </p>

          {selected ? (
            <>
              <div className="flex items-start gap-[12px] mb-[16px]">
                {/* §Selected summary — card art: 44×62px, br 7px */}
                <div
                  className="shrink-0 rounded-[7px]"
                  style={{
                    width: 44,
                    height: 62,
                    background: selected.imageUri
                      ? `url(${selected.imageUri}) center/cover`
                      : commanderGradient(selected.colorIdentity),
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
                  }}
                />
                <div className="min-w-0">
                  {/* §Selected summary — commander name: Cinzel 600 15px var(--fg) */}
                  <p
                    className="font-display font-semibold leading-[1.2]"
                    style={{ fontSize: 15, color: "var(--fg)", margin: 0 }}
                  >
                    {selected.name}
                  </p>
                  {/* §Selected summary — caption: IBM Plex Mono 11px var(--fg-muted) mt-[3px] */}
                  <p
                    className="font-mono"
                    style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 3, marginBottom: 0 }}
                  >
                    {selected.metaDesktop}
                  </p>
                </div>
              </div>

              {/* §Selected summary — deck name input. The visible label is the
                  import picker's; the create surface has never drawn one, and
                  adding it here would change /decks/new by accident. */}
              {isImport && (
                <label
                  htmlFor="picker-deck-name"
                  className="block font-mono"
                  style={{ fontSize: 10, color: "var(--fg-faint)", marginBottom: 7 }}
                >
                  {copy.nameLabel}
                </label>
              )}
              <TextField
                id="picker-deck-name"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                maxLength={120}
                placeholder="Deck name…"
                disabled={isPending}
                aria-label={isImport ? undefined : "Deck name"}
                className="block w-full p-[11px_13px] text-[14px] mb-[16px]"
              />
            </>
          ) : (
            <p
              className="font-mono text-[12px] mb-[16px]"
              style={{ color: "var(--fg-faint)" }}
            >
              No commander selected.
            </p>
          )}

          {error && (
            <p
              className="font-mono text-[11px] mb-[12px]"
              style={{ color: "var(--danger)" }}
            >
              {error}
            </p>
          )}

          {/* §Submit button: full-width in sidebar */}
          <PrimaryButton
            onClick={handleCreate}
            disabled={!canCreate || isPending}
            className="w-full text-[15px] transition-opacity disabled:opacity-40 py-[13px] px-0 min-h-[44px]"
          >
            {isImport ? copy.submit : isPending ? "Creating…" : "Create deck →"}
          </PrimaryButton>
        </div>

        {/* The route's dock (#177, table §2 B1). It sits one tab-bar height up:
            the tab bar owns the true bottom edge at a higher z-index, so at
            `bottom-0` it draws straight over the button. Summary and button
            only: a pinned bar covers the row it acts on, so the selection is
            restated, and nothing else may live here or the dock's height moves
            under a thumb. */}
        <div
          ref={footerRef}
          data-testid="create-picker-dock"
          className="md:hidden fixed bottom-[var(--tabbar-h)] left-0 right-0 z-20"
          style={{
            padding: "10px 16px 12px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg)",
          }}
        >
          {/* §Dock summary — one line, always drawn (B2/B-N1/B-N2) */}
          <p
            className="font-mono text-[10.5px] truncate mb-[7px]"
            style={{ color: "var(--fg-faint)" }}
          >
            {selected
              ? addPanelCopy.createPicker.dockSummary(
                  selected.name,
                  colorLabel(selected.colorIdentity),
                )
              : addPanelCopy.createPicker.dockSummaryEmpty}
          </p>

          {error && (
            <p
              className="font-mono text-[11px] mb-[7px]"
              style={{ color: "var(--danger)" }}
            >
              {error}
            </p>
          )}

          {/* §Submit button: full-width, 48px (B3) */}
          <PrimaryButton
            onClick={handleCreate}
            disabled={!canCreate || isPending}
            className="w-full text-[15px] transition-opacity disabled:opacity-50 px-0 h-[48px] py-0"
          >
            {submitLabel}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}
