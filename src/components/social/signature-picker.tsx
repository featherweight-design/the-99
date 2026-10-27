"use client";
// The signature card picker (avatar handoff 20, calls 2, 3 and 7; boards P1 to P8 and D1 to D2), drawn in place of
// `CommanderPicker` while `SIGNATURE_CARD_ENABLED` is on. The same `SocialModal` (a tall sheet at phone, 520 at
// desktop), the same search field and the same From your decks row, each deck's lead in the printing that deck holds.
// The search finds ANY game card, its type line under the name. A card with one printing saves on press; one with
// more reads `N printings ›` and opens a second screen in the same modal: a preview of the face, the printing tiles
// (the usual art first, then newest set first), and the set search once there are more than twelve tiles.
//
// A save keeps the picker open (P4, P6): the pressed row or tile shows Saving, the rest dim, and the picker closes
// only once the write lands (the caller closes it). A failed save leaves it open and the caller toasts inside it.
//
// The usual art is a null printing: the card's own art, whatever printing that is. A pick whose printing can no
// longer be drawn (`printingGone`) is the one case the picker tells (P8): a note, and the usual art tile reads
// Shown now, since that is what friends see.

import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { FaceCardHit, FacePrinting, FacePrintings, FaceTile } from "../../lib/decks/commander-picker";
import type { OwnCommander } from "../../lib/social/friends";
import { socialCopy } from "../../lib/copy/social";
import { printingPickerCopy } from "../../lib/copy/collection";
import { listDeckFacesAction, listFacePrintingsAction, searchFaceCardsAction } from "../../app/friends/actions";
import { OVERFLOW_THRESHOLD } from "../cards/printing-region";
import { SearchField } from "../ui/text-field";
import { FadingImg } from "../ui/hydrated-art";
import { SocialModal } from "./social-modal";
import { tileName } from "./commander-picker";

const s = socialCopy.signature;
const c = socialCopy.commander;
/** The catalog search asks for nothing under two characters (`nameSearch`). */
const MIN_QUERY = 2;
const DEBOUNCE_MS = 180;

/** A pick, as the caller saves it and then draws it. */
export type SignaturePick = { oracleId: string; printingId: string | null; face: OwnCommander };

type Deck = { k: "loading" } | { k: "done"; tiles: FaceTile[] };
type Found = { q: string; hits: FaceCardHit[]; failed: boolean } | null;
type Printings = { k: "loading"; hit: FaceCardHit } | { k: "done"; card: FacePrintings } | { k: "failed"; hit: FaceCardHit };
/** What is being saved: a row or deck tile (by oracle id), or a printing tile (by printing id, "" for the usual art). */
type Saving = { kind: "card"; oracleId: string } | { kind: "printing"; id: string } | null;

/** One tile on the printings screen: the usual art (a null printing) or a printing. */
type Tile = { id: string; printingId: string | null; label: string; code: string; imageUri: string | null; artCropUri: string | null };

export function SignaturePicker({
  current,
  onSave,
  onClose,
  returnFocusRef,
  toast,
}: {
  /** The face now, with the pick behind it: outlined in the deck row and on its printings screen. */
  current: OwnCommander | null;
  /** Save a pick, or null for initials. Resolves true when it landed; the caller then closes the picker. */
  onSave: (pick: SignaturePick | null) => Promise<boolean>;
  onClose: () => void;
  /** Where focus goes when the picker closes. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** The page's toast, drawn inside the dialog so its Try again stays in the Tab trap. */
  toast?: ReactNode;
}) {
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [deck, setDeck] = useState<Deck>({ k: "loading" });
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found>(null);
  const [busy, setBusy] = useState(false);
  const [hl, setHl] = useState(0);
  const [printings, setPrintings] = useState<Printings | null>(null);
  const [saving, setSaving] = useState<Saving>(null);
  const asked = useRef(0);

  useEffect(() => {
    let live = true;
    listDeckFacesAction().then(
      (r) => live && setDeck({ k: "done", tiles: r.ok ? r.tiles : [] }),
      () => live && setDeck({ k: "done", tiles: [] }),
    );
    return () => {
      live = false;
    };
  }, []);

  const q = query.trim();
  const searching = q.length >= MIN_QUERY;
  useEffect(() => {
    if (!searching) return;
    const ask = ++asked.current;
    const t = setTimeout(() => {
      setBusy(true);
      searchFaceCardsAction(q).then(
        (r) => {
          if (ask !== asked.current) return;
          setFound(r.ok ? { q, hits: r.hits, failed: false } : { q, hits: [], failed: true });
          setHl(0);
          setBusy(false);
        },
        () => {
          if (ask !== asked.current) return;
          setFound({ q, hits: [], failed: true });
          setBusy(false);
        },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, searching]);

  const results = searching ? found : null;
  const hits = results?.hits ?? [];
  // The results answer the query in the field, not one typed before it: only then may a row be highlighted or pressed.
  const fresh = results !== null && results.q === q;
  const failed = fresh && results.failed && !busy;

  // The highlighted row is kept in view inside the modal's body only (as `CommanderPicker` does).
  const active = fresh && hits.length > 0 ? Math.min(hl, hits.length - 1) : -1;
  useEffect(() => {
    if (active < 0 || printings) return;
    const opt = document.getElementById(`${listId}-${active}`);
    const body = opt?.closest<HTMLElement>("[data-social-modal-body]");
    if (!opt || !body) return;
    const o = opt.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    if (o.top < b.top) body.scrollTop -= b.top - o.top;
    else if (o.bottom > b.bottom) body.scrollTop += o.bottom - b.bottom;
  }, [listId, active, printings]);

  async function save(pick: SignaturePick | null, what: Saving) {
    if (saving) return;
    setSaving(what);
    const ok = await onSave(pick).catch(() => false);
    // Landed: the caller closes the picker. Failed: it stays, every row and tile live again.
    if (!ok) setSaving(null);
  }

  const faceOf = (oracleId: string, name: string, artCropUri: string | null, printingId: string | null): OwnCommander => ({
    oracleId, name, artCropUri, printingId, printingGone: false,
  });

  function pressHit(hit: FaceCardHit) {
    if (saving) return;
    if (hit.printings > 1) {
      openPrintings(hit);
      return;
    }
    void save({ oracleId: hit.oracleId, printingId: null, face: faceOf(hit.oracleId, hit.name, hit.artCropUri, null) }, { kind: "card", oracleId: hit.oracleId });
  }

  function openPrintings(hit: FaceCardHit) {
    setPrintings({ k: "loading", hit });
    listFacePrintingsAction(hit.oracleId).then(
      (r) => setPrintings((was) => (was?.k === "loading" && was.hit.oracleId === hit.oracleId ? (r.ok ? { k: "done", card: r.card } : { k: "failed", hit }) : was)),
      () => setPrintings((was) => (was?.k === "loading" && was.hit.oracleId === hit.oracleId ? { k: "failed", hit } : was)),
    );
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // An IME's Enter and arrows choose among its candidates; the picker acts only once composing is done.
    if (e.nativeEvent.isComposing) return;
    if (!fresh || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHl((h) => Math.min(hits.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHl((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pressHit(hits[Math.min(hl, hits.length - 1)]);
    }
  }

  const deckTiles = deck.k === "done" ? deck.tiles : [];
  const listShown = searching && !failed && !(fresh && hits.length === 0 && !busy);
  const onPrintings = printings !== null;
  const cardName = printings ? (printings.k === "done" ? printings.card.name : printings.hit.name) : "";
  const count = printings ? (printings.k === "done" ? printings.card.printings.length : printings.hit.printings) : 0;

  return (
    <SocialModal
      title={onPrintings ? cardName : s.title}
      sub={onPrintings ? s.printingsSub(count) : s.sub}
      closeLabel={socialCopy.page.close}
      // Held while a save is in flight (P4, P6): the picker closes when the write lands, and a picker closed and opened
      // again meanwhile would be the one that answer closes.
      onClose={saving ? () => {} : onClose}
      initialFocusRef={search}
      returnFocusRef={returnFocusRef}
      tall
      width={520}
      screen={onPrintings ? "printings" : "search"}
      onBack={onPrintings && !saving ? () => setPrintings(null) : undefined}
      backLabel={s.back}
      overlay={toast}
    >
      {printings ? (
        <PrintingsScreen printings={printings} current={current} saving={saving} onSave={save} />
      ) : (
        <>
          <SearchField
            ref={search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            onKeyDown={onKeyDown}
            placeholder={s.search}
            aria-label={s.search}
            role="combobox"
            aria-expanded={listShown}
            aria-controls={listShown ? listId : undefined}
            aria-activedescendant={fresh && hits.length > 0 ? `${listId}-${Math.min(hl, hits.length - 1)}` : undefined}
            autoComplete="off"
            // 16px at phone, or iOS zooms the page into the field.
            containerClassName="h-[46px] flex-none md:h-[44px]"
            className="text-[16px] [@media(pointer:fine)]:md:text-[14px]"
          />

          {searching ? (
            failed ? (
              <p role="alert" className="m-0 mt-[16px] text-[13.5px] text-[color:var(--fg-muted)]">{s.searchFailed}</p>
            ) : fresh && hits.length === 0 && !busy ? (
              <p role="status" className="m-0 mt-[16px] text-[13.5px] text-[color:var(--fg-muted)]">{s.noResults(q)}</p>
            ) : (
              <ul id={listId} role="listbox" aria-label={s.search} aria-busy={busy || saving !== null || undefined} className="m-0 mt-[8px] flex list-none flex-col p-0">
                {hits.map((h, i) => {
                  const on = fresh && i === hl;
                  const mine = saving?.kind === "card" && saving.oracleId === h.oracleId;
                  const many = h.printings > 1;
                  return (
                    <li key={h.oracleId} id={`${listId}-${i}`} role="option" aria-selected={on} className={saving && !mine ? "opacity-45" : undefined}>
                      <button
                        type="button"
                        tabIndex={-1}
                        // A row from a query typed before the field's is not this query's answer: it is held, as Enter is.
                        disabled={saving !== null || !fresh}
                        onClick={() => pressHit(h)}
                        onPointerMove={() => setHl(i)}
                        aria-label={many ? s.printingsAria(h.name, h.printings) : undefined}
                        data-face-hit={h.oracleId}
                        className={`flex h-[56px] w-full cursor-pointer items-center gap-[12px] border-0 px-[4px] text-left font-sans md:h-[52px] ${on || mine ? "rounded-[8px] bg-[color:var(--elevated)] [border-bottom:1px_solid_transparent]" : "bg-transparent [border-bottom:1px_solid_var(--elevated)]"}`}
                      >
                        <Art src={h.artCropUri} className="h-[40px] w-[56px] flex-none rounded-[6px]" />
                        <span className="flex min-w-0 flex-col gap-[1px]">
                          <span className="truncate text-[14.5px] text-[color:var(--fg)] md:text-[14px]">{h.name}</span>
                          <span className="truncate font-mono text-[11px] text-[color:var(--fg-faint)]">{h.typeLine}</span>
                        </span>
                        {mine ? (
                          <span className="ml-auto flex flex-none items-center gap-[8px] pl-[8px] font-mono text-[11px] text-[color:var(--fg-muted)]">
                            {s.saving}
                            <Spinner size={18} />
                          </span>
                        ) : many ? (
                          <span aria-hidden className="ml-auto flex flex-none items-center gap-[6px] pl-[8px] font-mono text-[11px] text-[color:var(--fg-faint)]">
                            {s.printings(h.printings)}
                            <span className="font-sans text-[15px] leading-none">›</span>
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : deckTiles.length > 0 ? (
            <section className="mt-[16px]">
              <h3 className="m-0 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{c.fromDecks}</h3>
              <ul className="m-0 mt-[10px] grid list-none grid-cols-2 gap-[12px] p-0 md:grid-cols-4 md:gap-[10px]">
                {deckTiles.map((t) => {
                  const cur = t.oracleId === current?.oracleId;
                  const mine = saving?.kind === "card" && saving.oracleId === t.oracleId;
                  return (
                    <li key={t.oracleId} className={saving && !mine ? "opacity-45" : undefined}>
                      <button
                        type="button"
                        aria-pressed={cur}
                        aria-label={t.name}
                        aria-busy={mine || undefined}
                        disabled={saving !== null}
                        onClick={() => void save({ oracleId: t.oracleId, printingId: t.printingId, face: faceOf(t.oracleId, t.name, t.artCropUri, t.printingId) }, { kind: "card", oracleId: t.oracleId })}
                        className="relative flex w-full cursor-pointer flex-col gap-[6px] border-0 bg-transparent p-0 text-left font-sans text-[13px] md:text-[12px]"
                      >
                        <Art src={t.artCropUri} framed className={`h-[95px] w-full rounded-[8px] md:h-[78px] ${cur || mine ? "outline-2 outline-offset-2 outline-[color:var(--accent)] [outline-style:solid]" : ""}`} />
                        {mine ? <span className="absolute left-0 right-0 top-0 flex h-[95px] items-center justify-center md:h-[78px]"><Spinner size={22} /></span> : null}
                        <span className={`truncate ${cur ? "text-[color:var(--fg)]" : "text-[color:var(--fg-body)]"}`}>{tileName(t.name)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <div className="mt-auto flex min-h-[44px] items-center justify-between gap-[12px] pt-[14px] font-mono text-[11px] text-[color:var(--fg-faint)]">
            <span>{searching || deckTiles.length === 0 ? s.anyNote : c.savedNote}</span>
            {current ? (
              <button
                type="button"
                disabled={saving !== null}
                onClick={() => void save(null, { kind: "card", oracleId: "" })}
                className="min-h-[44px] flex-none cursor-pointer border-0 bg-transparent px-[4px] font-sans text-[13.5px] font-medium text-[color:var(--accent-text)]"
              >
                {c.clear}
              </button>
            ) : null}
          </div>
        </>
      )}
    </SocialModal>
  );
}

/** The second screen (P5, P6, P8, D2): the face preview, the gone note, the set search and the printing tiles. */
function PrintingsScreen({
  printings,
  current,
  saving,
  onSave,
}: {
  printings: Printings;
  current: OwnCommander | null;
  saving: Saving;
  onSave: (pick: SignaturePick, what: Saving) => Promise<void>;
}) {
  const [filter, setFilter] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const card = printings.k === "done" ? printings.card : null;

  const tiles = useMemo<Tile[]>(() => {
    if (!card) return [];
    const usual: Tile = { id: "", printingId: null, label: s.usualArt, code: card.usual.setCode ?? "", imageUri: card.usual.imageUri, artCropUri: card.usual.artCropUri };
    return [usual, ...card.printings.map((p: FacePrinting) => ({
      id: p.scryfallId, printingId: p.scryfallId, label: p.setName ?? p.setCode, code: p.setCode, imageUri: p.imageUri, artCropUri: p.artCropUri,
    }))];
  }, [card]);

  if (printings.k === "failed") {
    return <p role="alert" className="m-0 text-[13.5px] text-[color:var(--fg-muted)]">{s.printingsFailed}</p>;
  }
  if (printings.k === "loading" || !card) {
    return (
      <div role="status" aria-label={printings.k === "loading" ? printings.hit.name : undefined} className="flex justify-center py-[40px]">
        <Spinner size={22} />
      </div>
    );
  }

  const isCurrentCard = current?.oracleId === card.oracleId;
  const gone = isCurrentCard && current.printingGone;
  // The tile friends see now: the pick, else the usual art (a null pick, or a pick that is gone).
  const shownId = isCurrentCard ? (gone || current.printingId === null ? "" : current.printingId) : null;
  const savingId = saving?.kind === "printing" ? saving.id : null;

  const f = filter.trim().toLowerCase();
  const shown = f === "" ? tiles : tiles.filter((t) => t.id === "" || `${t.label} ${t.code} ${numberOf(card, t.id)}`.toLowerCase().includes(f));
  const previewTile = tiles.find((t) => t.id === (savingId ?? hover)) ?? tiles.find((t) => t.id === (shownId ?? "")) ?? tiles[0];
  const status = savingId !== null ? s.previewSaving : gone && previewTile.id === "" ? s.previewNow : s.previewNote;

  return (
    <>
      <div className="flex items-center gap-[14px] rounded-[12px] bg-[color:var(--bg)] p-[12px] [border:1px_solid_var(--border)]">
        <span className="block h-[64px] w-[64px] flex-none overflow-hidden rounded-[14px] bg-[color:var(--surface-raised)] [border:1px_solid_var(--border-strong)]">
          {previewTile.artCropUri ? <FadingImg src={previewTile.artCropUri} alt="" className="block h-full w-full object-cover" /> : null}
        </span>
        <span className="flex min-w-0 flex-col gap-[2px]">
          <b className="truncate text-[14px] font-semibold text-[color:var(--fg)]">{card.name}</b>
          <span className="truncate font-mono text-[11px] text-[color:var(--fg-faint)]">
            {previewTile.code ? s.previewLine(previewTile.label, previewTile.code) : previewTile.label}
          </span>
          <span aria-live="polite" className="text-[12.5px] text-[color:var(--fg-muted)]">{status}</span>
        </span>
      </div>

      {gone ? (
        <p className="m-0 mt-[12px] flex gap-[10px] rounded-[10px] bg-[color:var(--surface-sunken)] px-[13px] py-[11px] text-[13px] leading-[1.5] text-[color:var(--fg-body)] [border:1px_solid_var(--border)]">
          <span aria-hidden className="mt-[1px] font-mono text-[12px] font-semibold text-[color:var(--fg-faint)]">i</span>
          <span>{s.gone}</span>
        </p>
      ) : null}

      {tiles.length > OVERFLOW_THRESHOLD ? (
        <div className="mt-[12px]">
          <SearchField
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onClear={() => setFilter("")}
            placeholder={s.setSearch}
            aria-label={s.setSearch}
            autoComplete="off"
            containerClassName="h-[46px] flex-none md:h-[44px]"
            className="text-[16px] [@media(pointer:fine)]:md:text-[14px]"
          />
        </div>
      ) : null}

      {shown.length <= 1 && f !== "" ? (
        <p role="status" className="m-0 mt-[12px] text-[13.5px] text-[color:var(--fg-muted)]">{s.setNoResults(filter.trim())}</p>
      ) : null}

      <ul aria-busy={savingId !== null || undefined} className="m-0 mt-[14px] grid list-none grid-cols-3 gap-x-[10px] gap-y-[14px] p-0 md:grid-cols-4 md:gap-x-[12px]">
        {shown.map((t) => {
          const isShown = t.id === shownId;
          const nowGone = gone && t.id === "";
          const mine = savingId === t.id;
          return (
            <li key={t.id || "usual"} className={savingId !== null && !mine ? "opacity-45" : undefined}>
              <button
                type="button"
                aria-pressed={isShown}
                aria-label={s.tileAria(t.id === "" ? s.usualArt : s.tileName(t.label, t.code, numberOf(card, t.id)), isShown)}
                aria-busy={mine || undefined}
                disabled={savingId !== null}
                data-face-printing={t.id || "usual"}
                onClick={() => void onSave(
                  { oracleId: card.oracleId, printingId: t.printingId, face: { oracleId: card.oracleId, name: card.name, artCropUri: t.artCropUri, printingId: t.printingId, printingGone: false } },
                  { kind: "printing", id: t.id },
                )}
                onPointerEnter={() => setHover(t.id)}
                onPointerLeave={() => setHover((h) => (h === t.id ? null : h))}
                onFocus={() => setHover(t.id)}
                onBlur={() => setHover((h) => (h === t.id ? null : h))}
                className="flex w-full cursor-pointer flex-col gap-[6px] border-0 bg-transparent p-0 text-left font-sans"
              >
                <span
                  className="relative block w-full overflow-hidden rounded-[9px] bg-[color:var(--surface-sunken)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]"
                  style={{
                    aspectRatio: "63/88",
                    outline: mine || (isShown && !nowGone)
                      ? "2px solid var(--accent)"
                      : nowGone
                        ? "1px dashed var(--fg-faint)"
                        : hover === t.id
                          ? "1px dashed var(--border-dashed)"
                          : undefined,
                    outlineOffset: 3,
                  }}
                >
                  {/* Lazy: a card can have dozens of printings below the fold; the preview above stays eager. */}
                  {t.imageUri ? <FadingImg src={t.imageUri} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover" /> : null}
                  {mine ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-[rgba(10,8,6,.45)]"><Spinner size={26} thick /></span>
                  ) : isShown || nowGone ? (
                    <span
                      aria-hidden
                      className={`absolute right-[7px] top-[7px] flex h-[22px] w-[22px] items-center justify-center rounded-[5px] text-[12px] font-semibold ${nowGone ? "bg-[rgba(10,8,6,.72)] text-[color:var(--fg-body)] [border:1px_dashed_var(--fg-faint)]" : "bg-[color:var(--accent)] text-[color:var(--bg)]"}`}
                    >
                      {nowGone ? "◇" : "✓"}
                    </span>
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-col gap-[1px]">
                  <span className="truncate text-[12px] leading-[1.3] text-[color:var(--fg-body)]">{t.label}</span>
                  {nowGone ? (
                    <span className="font-mono text-[10.5px] font-medium text-[color:var(--fg-muted)]">{printingPickerCopy.printing.badgeShownNow}</span>
                  ) : t.code ? (
                    <span className="truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">{t.code}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** A printing's collector number, for the set search (sets, codes or numbers). */
function numberOf(card: FacePrintings, id: string): string {
  return card.printings.find((p) => p.scryfallId === id)?.collectorNumber ?? "";
}

function Spinner({ size, thick = false }: { size: number; thick?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block flex-none animate-spin rounded-full border-[color:var(--border-strong)] border-t-[color:var(--accent)] motion-reduce:animate-none"
      style={{ width: size, height: size, borderWidth: thick ? 2.5 : 2, borderStyle: "solid" }}
    />
  );
}

/** A row's or tile's art crop. A deck tile is `framed` in `--border-strong`; a result row's art is not. */
function Art({ src, className, framed = false }: { src: string | null; className: string; framed?: boolean }) {
  const frame = framed ? "[border:1px_solid_var(--border-strong)]" : "";
  return src ? (
    <FadingImg src={src} alt="" className={`block object-cover ${frame} ${className}`} />
  ) : (
    <span aria-hidden className={`block bg-[color:var(--surface-sunken)] ${frame} ${className}`} />
  );
}
