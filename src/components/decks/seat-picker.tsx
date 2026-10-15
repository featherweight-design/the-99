"use client";
// SeatPicker: fills one seat of the game log's "Across the table" row (Social R3 plan, PR 2). One field and no
// mode switch: the player types a commander and presses it, and it is seated at once. An anchored panel under
// the seat at 1300 and a sheet at 390, one body for both. The friends list, a friend's decks and the pod
// chips arrive with PR 3, which adds to this field rather than replacing it.
//
// The search is `searchOpponentCommandersAction`: the whole catalog, commander-legal, no owned filter. A reply
// that arrives after a newer keystroke is dropped, so a slow answer for "yu" never lands over "yuriko".

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { searchOpponentCommandersAction } from "../../app/decks/[id]/opponent-actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { gameSeatsCopy } from "../../lib/copy/game-seats";
import type { OpponentCommanderHit } from "../../lib/decks/opponent-commanders";
import { IdentityPips } from "../commanders/commander-art";
import { ANCHORED_PANEL_CLASS, useAnchoredPanel } from "../ui/anchored-panel";
import { Sheet, SheetHeader } from "../ui/sheet";
import { SearchField } from "../ui/text-field";
import { useIsDesktop } from "../ui/use-is-desktop";

const PANEL_WIDTH = 340;
const KEYSTROKE_MS = 180;
const copy = gameSeatsCopy.picker;

type Search = { state: "idle" } | { state: "busy" } | { state: "done"; hits: OpponentCommanderHit[] };

function Body({
  onPick,
  inputRef,
  describedBy,
}: {
  onPick: (hit: OpponentCommanderHit) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  describedBy: string;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const asked = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const ticket = ++asked.current;
    if (q.length < 2) {
      // Under two letters nothing is asked, and an answer still in flight for the previous query is dropped.
      return;
    }
    const timer = window.setTimeout(() => {
      setSearch({ state: "busy" });
      searchOpponentCommandersAction(q)
        .then((hits) => { if (asked.current === ticket) setSearch({ state: "done", hits }); })
        .catch(() => { if (asked.current === ticket) setSearch({ state: "done", hits: [] }); });
    }, KEYSTROKE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const short = query.trim().length < 2;
  return (
    <div className="flex min-h-0 flex-col">
      <div className="px-[12px] pt-[12px] md:pt-[10px]">
        <SearchField
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          aria-describedby={describedBy}
          autoComplete="off"
          // 16px on the phone, or iOS zooms the page when the field takes focus.
          className="h-[44px] md:h-[38px] text-[16px] md:text-[13.5px]"
        />
      </div>
      <ul className="m-0 mt-[8px] min-h-0 list-none overflow-y-auto p-0 pb-[6px]">
        {!short && search.state === "done" && search.hits.length === 0 && (
          <li className="px-[14px] py-[10px] text-[13px] text-[color:var(--fg-muted)]">{copy.noMatch}</li>
        )}
        {!short && search.state === "busy" && (
          <li className="px-[14px] py-[10px] font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.searching}</li>
        )}
        {!short && search.state === "done" && search.hits.map((hit) => (
          <li key={hit.oracleId}>
            <button
              type="button"
              onClick={() => onPick(hit)}
              className="flex min-h-[52px] w-full cursor-pointer items-center gap-[12px] border-0 bg-transparent px-[14px] py-[6px] text-left hover:bg-[color:var(--surface-raised)]"
            >
              <span
                aria-hidden
                className="block h-[40px] w-[56px] shrink-0 rounded-[6px] bg-[color:var(--elevated)] bg-cover"
                style={hit.imageUri ? { backgroundImage: `url("${hit.imageUri}")`, backgroundPosition: "50% 20%" } : undefined}
              />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[color:var(--fg)]">{hit.name}</span>
              <IdentityPips colorIdentity={hit.colorIdentity} size={9} />
            </button>
          </li>
        ))}
      </ul>
      <p id={describedBy} className="m-0 border-0 border-t border-solid border-t-[color:var(--border)] px-[14px] py-[9px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
        {copy.footAnyone}
      </p>
    </div>
  );
}

/** Open from the seat that asked (`anchor`), at either width. `onPick` seats the commander and closes it. */
export function SeatPicker({
  anchor,
  onClose,
  onPick,
}: {
  /** The control that opened it: where the panel hangs at 1300, and where focus returns. */
  anchor: HTMLElement;
  onClose: () => void;
  onPick: (hit: OpponentCommanderHit) => void;
}) {
  const desktop = useIsDesktop();
  const footId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLElement>(anchor);
  const { at, panelRef: placedRef, triggerRef } = useAnchoredPanel<HTMLElement>({ open: desktop, width: PANEL_WIDTH });
  useEffect(() => { triggerRef.current = anchor; anchorRef.current = anchor; }, [anchor, triggerRef]);
  // The sheet holds the page; the panel does not (it hangs off a control on a page the reader can still see).
  useDialogA11y(desktop ? placedRef : panelRef, onClose, { initialFocusRef: inputRef, returnFocusRef: anchorRef, lockScroll: !desktop });

  // A press outside the panel and its anchor closes it, as a menu does. The sheet has its scrim.
  useEffect(() => {
    if (!desktop) return;
    const away = (e: MouseEvent) => {
      const node = e.target as Node;
      if (placedRef.current?.contains(node) || anchor.contains(node)) return;
      onClose();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [desktop, anchor, onClose, placedRef]);

  if (!desktop) {
    return (
      <Sheet open portal onDismiss={onClose} ariaLabel={copy.title} panelRef={panelRef} header={<SheetHeader title={copy.title} closeLabel={copy.close} onDismiss={onClose} />}>
        <Body onPick={onPick} inputRef={inputRef} describedBy={footId} />
      </Sheet>
    );
  }
  return (
    <div
      ref={placedRef}
      role="dialog"
      aria-label={copy.title}
      className={`${ANCHORED_PANEL_CLASS} fixed`}
      style={{ width: PANEL_WIDTH, top: at?.top ?? 0, left: at?.left ?? 0, visibility: at ? "visible" : "hidden" }}
    >
      <Body onPick={onPick} inputRef={inputRef} describedBy={footId} />
    </div>
  );
}
