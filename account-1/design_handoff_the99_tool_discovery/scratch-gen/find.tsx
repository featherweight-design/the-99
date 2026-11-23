// Finding the tools (account 1, 2026-11-23), PROPOSAL: the Collection's Find a deck call-out, its filter, the tile press
// that opens Find a deck straight, and the welcome sheet's changes. Built from shipped parts only.
import { useRef } from "react";
import { TOUCH_HIT } from "../src/components/ui/touch-hit";
import { SegmentedSwitch } from "../src/components/ui/segmented-switch";
import { CardModal } from "../src/components/cards/card-modal";
import { FitsViewDrawing, type FitsViewList } from "../src/components/cards/fits-view-drawing";
import { swapToolsCopy } from "../src/lib/copy/swap-tools";

/** Every new string (copy strings.ts holds the same). */
export const findCopy = {
  callout: {
    eyebrow: "Find a deck",
    title: (n: number) => `${n.toLocaleString("en-US")} of your cards are in no deck`,
    body: "Narrow to them, then press a card’s two diamonds to see which of your decks it fits.",
    dismiss: "Dismiss",
  },
  filter: { aria: "Show", all: "All", free: "In no deck" },
  pressAria: (card: string) => `Find a deck for ${card}`,
  key: "find a deck for it",
};

/** The Find a deck door's own two-diamond glyph (`fits-door.tsx`), at the press's size. */
export function FitsGlyph({ px = 6 }: { px?: number }) {
  return (
    <span aria-hidden="true" className="flex gap-[3px]">
      {[0, 1].map((i) => <span key={i} className="rotate-45 border-[1.5px] border-[color:var(--accent)]" style={{ width: px, height: px }} />)}
    </span>
  );
}

/** The tile's press: the #3202 box over the caption's lower right, its glyph the door's. Opens Find a deck straight. */
export function FitPress({ name, open = false }: { name: string; open?: boolean }) {
  return (
    <span className="absolute bottom-[8px] right-[6px] z-[1] md:bottom-[9px] md:right-[8px]">
      <button type="button" aria-label={findCopy.pressAria(name)} aria-haspopup="dialog" aria-expanded={open} data-dz="fit"
        className={`flex cursor-pointer items-center border-0 bg-transparent p-0 ${TOUCH_HIT}`}>
        <span aria-hidden className={`flex h-[26px] min-w-[30px] items-center justify-center rounded-[6px] px-[6px] [border:1px_solid_var(--border-strong)] bg-[color:var(--surface)] ${open ? "outline-solid outline-2 outline-offset-[2px] outline-[color:var(--accent)]" : ""}`}>
          <FitsGlyph />
        </span>
      </button>
    </span>
  );
}

/** The call-out: the deck page's to-do card row as a statement (the you-have-it R3 call-out), with a bare ✕. */
export function FindCallout({ n }: { n: number }) {
  const c = findCopy.callout;
  return (
    <section aria-label={c.eyebrow} className="mt-[12px] overflow-hidden rounded-[12px] bg-[color:var(--surface-rail)] [border:1px_solid_var(--border-strong)] md:mt-[16px]">
      <div className="flex items-center gap-[10px] pl-[14px] pr-[4px] pt-[6px] pb-[2px]">
        <span className="min-w-0 flex-1 truncate font-mono uppercase leading-normal text-[9.5px] tracking-[0.14em] text-[color:var(--fg-faint)]">{c.eyebrow}</span>
        <button type="button" aria-label={c.dismiss} className="flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg-faint)] md:h-[32px] md:w-[32px]"><span aria-hidden>✕</span></button>
      </div>
      <div className="relative flex items-start gap-[11px] px-[14px] py-[11px] md:items-center md:px-[16px] md:py-[10px] [border-top:1px_solid_var(--border)]">
        <span aria-hidden className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] bg-[color:color-mix(in_srgb,var(--accent)_14%,var(--bg))]"><FitsGlyph /></span>
        <div className="min-w-0 flex-1 md:flex md:flex-wrap md:items-baseline md:gap-x-[12px]">
          <p className="m-0 text-[13.5px] font-semibold leading-[1.4] text-[color:var(--fg)]">{c.title(n)}</p>
          <p className="m-0 mt-[2px] text-[12px] leading-[1.5] text-[color:var(--fg-muted)] md:mt-0 md:text-[12.5px]">{c.body}</p>
        </div>
      </div>
    </section>
  );
}

/** The filter under it: the shipped SegmentedSwitch (compact, neutral), as History's and you-have-it's. It is the
 *  Availability filter's Free, so the chip row says so too. */
export function FindFilter({ all, n, on = false }: { all: number; n: number; on?: boolean }) {
  const f = findCopy.filter;
  return (
    <div className="mt-[12px] md:mt-[14px]">
      <SegmentedSwitch<"all" | "free"> kind="radio" tone="neutral" size="compact" ariaLabel={f.aria}
        segments={[{ value: "all", label: `${f.all} ·`, count: all.toLocaleString("en-US") }, { value: "free", label: `${f.free} ·`, count: String(n) }]}
        value={on ? "free" : "all"} onChange={() => {}} />
    </div>
  );
}

/** The card window opened by the press, straight on Find a deck (the shipped view, its back press the card). */
export function FitsSheet({ fits, dev }: { fits: any; dev: "phone" | "desk" }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const read = fits.list.read;
  const list: FitsViewList = { read, shown: read?.fits ?? [], holds: read?.holds ?? [], role: read?.card.role ?? "other", loadState: "ready", busy: null, refused: null, noteFor: () => null };
  const noop = () => {};
  const node = (
      <FitsViewDrawing card={fits.card} name={fits.name} owned={fits.owned} freeNow={fits.freeNow} countsKnown={fits.countsKnown}
        panel={fits.panel ? { ...fits.panel, planSources: {}, allowance: { used: 0, limit: 1, reopensAt: null, nextAt: null } } : null}
        list={list} running={null} now={0} runCount={null} pressFailed={false} tooBigFor={null} fresh={null} foldOpen={false}
        busy={false} writing={false} refused={null} actFor={() => null} announced="" bodyReady restored leaving={false} headingRef={headingRef}
        onBack={noop} onOpenCard={noop} onPress={noop} onToggleFold={noop} onRetryList={noop} onSwap={noop} onAddRead={noop} onAddFree={noop} />
  );
  const c = fits.cardFull;
  return <CardModal card={c} position={1} total={1} onClose={noop} onPrev={null} onNext={null} view={{ node, onBack: noop }} />;
}

/** The welcome sheet's new words. `tuningWhere` replaces `A deck’s Analysis tab` on the rows that moved. */
export const welcomeFreeCopy = {
  tuningWhere: "A deck’s Tuning tab",
  noDeckWhere: "A card in no deck",
  line: "Free, no credit needed",
  consider: "Consider",
  findADeck: "Find a deck",
  free: "free",
};
