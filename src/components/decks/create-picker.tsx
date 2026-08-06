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

import { useState, useTransition } from "react";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_HEX } from "../../lib/collection/browse";
import { createDeck } from "../../app/decks/actions";
import type { ImportCommanderCandidate } from "../../app/decks/import-actions";
import type { OwnedLegalCommander } from "../../lib/decks/read";
import { colorLabel } from "../../lib/decks/format";
import { deckImportCopy } from "../../lib/copy/deck-import";
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
  const rows: PickerRow[] =
    props.mode === "import"
      ? props.candidates.map(importRow)
      : props.legalCommanders.map(createRow);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deckName, setDeckName] = useState(props.mode === "import" ? props.initialName : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Client-side substring filter over loaded list. The import picker has no search:
  // it lists the handful of legends one decklist contained.
  const filtered =
    isImport || query.trim().length === 0
      ? rows
      : rows.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  const selected = rows.find((r) => r.oracleId === selectedId) ?? null;

  const canCreate =
    selected !== null && deckName.trim().length > 0 && deckName.trim().length <= 120;

  function handleCreate() {
    if (!selected) return;
    const trimmed = deckName.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      setError("Name must be 1–120 characters.");
      return;
    }
    setError(null);
    if (props.mode === "import") {
      // The import owns its own submission: it still holds the list, and a second
      // pass through `importDeck` is what actually writes the deck.
      props.onSubmit(selected.oracleId, trimmed);
      return;
    }
    startTransition(async () => {
      try {
        await createDeck(selected.oracleId, trimmed);
      } catch {
        setError("Failed to create deck. Try again.");
      }
    });
  }

  const submitLabel = isImport
    ? copy.submit
    : isPending
      ? "Creating…"
      : selected
        ? "Name & create →"
        : "Create deck →";

  return (
    <section>
      {/* ── Page header ── */}
      <div
        className={
          isImport
            ? "p-[30px_18px_14px] md:p-[32px_40px_24px]"
            : "p-[20px_18px_14px] md:p-[34px_40px_28px]"
        }
        style={{ borderBottom: "1px solid #2A241D" }}
      >
        {/* §Page header — "Pick a commander" / "New deck" */}
        <h1
          className="font-display font-bold text-[20px] md:text-[28px] m-0"
          style={{ color: "#EDE6D8" }}
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
          style={{ color: "#8E8269" }}
        >
          {isImport ? (
            <>
              <span className="md:hidden">{copy.subMobile}</span>
              <span className="hidden md:inline md:font-sans" style={{ color: "#A89B84" }}>
                {copy.sub}
              </span>
            </>
          ) : (
            <>
              <span className="md:hidden">Choose a commander you own.</span>
              <span className="hidden md:inline" style={{ color: "#A89B84" }}>
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
            isImport
              ? "flex-1 min-w-0 p-[16px_18px_12px] md:p-[24px_40px]"
              : "flex-1 min-w-0 p-[16px_18px] md:p-[24px_40px_24px_40px]"
          }
        >
          {isImport ? (
            /* §Commander picker — intro (mobile) / count (desktop) */
            <>
              <p
                className="md:hidden text-[13px] leading-[1.55] mb-[14px]"
                style={{ color: "#C4B8A2" }}
              >
                {copy.introMobile(rows.length)}
              </p>
              <p
                className="hidden md:block font-mono text-[11px] mb-[14px]"
                style={{ color: "#8E8269" }}
              >
                {copy.count(rows.length)}
              </p>
            </>
          ) : (
            /* §Search input: mobile border #3A3229 p 9px 12px gap 8; desktop border #C9A24B p 12px 15px gap 10 */
            <SearchField
              containerClassName="md:rounded-[9px] mb-[16px] p-[9px_12px] md:p-[12px_15px] gap-[8px] md:gap-[10px] md:border-[color:var(--brass)]"
              className="text-[14px] md:text-[15px]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commanders…"
              aria-label="Search commanders"
              trailing={
                /* §Search input — results count (desktop only) */
                <span
                  className="hidden md:block font-mono ml-auto shrink-0"
                  style={{ fontSize: 11, color: "#8E8269" }}
                >
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </span>
              }
            />
          )}

          {/* §Commander picker rows */}
          {rows.length === 0 ? (
            <p
              className="font-mono text-[12px] text-center py-[40px]"
              style={{ color: "#8E8269" }}
            >
              No owned commanders found. Add cards to your collection first.
            </p>
          ) : filtered.length === 0 ? (
            <p
              className="font-mono text-[12px] text-center py-[40px]"
              style={{ color: "#8E8269" }}
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
                        background: isSelected ? "#211C15" : "#1A160F",
                        border: `1px solid ${isSelected ? "#C9A24B" : "#2A241D"}`,
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
                        {/* §Commander picker row — name: Cinzel 600 14/16px #EDE6D8, ellipsis */}
                        <p
                          className="font-display font-semibold truncate text-[14px] md:text-[16px]"
                          style={{
                            color: "#EDE6D8",
                            lineHeight: 1.3,
                            margin: 0,
                          }}
                        >
                          {c.name}
                        </p>

                        {/* §Commander picker row — pip + caption: mobile gap 5 mt 4 fs 10; desktop gap 6 mt 5 fs 11 */}
                        <div
                          className="flex items-center font-mono gap-[5px] md:gap-[6px] mt-[4px] md:mt-[5px] text-[10px] md:text-[11px]"
                          style={{ color: "#A89B84" }}
                        >
                          {c.colorIdentity.map((color) => (
                            <span
                              key={color}
                              className="rounded-full shrink-0 w-[9px] h-[9px] md:w-[11px] md:h-[11px]"
                              style={{
                                background: WUBRG_HEX[color] ?? "#8E8269",
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
                          border: `2px solid ${isSelected ? "#C9A24B" : "#4A4033"}`,
                          background: isSelected ? "#C9A24B" : "transparent",
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
              style={{ color: "#8E8269" }}
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
            background: "#1A160F",
            border: "1px solid #2A241D",
            padding: 20,
          }}
        >
          {/* §Selected summary — "Selected" label */}
          <p
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 10, color: "#8E8269", marginBottom: 14 }}
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
                  {/* §Selected summary — commander name: Cinzel 600 15px #EDE6D8 */}
                  <p
                    className="font-display font-semibold leading-[1.2]"
                    style={{ fontSize: 15, color: "#EDE6D8", margin: 0 }}
                  >
                    {selected.name}
                  </p>
                  {/* §Selected summary — caption: IBM Plex Mono 11px #A89B84 mt-[3px] */}
                  <p
                    className="font-mono"
                    style={{ fontSize: 11, color: "#A89B84", marginTop: 3, marginBottom: 0 }}
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
                  style={{ fontSize: 10, color: "#8E8269", marginBottom: 7 }}
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
              style={{ color: "#8E8269" }}
            >
              No commander selected.
            </p>
          )}

          {error && (
            <p
              className="font-mono text-[11px] mb-[12px]"
              style={{ color: "#C6533F" }}
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

        {/* Mobile sticky footer */}
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-20"
          style={{
            padding: "14px 16px 20px",
            borderTop: "1px solid #2A241D",
            background: "#1A160F",
          }}
        >
          {selected ? (
            <>
              {/* Selected mini-summary */}
              <div className="flex items-center gap-[10px] mb-[12px]">
                <div
                  className="shrink-0 rounded-[6px]"
                  style={{
                    width: 30,
                    height: 42,
                    background: selected.imageUri
                      ? `url(${selected.imageUri}) center/cover`
                      : commanderGradient(selected.colorIdentity),
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
                  }}
                />
                <div className="min-w-0">
                  <p
                    className="font-display font-semibold truncate"
                    style={{ fontSize: 13, color: "#EDE6D8", margin: 0, lineHeight: 1.2 }}
                  >
                    {selected.name}
                  </p>
                  <p
                    className="font-mono"
                    style={{ fontSize: 10, color: "#A89B84", margin: 0 }}
                  >
                    {selected.metaMobile}
                  </p>
                </div>
              </div>

              {/* Name input */}
              {isImport && (
                <label
                  htmlFor="picker-deck-name-mobile"
                  className="block font-mono"
                  style={{ fontSize: 10, color: "#8E8269", marginBottom: 9 }}
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
                className="block w-full p-[11px_13px] text-[16px] mb-[10px]"
              />
            </>
          ) : (
            <p
              className="font-mono text-[11px] text-center mb-[12px]"
              style={{ color: "#8E8269" }}
            >
              Select a commander above
            </p>
          )}

          {error && (
            <p
              className="font-mono text-[11px] mb-[10px]"
              style={{ color: "#C6533F" }}
            >
              {error}
            </p>
          )}

          {/* §Submit button: full-width */}
          <PrimaryButton
            onClick={handleCreate}
            disabled={!canCreate || isPending}
            className="w-full text-[15px] transition-opacity disabled:opacity-40 py-[13px] px-0 min-h-[44px]"
          >
            {submitLabel}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}
