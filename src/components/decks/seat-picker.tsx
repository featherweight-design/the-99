"use client";
// SeatPicker: fills one seat of the game log's "Across the table" row (Social R3 plan, PR 2 and 3). One field and
// no mode switch: before typing it lists the reader's friends (face, name, deck count), and typing filters them
// and adds a Commanders list under. A commander is seated at once. A friend opens their decks in place (read when
// that friend is picked, G7), then Another commander and Just <name>. An anchored panel under the seat at 1300
// and a sheet at 390, one body for both. The friends are read when the picker OPENS, so a form nobody opens the
// picker from reads nothing social.
//
// The search is `searchOpponentCommandersAction`: the whole catalog, commander-legal, no owned filter. A reply
// that arrives after a newer keystroke is dropped, so a slow answer for "yu" never lands over "yuriko".

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { listFriendDecksAction, listPickerFriendsAction, searchOpponentCommandersAction } from "../../app/decks/[id]/opponent-actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { gameSeatsCopy } from "../../lib/copy/game-seats";
import { shortName, type SeatFriend, type SeatPick } from "../../lib/decks/game-seats";
import type { OpponentCommanderHit } from "../../lib/decks/opponent-commanders";
import type { FriendDeck, PickerFriend } from "../../lib/social/games";
import { IdentityPips } from "../commanders/commander-art";
import { Face } from "../social/face";
import { ANCHORED_PANEL_CLASS, useAnchoredPanel } from "../ui/anchored-panel";
import { ArtLayer } from "../ui/art-layer";
import { Sheet, SheetHeader } from "../ui/sheet";
import { SearchField } from "../ui/text-field";
import { useIsDesktop } from "../ui/use-is-desktop";

const PANEL_WIDTH = 340;
const KEYSTROKE_MS = 180;
const copy = gameSeatsCopy.picker;

type Load<T> = { state: "busy" } | { state: "failed" } | { state: "done"; items: T[] };
type Search = { state: "idle" } | Load<OpponentCommanderHit>;
type View = { step: "list" } | { step: "decks" | "commander"; friend: PickerFriend };

const ROW = "flex min-h-[52px] w-full cursor-pointer items-center gap-[12px] border-0 bg-transparent px-[14px] py-[6px] text-left hover:bg-[color:var(--surface-raised)]";
const NOTE = "px-[14px] py-[10px] text-[13px] text-[color:var(--fg-muted)]";
const HEADING = "m-0 px-[14px] pb-[4px] pt-[10px] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]";
// The ONE scroll body under a view's fixed head (its search field, or the friend's header): the results AND the
// foot, because at 1300 the panel is held to the room beside its seat (`useAnchoredPanel`'s `maxHeight`), and a
// foot fixed under the list took that room from the rows and was itself clipped on a short window. A 4px gutter
// top and bottom, the bottom margin taken back, so the 2px focus ring at its 2px offset is never cut where a row
// meets this scroller's edge (globals.css's `:focus-visible`). No side gutter: the rows run to the panel's own
// clipped edge, so one would only push the scrollbar outside the panel. The top is a margin, not a negative one,
// so the body never overlaps the field above it and takes its presses. In the phone sheet nothing caps it.
const SCROLL_BODY = "-mb-[4px] mt-[4px] min-h-0 overflow-y-auto py-[4px]";

/** The catalog search for one query: nothing under two letters, and a reply for an older keystroke is dropped. */
function useCommanderSearch(query: string) {
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const asked = useRef(0);
  useEffect(() => {
    const q = query.trim();
    const ticket = ++asked.current;
    if (q.length < 2) return;
    const timer = window.setTimeout(() => {
      setSearch({ state: "busy" });
      searchOpponentCommandersAction(q)
        .then((items) => { if (asked.current === ticket) setSearch({ state: "done", items }); })
        .catch(() => { if (asked.current === ticket) setSearch({ state: "failed" }); });
    }, KEYSTROKE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);
  // A new query drops the old answer at once and invalidates any still in flight: until the debounce fires,
  // the previous query's hits would stay on screen, selectable, under a field that no longer names them.
  const reset = () => { asked.current += 1; setSearch({ state: "idle" }); };
  return { search, reset };
}

function CommanderRows({ query, search, onPick }: { query: string; search: Search; onPick: (hit: OpponentCommanderHit) => void }) {
  if (query.trim().length < 2) return null;
  if (search.state === "failed") return <li role="alert" className={NOTE}>{copy.failed}</li>;
  if (search.state === "busy") return <li className="px-[14px] py-[10px] font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.searching}</li>;
  if (search.state !== "done") return null;
  if (search.items.length === 0) return <li className={NOTE}>{copy.noMatch}</li>;
  return search.items.map((hit) => (
    <li key={hit.oracleId}>
      <button type="button" onClick={() => onPick(hit)} className={ROW}>
        <span aria-hidden className="relative block h-[40px] w-[56px] shrink-0 overflow-hidden rounded-[6px] bg-[color:var(--elevated)]">
          {hit.imageUri && <ArtLayer src={hit.imageUri} style={{ backgroundPosition: "50% 20%" }} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[color:var(--fg)]">{hit.name}</span>
        <IdentityPips colorIdentity={hit.colorIdentity} size={9} />
      </button>
    </li>
  ));
}

const asCommander = (hit: OpponentCommanderHit) => ({ oracleId: hit.oracleId, name: hit.name, imageUri: hit.imageUri });
const asFriend = (f: PickerFriend): SeatFriend => ({ publicId: f.publicId, name: f.displayName });

function Field({ inputRef, value, onChange, placeholder, describedBy }: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  describedBy: string;
}) {
  return (
    <div className="shrink-0 px-[12px] pt-[12px] md:pt-[10px]">
      <SearchField
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClear={() => onChange("")}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-describedby={describedBy}
        autoComplete="off"
        // 16px on the phone, or iOS zooms the page when the field takes focus.
        className="h-[44px] md:h-[38px] text-[16px] [@media(pointer:fine)]:md:text-[13.5px]"
      />
    </div>
  );
}

function Foot({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="m-0 border-0 border-t border-solid border-t-[color:var(--border)] px-[14px] py-[9px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
      {children}
    </p>
  );
}

/** A friend's decks, read when the friend is picked, then Another commander and Just <name>. */
function Decks({ friend, onPick, onCommander, onBack, describedBy }: {
  friend: PickerFriend;
  onPick: (pick: SeatPick) => void;
  onCommander: () => void;
  onBack: () => void;
  describedBy: string;
}) {
  const [decks, setDecks] = useState<Load<FriendDeck>>({ state: "busy" });
  useEffect(() => {
    let live = true;
    listFriendDecksAction(friend.publicId)
      .then((items) => { if (live) setDecks({ state: "done", items }); })
      .catch(() => { if (live) setDecks({ state: "failed" }); });
    return () => { live = false; };
  }, [friend.publicId]);
  const who = asFriend(friend);
  const none = decks.state === "done" && decks.items.length === 0;
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-[10px] px-[12px] pt-[12px] md:pt-[10px]">
        <button type="button" onClick={onBack} aria-label={copy.back} autoFocus className="flex h-[32px] w-[32px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid border-[color:var(--border)] bg-transparent text-[14px] text-[color:var(--fg-muted)]">
          ‹
        </button>
        <Face name={friend.displayName} commander={{ artCropUri: friend.commanderArt }} size={26} />
        <h3 className="m-0 min-w-0 flex-1 truncate text-[13.5px] font-medium text-[color:var(--fg)]">{copy.theirDecks(friend.displayName)}</h3>
      </div>
      <div data-seat-body className={SCROLL_BODY}>
      <ul className="m-0 list-none p-0 pb-[6px]">
        {decks.state === "busy" && <li className="px-[14px] py-[10px] font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.searching}</li>}
        {decks.state === "failed" && <li role="alert" className={NOTE}>{copy.decksFailed(friend.displayName)}</li>}
        {none && <li className={NOTE}>{copy.noDecks(friend.displayName)}</li>}
        {decks.state === "done" && decks.items.map((d) => (
          <li key={d.deckId}>
            <button
              type="button"
              onClick={() => onPick({ friend: who, deck: { id: d.deckId, name: d.name }, commander: { oracleId: d.commanderOracleId, name: d.commanderName, imageUri: d.commanderImageUri } })}
              className={ROW}
            >
              <span aria-hidden className="relative block h-[40px] w-[56px] shrink-0 overflow-hidden rounded-[6px] bg-[color:var(--elevated)]">
                {d.commanderImageUri && <ArtLayer src={d.commanderImageUri} style={{ backgroundPosition: "50% 20%" }} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-[color:var(--fg)]">{d.name}</span>
                <span className="block truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">{shortName(d.commanderName)}</span>
              </span>
            </button>
          </li>
        ))}
        {decks.state === "done" && (
          <>
            <li>
              <button type="button" onClick={onCommander} className={ROW}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-[color:var(--fg)]">{none ? copy.pickCommander : copy.anotherCommander}</span>
                  <span className="block truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.anotherCommanderSub(friend.displayName)}</span>
                </span>
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onPick({ friend: who, deck: null, commander: null })} className={ROW}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-[color:var(--fg)]">{copy.justFriend(friend.displayName)}</span>
                  <span className="block truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.justFriendSub}</span>
                </span>
              </button>
            </li>
          </>
        )}
      </ul>
      <Foot id={describedBy}>{none ? copy.footNoDecks(friend.displayName) : copy.footDecks(friend.displayName)}</Foot>
      </div>
    </div>
  );
}

function Body({
  onPick,
  inputRef,
  describedBy,
  seated,
  openAt,
}: {
  onPick: (pick: SeatPick) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  describedBy: string;
  /** Friends already at the table, by `publicId`. */
  seated: ReadonlySet<string>;
  /** Open on this friend's decks (a friend seated alone, from a pod, asks Which deck?). */
  openAt: SeatFriend | null;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View | null>(null);
  const [friends, setFriends] = useState<Load<PickerFriend>>({ state: "busy" });
  const { search, reset } = useCommanderSearch(query);

  // The friends are read when the picker opens, never before (G7).
  useEffect(() => {
    let live = true;
    listPickerFriendsAction()
      .then((items) => { if (live) setFriends({ state: "done", items }); })
      .catch(() => { if (live) setFriends({ state: "failed" }); });
    return () => { live = false; };
  }, []);

  const list = friends.state === "done" ? friends.items : [];
  const current: View = view ?? (() => {
    const named = openAt && list.find((f) => f.publicId === openAt.publicId);
    return named ? { step: "decks", friend: named } : { step: "list" };
  })();

  // Back to friends and Another commander remove the button that held focus and mount the field: put focus in it, so
  // typing searches at once. The first render is left to the dialog (the desktop panel is hidden until placed).
  const opened = useRef(false);
  useEffect(() => {
    if (!opened.current) { opened.current = true; return; }
    if (current.step !== "decks") inputRef.current?.focus();
  }, [current.step, inputRef]);

  function change(next: string) {
    reset();
    setQuery(next);
  }
  function go(next: View) {
    reset();
    setQuery("");
    setView(next);
  }

  // Asked to open on a friend: wait for the friends rather than draw the generic list and jump.
  if (openAt && !view && friends.state === "busy") {
    return <p className="m-0 px-[14px] py-[14px] font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.searching}</p>;
  }

  if (current.step === "decks") {
    const friend = current.friend;
    return (
      <Decks
        friend={friend}
        onPick={onPick}
        onCommander={() => go({ step: "commander", friend })}
        onBack={() => go({ step: "list" })}
        describedBy={describedBy}
      />
    );
  }

  const friend = current.step === "commander" ? current.friend : null;
  const q = query.trim().toLocaleLowerCase("en-US");
  const shown = friend ? [] : q === "" ? list : list.filter((f) => f.displayName.toLocaleLowerCase("en-US").includes(q));
  const placeholder = friend || list.length === 0 ? copy.placeholder : copy.placeholderFriends;
  const asking = q.length >= 2;
  return (
    <div className="flex min-h-0 flex-col">
      <Field inputRef={inputRef} value={query} onChange={change} placeholder={placeholder} describedBy={describedBy} />
      <div data-seat-body className={SCROLL_BODY}>
      <ul className="m-0 list-none p-0 pb-[6px]">
        {!friend && friends.state === "failed" && <li role="alert" className={NOTE}>{copy.friendsFailed}</li>}
        {shown.length > 0 && <li role="presentation"><h3 className={HEADING}>{copy.friends}</h3></li>}
        {shown.map((f) => {
          const here = seated.has(f.publicId);
          return (
            <li key={f.publicId}>
              <button
                type="button"
                aria-disabled={here || undefined}
                onClick={() => { if (!here) go({ step: "decks", friend: f }); }}
                className={`${ROW} ${here ? "cursor-default opacity-[.45]" : ""}`}
              >
                <Face name={f.displayName} commander={{ artCropUri: f.commanderArt }} size={40} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[color:var(--fg)]">{f.displayName}</span>
                <span className="shrink-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">{here ? copy.seated : copy.deckCount(f.deckCount)}</span>
              </button>
            </li>
          );
        })}
        {asking && shown.length > 0 && <li role="presentation"><h3 className={HEADING}>{copy.commanders}</h3></li>}
        <CommanderRows
          query={query}
          search={search}
          onPick={(hit) => onPick({ friend: friend ? asFriend(friend) : null, deck: null, commander: asCommander(hit) })}
        />
      </ul>
      <Foot id={describedBy}>{!friend && list.length > 0 ? copy.footFriends : copy.footAnyone}</Foot>
      </div>
    </div>
  );
}

/** Open from the seat that asked (`anchor`), at either width. `onPick` seats the commander and closes it. */
export function SeatPicker({
  anchor,
  onClose,
  onPick,
  seated,
  openAt = null,
}: {
  /** The control that opened it: where the panel hangs at 1300, and where focus returns. */
  anchor: HTMLElement;
  onClose: () => void;
  /** Seats what was pressed and closes the picker. */
  onPick: (pick: SeatPick) => void;
  /** The friends already at the OTHER seats: a friend sits once. */
  seated: ReadonlySet<string>;
  openAt?: SeatFriend | null;
}) {
  const desktop = useIsDesktop();
  const footId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLElement>(anchor);
  const { at, panelRef: placedRef, triggerRef } = useAnchoredPanel<HTMLElement>({ open: desktop, width: PANEL_WIDTH });
  useEffect(() => { triggerRef.current = anchor; anchorRef.current = anchor; }, [anchor, triggerRef]);
  // The panel is hidden until it is placed, and a hidden field takes no focus: the dialog hook's own attempt, in
  // the first layout pass, fails. Focus the search once it is visible.
  const focused = useRef(false);
  useEffect(() => {
    if (!desktop || !at || focused.current) return;
    focused.current = true;
    inputRef.current?.focus();
  }, [desktop, at]);
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
        <Body onPick={onPick} inputRef={inputRef} describedBy={footId} seated={seated} openAt={openAt} />
      </Sheet>
    );
  }
  return (
    <div
      ref={placedRef}
      role="dialog"
      aria-label={copy.title}
      // Held to the room on the side it hangs (`useAnchoredPanel`'s `maxHeight`) and a column, so the list and its foot
      // scroll under the view's head (`SCROLL_BODY`) instead of running off a short window or covering its own trigger.
      className={`${ANCHORED_PANEL_CLASS} fixed flex flex-col`}
      style={{ width: PANEL_WIDTH, maxHeight: at?.maxHeight, top: at?.top ?? 0, left: at?.left ?? 0, visibility: at ? "visible" : "hidden" }}
    >
      <Body onPick={onPick} inputRef={inputRef} describedBy={footId} seated={seated} openAt={openAt} />
    </div>
  );
}
