"use client";

// Precons I own (`/decks/precons?pick=own`, no-collection entry S2 to S7): a pick mode of the shipped list, in rows.
// Search, colour pips and year groups are the list's own; one row per twin pair, with its edition chosen under the row
// once ticked; a sticky foot counts the boxes, their cards and tokens. Each box is added with its own id
// (`addPrecons`), so a retry is answered from what committed, and a box that lands unticks with `✓ added just now`.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { addPrecons } from "../../../app/decks/precon-actions";
import { preconsCopy, preconMonth } from "../../../lib/copy/precons";
import { colorNames } from "../../../lib/copy/color-labels";
import { PIP_ORDER, type PipCode } from "../../../lib/copy/filter-chassis";
import { WUBRG_COLOR } from "../../../lib/collection/browse";
import { filterPrecons, groupByYear, orderPrecons, type PreconBox, type PreconRow as Row } from "../../../lib/precons/list";
import {
  PICK_ENTRY_HREF, PICK_RECEIPT_PARAM, pickTotals, type PickEdition, type PickEntry, type PickOutcome,
} from "../../../lib/precons/pick";
import { mirrorUrl } from "../../../lib/url/mirror";
import { ColourPips } from "../../ui/colour-pips";
import { DeckSearchField } from "../deck-filter-column";
import { ToastFrame, useToastClock } from "../../collection/edit-toast";
import { PendingReporter } from "../../shell/pending-reporter";

const copy = preconsCopy.pick;
const NO_BOX: PreconBox = { copies: 0, tokens: 0, twin: null };
const boxOf = (r: Row) => r.box ?? NO_BOX;

export function PreconPickView({ rows, entry, initial }: {
  rows: Row[];
  entry: PickEntry;
  initial: { q: string; colours: string[] };
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [colours, setColours] = useState<string[]>(initial.colours);
  const [ticked, setTicked] = useState<ReadonlyMap<string, PickEdition>>(new Map());
  // Boxes that landed this visit, in order, with their entries: the receipt Done and the way back carry.
  const [landed, setLanded] = useState<{ rowFile: string; entryId: string }[]>([]);
  const [pending, setPending] = useState(false);
  // A press whose answer was lost may have added its boxes: the ticks and editions hold still until a press is answered,
  // so the retry carries the same boxes under the same ids rather than a changed pick under new ones.
  const [unsure, setUnsure] = useState(false);
  const [toast, setToast] = useState<{ text: string; lift: number } | null>(null);
  // One idempotency id per box and edition, kept across retries and dropped only once that box has landed, so a
  // retry after an unknown outcome is answered from the entry it wrote, and a box ticked again later adds again.
  const ids = useRef(new Map<string, string>());
  const searchWrap = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const add = useRef<HTMLButtonElement>(null);

  const newest = useMemo(() => orderPrecons(rows, "newest"), [rows]);
  const shown = useMemo(() => orderPrecons(filterPrecons(rows, q, colours), "newest"), [rows, q, colours]);
  const picked = newest.filter((r) => ticked.has(r.fileName)).map((r) => ({ row: r, edition: ticked.get(r.fileName)! }));
  const totals = pickTotals(picked.map((p) => ({ box: boxOf(p.row), edition: p.edition })));
  const landedFiles = new Set(landed.map((l) => l.rowFile));
  const dest = PICK_ENTRY_HREF[entry];
  // Once a box has landed, the way out carries its receipt to Home, the one page that draws it (S5), whichever page
  // the pick was opened from; with nothing added it goes back where it came from.
  const receiptHref = (entries: { entryId: string }[]) =>
    `${PICK_ENTRY_HREF.home}?${PICK_RECEIPT_PARAM}=${entries.map((l) => l.entryId).join(",")}`;
  const out = landed.length > 0 ? receiptHref(landed) : dest;

  function mirror(next: { q: string; colours: string[] }) {
    const live = new URLSearchParams(window.location.search);
    live.delete("q");
    live.delete("colour");
    if (next.q.trim()) live.set("q", next.q.trim());
    if (next.colours.length) live.set("colour", next.colours.join(","));
    mirrorUrl(`?${live.toString()}`);
  }
  const onSearch = (next: string) => { setQ(next); mirror({ q: next, colours }); };
  const onColour = (code: PipCode) => {
    const on = colours.includes(code) ? colours.filter((c) => c !== code) : [...colours, code];
    const next = PIP_ORDER.filter((c) => on.includes(c));
    setColours(next);
    mirror({ q, colours: next });
  };
  const tick = (file: string, edition: PickEdition | null) => setTicked((m) => {
    const next = new Map(m);
    if (edition === null) next.delete(file);
    else next.set(file, edition);
    return next;
  });

  const say = (text: string) => setToast({ text, lift: foot.current?.offsetHeight ?? 0 });

  async function submit() {
    if (pending) return;
    // Held at zero (S2): the press moves focus to the search, the start of the list.
    if (picked.length === 0) {
      searchWrap.current?.querySelector("input")?.focus();
      return;
    }
    const requests = picked.map(({ row, edition }) => {
      const key = `${row.fileName}:${edition}`;
      let id = ids.current.get(key);
      if (!id) { id = crypto.randomUUID(); ids.current.set(key, id); }
      return { fileName: row.fileName, edition, actionId: id };
    });
    setToast(null);
    setPending(true);
    let outcomes: PickOutcome[];
    try {
      outcomes = await addPrecons(requests);
    } catch {
      // It may have committed with its answer lost: the ticks and ids stay, so Try again cannot add a box twice.
      setPending(false);
      setUnsure(true);
      say(preconsCopy.start.owned.addUnsure);
      add.current?.focus();
      return;
    }
    setUnsure(false);
    const ok = outcomes.filter((o): o is Extract<PickOutcome, { ok: true }> => o.ok);
    const failed = outcomes.filter((o) => !o.ok);
    for (const o of ok) ids.current.delete(`${o.rowFile}:${ticked.get(o.rowFile)}`);
    const nowLanded = [...landed, ...ok.map((o) => ({ rowFile: o.rowFile, entryId: o.entryId }))];
    if (failed.length === 0) {
      // S5: every box written. The inputs stay locked while the destination loads.
      router.push(receiptHref(nowLanded));
      return;
    }
    setLanded(nowLanded);
    setTicked((m) => {
      const next = new Map(m);
      for (const o of ok) next.delete(o.rowFile);
      return next;
    });
    setPending(false);
    const name = (file: string) => rows.find((r) => r.fileName === file)?.name ?? file;
    // S6 when nothing landed; S7 names both, and retries nothing on its own.
    say(ok.length === 0 ? preconsCopy.start.owned.addFailed : copy.partFailed(ok.map((o) => name(o.rowFile)), failed.map((o) => name(o.rowFile))));
    add.current?.focus();
  }

  const lead = pending ? copy.addingLead(totals.boxes) : totals.boxes === 0 ? copy.leadNone : copy.lead(totals.boxes, totals.cards, totals.tokens);
  const label = pending ? copy.adding : totals.boxes === 0 ? copy.addHeld : copy.add(totals.boxes, totals.cards);
  const held = pending || totals.boxes === 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex flex-col gap-[4px] p-[12px_16px_0] md:mx-auto md:w-full md:max-w-[900px] md:p-[22px_0_0]">
        <Link href={out} className="flex min-h-[32px] items-center self-start text-[13px] text-[color:var(--fg-muted)] no-underline md:text-[12.5px]">
          {entry === "collection" ? copy.backCollection : copy.backHome}
          <PendingReporter href={out} />
        </Link>
        <h1 className="m-0 font-display text-[22px] font-normal text-[color:var(--fg)] md:text-[26px]">{copy.title}</h1>
        <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-muted)] md:hidden">{copy.subPhone}</p>
        <p className="m-0 hidden max-w-[720px] text-[13.5px] leading-[1.55] text-[color:var(--fg-muted)] md:block">{copy.sub}</p>
      </header>

      <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-[12px_16px_0] md:mx-auto md:w-full md:max-w-[900px] md:p-[16px_0_0]">
        <div className="flex flex-col gap-[10px] md:flex-row md:items-center">
          <div ref={searchWrap} className="min-w-0 flex-1">
            <DeckSearchField value={q} onChange={onSearch} size="sheet" placeholder={preconsCopy.list.search} />
          </div>
          <ColourPips form="wide" value={colours} onToggle={onColour} />
        </div>
        <p className="m-[10px_0_0] font-mono text-[10.5px] text-[color:var(--fg-faint)] md:text-[11px]">
          {preconsCopy.list.result(shown.length, rows.length, "newest")}
        </p>
      </fieldset>

      <div
        aria-busy={pending}
        inert={pending || unsure}
        className={`flex flex-1 flex-col gap-[18px] p-[8px_16px_24px] md:mx-auto md:w-full md:max-w-[900px] md:px-0 ${pending ? "opacity-[.55]" : ""}`}
      >
        {groupByYear(shown).map((g) => (
          <section key={g.year} aria-labelledby={`pick-${g.year}`} className="flex flex-col">
            <h2
              id={`pick-${g.year}`}
              className="m-0 flex items-baseline gap-[8px] border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)] pb-[7px] font-display text-[17px] font-normal text-[color:var(--fg)]"
            >
              {g.year}
              <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{preconsCopy.list.year(g.rows.length)}</span>
            </h2>
            <ul className="m-0 list-none p-0">
              {g.rows.map((r) => (
                <PickRow
                  key={r.fileName}
                  row={r}
                  edition={ticked.get(r.fileName) ?? null}
                  landed={landedFiles.has(r.fileName)}
                  onTick={(edition) => tick(r.fileName, edition)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div
        ref={foot}
        className="sticky bottom-[var(--tabbar-h)] z-20 border-x-0 border-b-0 border-t-[1px] border-solid border-t-[color:var(--border)] bg-[color:var(--bg)] p-[10px_16px_12px] md:bottom-0 md:bg-[color:var(--surface-rail)] md:p-0"
      >
        <div className="flex flex-col gap-[8px] md:mx-auto md:h-[68px] md:max-w-[900px] md:flex-row md:items-center md:gap-[12px]">
          <span aria-live="polite" className="text-center font-mono text-[10.5px] text-[color:var(--fg-body)] md:flex-1 md:text-left md:font-sans md:text-[13px]">{lead}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => router.push(out)}
            className="hidden h-[40px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] font-sans text-[13.5px] text-[color:var(--fg)] disabled:cursor-default disabled:opacity-40 md:block"
          >
            {landed.length > 0 ? copy.done : copy.cancel}
          </button>
          <button
            ref={add}
            type="button"
            aria-disabled={held}
            onClick={submit}
            className={`h-[48px] w-full cursor-pointer rounded-[10px] border-0 bg-[color:var(--fg)] px-[18px] font-sans text-[14px] font-semibold text-[color:var(--bg)] md:h-[40px] md:w-auto md:rounded-[8px] md:text-[13.5px] ${held ? "opacity-40" : ""}`}
          >
            {label}
          </button>
        </div>
      </div>

      {toast && (
        <PickToast key={toast.text} text={toast.text} lift={toast.lift} onRetry={submit} onDone={() => setToast(null)} />
      )}
    </div>
  );
}

/** One box (S2, S3): the whole row is the checkbox's label; a ticked twin opens its edition under it, outside the label. */
function PickRow({ row, edition, landed, onTick }: {
  row: Row;
  edition: PickEdition | null;
  landed: boolean;
  onTick: (edition: PickEdition | null) => void;
}) {
  const box = boxOf(row);
  const on = edition !== null;
  const side = edition === "collector" && box.twin ? box.twin : box;
  const meta = `${row.setCode} · ${preconMonth(row.releaseDate)}`;
  return (
    <li className="flex flex-col border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)]">
      <label className={`flex min-h-[56px] cursor-pointer items-center gap-[12px] px-[4px] md:min-h-[52px] md:gap-[14px] md:px-[10px] ${on ? "bg-[color:var(--surface-sunken)]" : ""}`}>
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onTick(e.target.checked ? "regular" : null)}
          className="h-[22px] w-[22px] flex-none cursor-pointer accent-[color:var(--accent)] md:h-[20px] md:w-[20px]"
        />
        <span className="sr-only">{row.identity.length > 0 ? colorNames(row.identity).join(", ") : preconsCopy.row.colorless}</span>
        <span aria-hidden className="flex w-[52px] flex-none gap-[3px] md:w-[57px]">
          {(row.identity.length > 0 ? row.identity : ["C"]).map((c) => (
            <span key={c} className="h-[8px] w-[8px] rounded-full md:h-[9px] md:w-[9px]" style={{ background: c === "C" ? "var(--fg-faint)" : WUBRG_COLOR[c] }} />
          ))}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px] md:gap-[2px]">
          <span className="text-[14px] font-semibold text-[color:var(--fg)]">{row.name}</span>
          {landed ? (
            <span className="font-mono text-[10.5px] text-[color:var(--success)] md:hidden">{copy.landed}</span>
          ) : null}
          <span className={`font-mono text-[10.5px] text-[color:var(--fg-faint)] md:inline md:text-[11px] ${landed ? "hidden" : ""}`}>
            {meta}
            {row.twinName ? <span className="hidden md:inline"> · {preconsCopy.row.twin}</span> : null}
          </span>
        </span>
        {landed ? <span className="hidden flex-none font-mono text-[10.5px] text-[color:var(--success)] md:inline">{copy.landed}</span> : null}
        <span className="flex-none text-right font-mono text-[11px] text-[color:var(--fg-muted)] md:w-[80px] md:text-[12px]">
          <span className="md:hidden">{copy.cardsShort(side.copies)}</span>
          <span className="hidden md:inline">{copy.cards(side.copies)}</span>
        </span>
      </label>
      {on && box.twin ? (
        <div role="radiogroup" aria-label={copy.edition} className="flex flex-col p-[0_4px_8px_38px] text-[13px] text-[color:var(--fg-body)] md:flex-row md:items-center md:gap-[18px] md:p-[2px_10px_12px_44px] md:text-[12.5px]">
          <span aria-hidden className="hidden font-mono text-[11px] uppercase text-[color:var(--fg-faint)] md:inline">{copy.edition}</span>
          {(["regular", "collector"] as const).map((e) => (
            <label key={e} className="flex min-h-[44px] cursor-pointer items-center gap-[10px] md:min-h-[32px] md:gap-[8px]">
              <input
                type="radio"
                name={`edition-${row.fileName}`}
                checked={edition === e}
                onChange={() => onTick(e)}
                className="h-[18px] w-[18px] flex-none cursor-pointer accent-[color:var(--accent)] md:h-[16px] md:w-[16px]"
              />
              {e === "regular" ? copy.regular : (
                <span>{copy.collector} <span className="text-[color:var(--fg-faint)]">· {copy.collectorNote}</span></span>
              )}
            </label>
          ))}
        </div>
      ) : null}
    </li>
  );
}

/** A refusal (S6, S7, or an unknown outcome): the shared toast, centred above the foot, with Try again. */
function PickToast({ text, lift, onRetry, onDone }: { text: string; lift: number; onRetry: () => void; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  useToastClock(ref, !hover && !focus, onDone);
  return (
    <ToastFrame
      frameRef={ref}
      role="alert"
      placement="center"
      lift={lift}
      title={text}
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
      actions={
        <button
          type="button"
          onClick={onRetry}
          className="h-[36px] flex-none cursor-pointer rounded-[8px] border-0 bg-transparent px-[12px] font-sans text-[13px] font-semibold text-[color:var(--accent)] underline underline-offset-2"
        >
          {copy.tryAgain}
        </button>
      }
    />
  );
}
