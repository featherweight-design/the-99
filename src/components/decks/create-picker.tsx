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
import { unstable_rethrow } from "next/navigation";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { createDeck } from "../../app/decks/actions";
import type { ImportCommanderCandidate } from "../../app/decks/import-actions";
import type { OwnedLegalCommander } from "../../lib/decks/read";
import { colorLabel } from "../../lib/decks/format";
import { canPair, partnerAbility, partnerAbilityLabel } from "../../lib/decks/partner";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { addPanelCopy, shortCommanderName } from "../../lib/copy/decks-builder";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import { PartnerSlot } from "./partner-slot";
import { PrimaryButton } from "@/components/ui/button";
import { SearchField, TextField } from "@/components/ui/text-field";
import { DECK_NAME_MAX } from "../../lib/decks/deck-name";
import { CommanderThumb } from "../ui/commander-thumb";
import { HelpMeChooseDoor } from "../intake/help-me-choose-door";
import { PreconDoor } from "./precons/precon-door";

const copy = deckImportCopy.commander;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CreateModeProps = {
  mode?: "create";
  legalCommanders: OwnedLegalCommander[];
  /**
   * The commander the picker opens with chosen. Null everywhere a player
   * arrives — picking is the act — so this defaults to the empty state.
   *
   * `/about` passes one: its `new-deck` entry is about the whole flow, and the
   * empty state draws `No commander selected` over a disabled button, which is
   * the surface before anything happens rather than the surface the caption
   * describes.
   */
  initialSelectedId?: string | null;
  /** Draw Help me choose's door first in the list column (HANDOFF §1). The page passes the
      feature's flag; every other create-mode caller, `/about`'s figure included, leaves it off. */
  helpDoor?: boolean;
  /** Draw the precon door after Help me choose's (or first without it). The page passes
      `PRECONS_ENABLED`; every other caller leaves it off. */
  preconDoor?: boolean;
};

type ImportModeProps = {
  mode: "import";
  /** Only the legendary creatures the import brought over. Never empty — an empty
   *  list is state 12, a dead end, and is a different surface entirely. */
  candidates: ImportCommanderCandidate[];
  /** Pre-filled from the source, and editable (design table §8, README:224–226). */
  initialName: string;
  onSubmit: (oracleId: string, name: string, partnerOracleId: string | null) => void;
};

export type CreatePickerProps = CreateModeProps | ImportModeProps;

/**
 * What the shared row renders. Both modes normalise into this so there is exactly
 * one row implementation — the meta line is the only thing that differs, and it
 * arrives as finished copy rather than as a flag the row has to interpret.
 */
type PickerRow = {
  oracleId: string;
  /**
   * The ORACLE name, and it stays that on purpose: `canPair` matches a "Partner with"
   * ability against the named card, which is an oracle-level rule. Display reads
   * `printedName` through `commanderDisplayName` instead.
   */
  name: string;
  /** The name on the copy the player owns, where it differs. Absent on the import door,
      whose rows are a decklist's legends and not necessarily owned at all. */
  printedName?: string | null;
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
    printedName: c.printedName,
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
  // Create mode only, and only where the page passed the flag (HANDOFF §7.2): never in import.
  const helpDoor = props.mode !== "import" && props.helpDoor === true;
  const preconDoor = props.mode !== "import" && props.preconDoor === true;
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

  // What the second slot needs from a row, looked up rather than carried on
  // `PickerRow`: the row draws neither the oracle text nor the source line, and
  // the two modes carry them on different types.
  const sourceById = useMemo(() => {
    const source: (ImportCommanderCandidate | OwnedLegalCommander)[] =
      candidates ?? legalCommanders ?? [];
    return new Map(
      source.map((c) => [
        c.oracleId,
        {
          name: c.name,
          oracleText: c.oracleText,
          typeLine: c.typeLine,
          sourceLine: "sourceLine" in c ? c.sourceLine : null,
        },
      ]),
    );
  }, [candidates, legalCommanders]);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    props.mode === "import" ? null : (props.initialSelectedId ?? null),
  );
  const [partnerId, setPartnerId] = useState<string | null>(null);
  /** True while the list is re-headed and filtered to the primary's legal partners. */
  const [pairing, setPairing] = useState(false);
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

  // The commanders that may fill the second slot. Memoised on the id rather than
  // on the resolved ability, which is a fresh object every render and would
  // re-filter the player's whole legal pool on every keystroke.
  const pairable = useMemo(() => {
    const source = selectedId ? sourceById.get(selectedId) : undefined;
    const ability = partnerAbility(source?.oracleText ?? null, source?.typeLine ?? null);
    if (!source || !ability) return [];
    const primary = { name: source.name, ability };
    return rows.filter(
      (r) =>
        r.oracleId !== selectedId &&
        canPair(primary, {
          name: r.name,
          ability: (() => {
            const s = sourceById.get(r.oracleId);
            return partnerAbility(s?.oracleText ?? null, s?.typeLine ?? null);
          })(),
        }),
    );
  }, [rows, selectedId, sourceById]);

  // Client-side substring filter over loaded list. The import picker has no search:
  // it lists the handful of legends one decklist contained.
  const visible = useMemo(() => {
    const base = pairing ? pairable : rows;
    const needle = query.trim().toLowerCase();
    if (isImport || needle.length === 0) return base;
    // Either name: the row draws the printed one, and the oracle name is what a player
    // who knows the card types.
    return base.filter(
      (c) =>
        c.name.toLowerCase().includes(needle)
        || (c.printedName ?? "").toLowerCase().includes(needle),
    );
  }, [isImport, rows, pairable, pairing, query]);

  const selected = rows.find((r) => r.oracleId === selectedId) ?? null;

  // State A is decided here and nowhere else, so the slot and the eyebrows that
  // appear with it can never disagree about whether a pair is possible.
  const primaryAbility = selected
    ? partnerAbility(
        sourceById.get(selected.oracleId)?.oracleText ?? null,
        sourceById.get(selected.oracleId)?.typeLine ?? null,
      )
    : null;

  const partnerRow = partnerId ? (rows.find((r) => r.oracleId === partnerId) ?? null) : null;
  const partnerSourceLine = partnerId ? (sourceById.get(partnerId)?.sourceLine ?? null) : null;
  const partnerCard = partnerRow
    ? {
        // The drawn name, as everywhere the reader is being shown a card they hold.
        name: commanderDisplayName(partnerRow),
        colorIdentity: partnerRow.colorIdentity,
        imageUri: partnerRow.imageUri,
        // In import mode both halves came from the paste, so the caption says so
        // and names the line — auditable against the list rather than merely
        // reversible. In create mode the partner is a pick like any other and
        // reads the same meta line the primary above it does.
        caption:
          partnerSourceLine !== null ? copy.proposed(partnerSourceLine) : partnerRow.metaDesktop,
        // The proposal's own accessible name, which says it is reversible before
        // it says who it is. A create-mode pick is not a proposal, so it is named
        // plainly and the `Change` and `Remove` buttons speak for themselves.
        ariaLabel:
          partnerSourceLine !== null
            ? copy.proposedAria(commanderDisplayName(partnerRow))
            : commanderDisplayName(partnerRow),
      }
    : null;

  // The query belongs to the list, and the list changes out from under it: a
  // search that found the primary matches none of its partners, so leaving it in
  // place re-heads the list to nothing while the strip truthfully counts one.
  function setPairingMode(next: boolean) {
    setQuery("");
    setPairing(next);
  }

  /** One row tap, whichever slot the list is currently filling. */
  function pickRow(oracleId: string) {
    if (pairing) {
      setPartnerId(oracleId);
      setPairingMode(false);
      return;
    }
    // A partner belongs to the commander it was chosen for, so changing or
    // clearing the primary drops it rather than carrying it onto a pair that was
    // never checked.
    setPartnerId(null);
    setSelectedId(selectedId === oracleId ? null : oracleId);
  }

  const canCreate =
    selected !== null && deckName.trim().length > 0 && deckName.trim().length <= DECK_NAME_MAX;

  function handleCreate() {
    // `isPending` only turns true on the re-render that follows `startTransition`,
    // so two clicks in one tick both read false and both reach the server. Neither
    // `createDeck` nor `importDeck` dedupes, so that is two decks. The ref flips
    // synchronously; import mode is guarded again by its own owner.
    if (!selected || inFlight.current) return;
    const trimmed = deckName.trim();
    if (trimmed.length === 0 || trimmed.length > DECK_NAME_MAX) {
      setError(`Name must be 1–${DECK_NAME_MAX} characters.`);
      return;
    }
    setError(null);
    inFlight.current = true;
    if (props.mode === "import") {
      // The import owns its own submission: it still holds the list, and a second
      // pass through `importDeck` is what actually writes the deck. That owner
      // unmounts this picker while it runs, so the flag is never released here.
      props.onSubmit(selected.oracleId, trimmed, partnerId);
      return;
    }
    startTransition(async () => {
      try {
        await createDeck(selected.oracleId, trimmed, [], partnerId);
      } catch (err) {
        // `createDeck` ends in `redirect()`, which signals by throwing, and the
        // throw reaches this catch before the router navigates — so every
        // successful create painted "Failed to create deck" for the frame or
        // two the navigation took.
        unstable_rethrow(err);
        setError(addPanelCopy.createPicker.failed);
        // Released only on failure: success navigates away, and reopening the
        // door mid-navigation is what this guard exists to prevent.
        inFlight.current = false;
      }
    });
  }

  // "Name & create →" used to point at a name field the dock itself carried.
  // The field is in the flow now, so the label is just the action (CV:267).
  const submitLabel = isImport ? copy.submit : isPending ? addPanelCopy.createPicker.submitPending : addPanelCopy.createPicker.submit;

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
              <span className="md:hidden">{addPanelCopy.createPicker.titlePhone}</span>
              <span className="hidden md:inline">{addPanelCopy.createPicker.titleDesktop}</span>
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
              {/* The mobile title above is already "Pick a commander", so the sub
                  carries only the scope the title cannot. */}
              <span className="md:hidden">From your collection.</span>
              <span className="hidden md:inline" style={{ color: "var(--fg-muted)" }}>
                {helpDoor && preconDoor ? addPanelCopy.createPicker.subDoors
                  : helpDoor ? addPanelCopy.createPicker.sub
                  : preconDoor ? addPanelCopy.createPicker.subPrecon
                  : addPanelCopy.createPicker.subAlone}
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
          {helpDoor && <HelpMeChooseDoor />}
          {preconDoor && <PreconDoor />}
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
              placeholder={addPanelCopy.createPicker.searchPlaceholder}
              aria-label="Search commanders"
              trailing={
                /* §Search input — results count (desktop only) */
                <span
                  className="hidden md:block font-mono ml-auto shrink-0"
                  style={{ fontSize: 11, color: "var(--fg-faint)" }}
                >
                  {visible.length} result{visible.length !== 1 ? "s" : ""}
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
              maxLength={DECK_NAME_MAX}
              placeholder={addPanelCopy.createPicker.namePlaceholder}
              disabled={isPending}
              aria-label={isImport ? undefined : "Deck name"}
              // 16px on mobile: anything smaller makes iOS Safari zoom the field.
              className="block w-full p-[11px_13px] text-[16px]"
            />
          </div>
          )}

          {/* The slot on a phone sits in the scrolling flow beside the name
              field — never in the dock, whose own comment says nothing else may
              live there or its height moves under a thumb. */}
          {selected && primaryAbility && (
            <div className="md:hidden mb-[16px]">
              <PartnerSlot
                primaryName={commanderDisplayName(selected)}
                ability={primaryAbility}
                partner={partnerCard}
                pairableCount={pairable.length}
                onAdd={() => setPairingMode(true)}
                onChange={() => setPairingMode(true)}
                onRemove={() => setPartnerId(null)}
              />
            </div>
          )}

          {/* Picking the partner re-heads the list. The strip says which
              commander is being paired — the primary scrolls out of view on a
              phone — and prints the count, so a filter returning 3 of 400 is
              visibly a filter and not a broken list. */}
          {pairing && selected && (
            <div
              className="flex items-center gap-[10px] p-[10px_13px] mb-[10px] md:mb-[11px] rounded-[10px]"
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="font-mono text-[11px] flex-1 min-w-0"
                style={{ color: "var(--fg-body)" }}
              >
                {copy.pairingFor(shortCommanderName(commanderDisplayName(selected)), pairable.length)}
              </span>
              <button
                type="button"
                onClick={() => setPairingMode(false)}
                className="font-mono text-[11px] text-[color:var(--fg-faint)] border-b border-b-[color:var(--border)] border-[color:var(--border)]"
              >
                {copy.pairingCancel}
              </button>
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
          ) : visible.length === 0 ? (
            <p
              className="font-mono text-[12px] text-center py-[40px]"
              style={{ color: "var(--fg-faint)" }}
            >
              {/* `partnerNoneOwned` is a statement about the collection —
                  nobody in it can pair with this commander — so it may only be
                  printed when the list is empty on its own terms. A query that
                  matched nothing is the ordinary empty search, and saying
                  otherwise would tell a player they own no partner when they
                  own one whose name they mistyped. */}
              {pairing && primaryAbility && query.trim() === "" ? (
                copy.partnerNoneOwned(partnerAbilityLabel(primaryAbility))
              ) : (
                <>No commanders match &ldquo;{query}&rdquo;.</>
              )}
            </p>
          ) : (
            <ul className="flex flex-col gap-[10px] md:gap-[11px]">
              {visible.map((c) => {
                const isSelected = pairing
                  ? partnerId === c.oracleId
                  : selectedId === c.oracleId;
                return (
                  <li key={c.oracleId}>
                    <button
                      type="button"
                      onClick={() => pickRow(c.oracleId)}
                      className={[
                        "w-full flex items-center gap-[11px] md:gap-[14px] rounded-[10px] md:rounded-[11px] text-left transition-colors p-[10px_12px] md:p-[12px_15px] min-h-[44px] border border-solid",
                        isSelected
                          ? "bg-[color:var(--elevated-hover)] border-[color:var(--accent)]"
                          : "bg-[color:var(--surface-rail)] border-[color:var(--border)]",
                      ].join(" ")}
                      aria-pressed={isSelected}
                    >
                      {/* §Commander picker row — the app's row thumb, one size at
                          both widths. It drew 34×48 on a phone and 40×56 on a
                          desktop for the same job, which is a viewport choosing
                          a size rather than the thumb's purpose choosing it. */}
                      <CommanderThumb imageUri={c.imageUri} colorIdentity={c.colorIdentity} />

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
                          {commanderDisplayName(c)}
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
              {/* The eyebrows appear with the slot and never before it: a lone
                  `Commander` label over a single pick is a new word on a shipped
                  surface for no gain. In import mode both halves came from the
                  paste, so the primary's says so too. */}
              {primaryAbility && (
                <p
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: "0.12em",
                    color: "var(--fg-faint)",
                    marginBottom: 7,
                  }}
                >
                  {isImport ? copy.primaryLabelFromSource : copy.primaryLabel}
                </p>
              )}
              <div className="flex items-start gap-[12px]">
                {/* §Selected summary — the summary thumb, which is the larger of
                    the two: this stands for a choice already made rather than
                    identifying one row among several. */}
                <CommanderThumb
                  imageUri={selected.imageUri}
                  colorIdentity={selected.colorIdentity}
                  size="summary"
                />
                <div className="min-w-0">
                  {/* §Selected summary — commander name: Cinzel 600 15px var(--fg) */}
                  <p
                    className="font-display font-semibold leading-[1.2]"
                    style={{ fontSize: 15, color: "var(--fg)", margin: 0 }}
                  >
                    {commanderDisplayName(selected)}
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

              {primaryAbility && (
                <PartnerSlot
                  primaryName={commanderDisplayName(selected)}
                  ability={primaryAbility}
                  partner={partnerCard}
                  pairableCount={pairable.length}
                  onAdd={() => setPairingMode(true)}
                  onChange={() => setPairingMode(true)}
                  onRemove={() => setPartnerId(null)}
                />
              )}

              {/* §Selected summary — deck name input. The visible label is the
                  import picker's; the create surface has never drawn one, and
                  adding it here would change /decks/new by accident. */}
              <div style={{ marginTop: 16 }}>
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
                  maxLength={DECK_NAME_MAX}
                  placeholder={addPanelCopy.createPicker.namePlaceholder}
                  disabled={isPending}
                  aria-label={isImport ? undefined : "Deck name"}
                  className="block w-full p-[11px_13px] text-[14px] mb-[16px]"
                />
              </div>
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
            {isImport ? copy.submit : isPending ? addPanelCopy.createPicker.submitPending : addPanelCopy.createPicker.submit}
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
            {/* Unchanged: the dock takes the pair through the same argument it
                takes a single name through, and its identity is the union the
                deck will actually be built against. */}
            {selected
              ? addPanelCopy.createPicker.dockSummary(
                  partnerRow
                    ? `${commanderDisplayName(selected)} + ${commanderDisplayName(partnerRow)}`
                    : commanderDisplayName(selected),
                  colorLabel(
                    partnerRow
                      ? [...new Set([...selected.colorIdentity, ...partnerRow.colorIdentity])]
                      : selected.colorIdentity,
                  ),
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
