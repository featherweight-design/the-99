"use client";

// What `/decks/[id]` draws while the deck loads (handoff `design_handoff_the99_deck_flip_skeleton`, option B): the page's own
// shape, not the crown screen. The band is its shipped height on a sunken ground with no art, the strip row keeps its real
// `‹ All decks` link, the tab row is real words with the kept tab underlined, and everything else is a shape. It carries
// `StallWatch` and `data-loading-screen` as `LoadingScreen` does, so a deck stuck here is reported like any other loading screen.

import { useSearchParams } from "next/navigation";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { deckFlipCopy, deckOpenLoadingCopy } from "../../lib/copy/deck-flip";
import { gameLogCopy } from "../../lib/copy/game-log";
import { TAB_PARAM } from "../../lib/decks/builder-view";
import { StallWatch } from "../shell/nav-stall";
import { PendingReporter } from "../shell/pending-reporter";
import { BAR } from "../ui/tile-skeleton";
import Link from "next/link";

const SH = "rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)]";
const NAME = [62, 48, 74, 55, 68, 44, 80, 58, 66, 50, 72, 46];
// The tab row's words never change; `Your deck` alone carries a count, drawn as a bar. A deck with no history draws no Versions
// tab when the page lands, so that tab leaves the row then.
const TABS = [
  { id: "deck", label: addPanelCopy.tabs.deck, count: true },
  { id: "analysis", label: addPanelCopy.tabs.analysis, count: false },
  { id: "consider", label: addPanelCopy.tabs.consider, count: false },
  { id: "games", label: gameLogCopy.tab.label, count: false },
  { id: "versions", label: deckVersioningCopy.history.tab, count: false },
] as const;

function Rows({ n }: { n: number }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex h-[37px] items-center gap-[12px] rounded-[8px] bg-[color:var(--surface-rail)] px-[10px]">
          <span className="h-[8px] w-[8px] flex-none rounded-full bg-[color:var(--surface-raised)]" />
          <span className={`${BAR} h-[12px]`} style={{ width: `${NAME[i % NAME.length]! * 0.6}%` }} />
          <span className="ml-auto flex gap-[3px]">
            {Array.from({ length: 1 + (i % 3 === 0 ? 1 : 0) }, (_, j) => <span key={j} className="h-[9px] w-[9px] rounded-full bg-[color:var(--surface-raised)]" />)}
          </span>
          <span className="w-[22px]" />
        </li>
      ))}
    </ul>
  );
}

/** The to-do card's shell and the mix, then the tab row and the list's chassis: one drawing per width (`wide` is from `md`). */
function Body({ wide, tab }: { wide: boolean; tab: string }) {
  const px = wide ? "px-[22px]" : "px-[16px]";
  return (
    <div aria-hidden className={wide ? "hidden flex-col md:flex" : "flex flex-col md:hidden"}>
      <div className={`anim-skeleton flex flex-col ${px} pt-[14px]`} style={{ gap: wide ? 22 : 18 }}>
        <div className="overflow-hidden rounded-[14px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)]">
          <div className="flex items-center justify-between px-[14px] py-[14px]"><span className={`${BAR} h-[10px] w-[52%]`} /><span className={`${BAR} h-[10px] w-[48px]`} /></div>
          <div className={`flex items-center gap-[12px] bg-[color:var(--surface-sunken)] px-[14px] ${wide ? "h-[64px]" : "h-[96px]"}`}>
            <span className="flex flex-1 flex-col gap-[8px]">
              <span className={`${BAR} h-[9px] w-[70px] bg-[color:var(--surface-raised)]`} />
              <span className={`${BAR} h-[14px] w-[64%]`} />
              {!wide && <span className={`${BAR} h-[10px] w-[52%] bg-[color:var(--surface-raised)]`} />}
            </span>
            <span className={`${SH} h-[44px] ${wide ? "w-[150px]" : "w-[120px]"} flex-none`} />
          </div>
          <div className="px-[14px] py-[16px]"><span className={`${BAR} block h-[10px] w-[44%] bg-[color:var(--surface-raised)]`} /></div>
        </div>
        <div className="flex flex-col gap-[10px]">
          <span className={`${BAR} h-[10px] w-[180px]`} />
          <div className="grid grid-cols-5" style={{ gap: wide ? 14 : 6 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={`flex flex-col gap-[9px] rounded-[10px] border border-solid border-[color:var(--border)] ${wide ? "h-[150px] p-[16px]" : "h-[78px] items-center p-[10px]"}`}>
                <span className={`${BAR} h-[8px] w-[46%] bg-[color:var(--surface-raised)]`} />
                <span className={`${BAR} ${wide ? "h-[18px] w-[34%]" : "h-[16px] w-[30%]"}`} />
                {wide && <span className="mt-[6px] h-[6px] w-full rounded-full bg-[color:var(--surface-raised)]" />}
                <span className={`${BAR} h-[8px] w-[58%] bg-[color:var(--surface-raised)] ${wide ? "mt-auto" : ""}`} />
              </div>
            ))}
          </div>
          <span className={`${BAR} h-[10px] w-[120px] bg-[color:var(--surface-raised)]`} />
        </div>
      </div>
      <nav className={`mt-[18px] flex gap-[28px] overflow-hidden border-0 border-y border-solid border-[color:var(--border)] ${px}`}>
        {TABS.map((t) => (
          <span
            key={t.id}
            className={`flex flex-none items-center gap-[7px] py-[16px] font-sans text-[16px] ${t.id === tab ? "border-0 border-b-[3px] border-solid border-[color:var(--accent)] font-semibold text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"}`}
          >
            {t.label}
            {t.count && <span className={`anim-skeleton ${BAR} h-[10px] w-[16px]`} />}
          </span>
        ))}
      </nav>
      <div className={`anim-skeleton flex flex-col gap-[12px] ${px} pb-[24px] pt-[14px]`}>
        {tab === "deck" || tab === "consider" ? (
          <>
            {wide ? (
              <div className="flex items-center gap-[10px]">
                <span className={`${SH} h-[46px] w-[480px]`} /><span className="flex-1" />
                <span className={`${SH} h-[46px] w-[130px]`} /><span className={`${SH} h-[46px] w-[230px]`} /><span className={`${SH} h-[46px] w-[150px]`} /><span className={`${SH} h-[46px] w-[90px]`} />
              </div>
            ) : (
              <>
                <span className={`${SH} h-[50px] w-full`} />
                <div className="flex justify-between"><span className={`${SH} h-[44px] w-[116px]`} /><span className={`${SH} h-[44px] w-[96px]`} /></div>
              </>
            )}
            <span className={`${BAR} mt-[8px] h-[13px] w-[110px]`} />
          </>
        ) : null}
        <Rows n={wide ? 6 : 9} />
      </div>
    </div>
  );
}

/** The band at its shipped height on the sunken ground, then what sits under it, drawn once per width. */
function Header({ wide }: { wide: boolean }) {
  const strip = (
    <nav aria-label={deckFlipCopy.region} className={`flex w-full items-center justify-between ${wide ? "min-h-[36px]" : "min-h-[44px]"}`}>
      <Link href="/decks" className={`flex min-h-[44px] items-center gap-[6px] text-[color:var(--fg-body)] ${wide ? "text-[14px]" : "text-[15px]"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        <span>{deckFlipCopy.allDecks}</span>
        <PendingReporter href="/decks" />
      </Link>
    </nav>
  );
  if (wide) {
    return (
      <div aria-hidden={undefined} className="hidden md:block">
        <div className="relative anim-skeleton bg-[color:var(--surface-sunken)]" style={{ minHeight: 288, borderBottom: "1px solid var(--border)" }}>
          <div className="absolute flex flex-col gap-[10px]" style={{ left: 592, bottom: 24 }}>
            <span className={`${BAR} h-[30px] w-[320px]`} />
            <span className={`${BAR} h-[14px] w-[240px]`} />
            <span className={`${BAR} h-[29px] w-[88px]`} />
            <span className={`${BAR} h-[10px] w-[260px]`} />
          </div>
        </div>
        <div className="flex" style={{ borderBottom: "1px solid var(--border)", padding: "6px 24px" }}>{strip}</div>
      </div>
    );
  }
  return (
    <div className="md:hidden">
      <div className="anim-skeleton bg-[color:var(--surface-sunken)]" style={{ height: 288 }}>
        <div className="flex h-full flex-col justify-end gap-[10px] px-[18px] pb-[12px]">
          <span className={`${BAR} h-[26px] w-[62%]`} />
          <span className={`${BAR} h-[14px] w-[48%]`} />
          <span className={`${BAR} h-[29px] w-[84px]`} />
        </div>
      </div>
      <div className="flex flex-col items-center" style={{ borderTop: "1px solid var(--border)", padding: "14px 16px 12px", gap: 8 }}>
        {strip}
        <div aria-hidden className="anim-skeleton flex w-full items-center" style={{ gap: 10 }}>
          <span className="h-[6px] min-w-0 flex-1 rounded-full bg-[color:var(--elevated)]" />
          <span className={`${BAR} h-[18px] w-[56px]`} />
        </div>
        <span aria-hidden className={`anim-skeleton ${SH} h-[44px] w-[260px]`} />
      </div>
    </div>
  );
}

export function DeckOpenLoading() {
  const params = useSearchParams();
  const raw = params.get(TAB_PARAM);
  const tab = TABS.some((t) => t.id === raw) ? (raw as string) : "deck";
  return (
    <div data-loading-screen>
      <span role="status" className="sr-only">{deckOpenLoadingCopy.status}</span>
      <StallWatch />
      <Header wide={false} />
      <Header wide />
      <Body wide={false} tab={tab} />
      <Body wide tab={tab} />
    </div>
  );
}
