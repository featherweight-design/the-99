"use client";

// What `/decks/[id]` draws while the deck loads (handoff `design_handoff_the99_deck_flip_skeleton`, option B): the page's own
// shape, not the crown screen. The band is its shipped height on a sunken ground (with the commander's art once a press has left the facts), the strip row keeps its real
// `‹ All decks` link, the tab row is real words with the kept tab underlined, and everything else is a shape. It carries
// `StallWatch` and `data-loading-screen` as `LoadingScreen` does, so a deck stuck here is reported like any other loading screen.

import { useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { addPanelCopy, deckHeaderCopy, overCopy } from "../../lib/copy/decks-builder";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { PrimaryButton, GhostButton } from "../ui/button";
import { InertFlipSquares } from "./deck-flip-strip";
import { InertChangeCommanderDoor } from "./change-commander-door-inert";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { deckFlipCopy, deckOpenLoadingCopy } from "../../lib/copy/deck-flip";
import { gameLogCopy } from "../../lib/copy/game-log";
import { TAB_PARAM, drawnView, type BuilderView } from "../../lib/decks/builder-view";
import { StallWatch } from "../shell/nav-stall";
import { PendingReporter } from "../shell/pending-reporter";
import { BAR } from "../ui/tile-skeleton";
import Link from "next/link";
import { ArtWash, BlockScrim, COVER_INK_SHADOW } from "../ui/art-wash";
import { DeckIntentLine } from "./deck-intent-line";
import { TRUNCATES } from "./truncates";
import { colorLabel } from "../../lib/decks/format";
import { DECK_COMMANDER_SIZE, DECK_TITLE, DECK_TITLE_CLASS, PHONE_BLOCK_CLASS, PHONE_BLOCK_INSET_X, phoneBlockStyle } from "./deck-header-type";
import { deckBodySize } from "../../lib/decks/deck-size";
import { statusBarStyle } from "../../lib/decks/status-style";
import { DeckHeaderArt, DECK_HEADER_LABEL_INSET } from "./deck-header-art";
import { IdentityPips } from "../commanders/commander-art";
import { StatusPillBadge } from "./status-pill";
import { parseOpenEntry, readOpenRaw, type HeaderFacts, type LeanOpenFacts, type OpenPlace } from "../../lib/decks/open-entry";

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

/**
 * The phone label block, drawn as the loaded header draws it (`spine-mobile`): the same block geometry and ramp (`BlockScrim`),
 * the inline title with the rename glyph's room, the tagline row, the commander line and the chips row. The controls that arrive
 * with the page (the pencil, the bracket chip, the notice tag) are not drawn inert; their room is, so nothing moves.
 */
function PhoneLabel({ facts }: { facts: HeaderFacts }) {
  return (
    <div data-wash-label className={PHONE_BLOCK_CLASS} style={phoneBlockStyle(6)}>
      <BlockScrim insetX={PHONE_BLOCK_INSET_X} />
      <div className="w-full" style={{ maxWidth: "100%", textAlign: "left" }}>
        <h1
          className={`m-0 min-w-0 ${DECK_TITLE_CLASS}`}
          style={{ display: "inline", overflowWrap: "anywhere", ...DECK_TITLE.phone, textAlign: "left", color: "var(--fg)", textShadow: COVER_INK_SHADOW }}
        >
          <span data-deck-title>{facts.name}</span>
        </h1>
        {"\u00a0"}
        <span className="relative inline-flex" style={{ width: 14, verticalAlign: "baseline" }} />
      </div>
      <DeckIntentLine intent={facts.intent ?? null} width="phone" />
      <div data-spine-meta className="flex w-full min-w-0 flex-nowrap items-center justify-start" style={{ gap: 8 }}>
        <IdentityPips colorIdentity={facts.identity} size={10} />
        <span
          className="font-mono flex"
          style={{ fontSize: DECK_COMMANDER_SIZE.phone, color: "var(--fg-body)", textShadow: COVER_INK_SHADOW, gap: 4, minWidth: 0, overflow: "hidden", alignItems: "baseline" }}
        >
          <span style={TRUNCATES}>{facts.commander}</span>
          {facts.partnerName ? (
            <>
              <span style={{ flex: "none" }}>+</span>
              <span style={{ ...TRUNCATES, flexShrink: 1000, fontSize: 10, color: "inherit", textShadow: COVER_INK_SHADOW }}>
                <span style={{ borderBottom: "1px solid var(--border-strong)" }}>{facts.partnerName}</span>
              </span>
            </>
          ) : (
            <span style={{ flex: "none", whiteSpace: "nowrap" }}>&nbsp;· {colorLabel(facts.identity)}</span>
          )}
        </span>
      </div>
      <div data-spine-chips className="@container flex w-full flex-wrap items-center" style={{ gap: 8 }}>
        {facts.status ? <StatusPillBadge status={facts.status} className="flex h-[22px] flex-none items-center rounded-[6px] px-[7px] font-mono text-[10px]" /> : <span aria-hidden className={`anim-skeleton ${BAR} h-[22px] w-[64px]`} />}
      </div>
    </div>
  );
}

/**
 * Skeleton A: the shipped band fed from the facts the press carried. The commander's crop (the shipped no-crop band when the deck
 * has none), the name, the tagline, colours and commander line, and the status chip. On a phone the label is the loaded header's
 * own block (`PhoneLabel`). The actions, the bracket chip and the notice tag arrive with the page, so none is drawn inert here.
 */
function FactsHeader({ wide, facts, strip }: { wide: boolean; facts: HeaderFacts; strip: React.ReactNode }) {
  // The page header's own type (`deck-header-type`), so the title and the commander line do not jump when the page lands.
  const size = deckBodySize(facts.partner);
  const label = (
    <div className="flex min-w-0 flex-1 basis-[280px] flex-col">
      <div className="flex items-center">
        <h1 className={`flex min-w-0 items-end ${DECK_TITLE_CLASS}`} style={{ ...DECK_TITLE.desktop, color: "var(--fg)", margin: 0 }}>
          <span data-deck-title className="min-w-0" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{facts.name}</span>
        </h1>
        <span className="inline-flex flex-none self-center" style={{ width: 14, marginLeft: 6 }} />
      </div>
      <DeckIntentLine intent={facts.intent ?? null} width="desktop" />
      <div data-spine-meta className="flex flex-wrap items-center" style={{ gap: 10, marginTop: 3, minWidth: 0 }}>
        <IdentityPips colorIdentity={facts.identity} size={10} />
        <span className="font-mono flex" style={{ fontSize: DECK_COMMANDER_SIZE.desktop, color: "var(--fg-body)", gap: 5, minWidth: 0, overflow: "hidden", alignItems: "baseline" }}>
          <span style={TRUNCATES}>{facts.commander}</span>
          {facts.partnerName ? (
            <>
              <span style={{ flex: "none" }}>+</span>
              <span style={{ ...TRUNCATES, flexShrink: 1000, fontSize: 11, color: "var(--fg-body)", borderBottom: "1px solid var(--border-strong)" }}>{facts.partnerName}</span>
            </>
          ) : null}
          <span style={{ flex: "none" }}>· {colorLabel(facts.identity)}</span>
        </span>
      </div>
      <div data-spine-chips className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 8 }}>
        {facts.status ? <StatusPillBadge status={facts.status} className="flex flex-none items-center rounded-[6px] px-[8px] py-[3px] font-mono text-[11px]" /> : <span aria-hidden className={`anim-skeleton ${BAR} h-[24.5px] w-[72px]`} />}
      </div>
      <div className="flex items-center" style={{ gap: 10, marginTop: 9 }}>
        <div className="min-w-0 flex-1" style={{ maxWidth: 170, height: 6, borderRadius: 999, background: "var(--elevated)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)", overflow: "hidden" }}>
          {facts.status !== null && facts.built !== null ? <div className="h-full" style={statusBarStyle(facts.status, facts.built, size)} /> : null}
        </div>
        <div data-spine-count className="flex flex-none items-baseline" style={{ gap: 4 }}>
          {facts.built !== null ? <span className="font-mono font-semibold" style={{ fontSize: 15, color: "var(--fg)" }}>{facts.built}</span> : <span aria-hidden className="font-mono font-semibold" style={{ fontSize: 15, visibility: "hidden" }}>0</span>}
          <span className="font-mono" style={{ fontSize: 13, color: "var(--fg-faint)" }}>{overCopy.figure.denominator(size)}</span>
        </div>
      </div>
    </div>
  );
  // The loaded header's action column, drawn inert: the same buttons in the same boxes (`spine-desktop`), disabled so none is
  // focusable or pressable until the page lands. The commit offer, when the deck has one, arrives with the page.
  const actions = (
    <div className="min-w-0 shrink-[4] grow-0 basis-auto" aria-hidden="true" data-inert-actions>
      <div className="flex flex-wrap items-center justify-end" style={{ gap: 9 }}>
        {facts.built !== null && facts.built > 0 ? (
          <GhostButton disabled tabIndex={-1} className="flex h-[32px] items-center px-[14px] font-sans text-[12.5px]">{deckImportCopy.update.entryLabel}</GhostButton>
        ) : null}
        {facts.built === null ? (
          <span aria-hidden className={`anim-skeleton ${BAR} h-[32px] w-[68.5px]`} />
        ) : facts.built === 0 ? (
          <button
            type="button"
            disabled
            tabIndex={-1}
            className="flex h-[32px] items-center gap-[6px] rounded-[8px] border border-[color:var(--border)] bg-transparent px-[14px] font-sans text-[12.5px] font-semibold text-[color:var(--fg-faint)]"
            style={{ cursor: "not-allowed" }}
          >
            {deckHeaderCopy.export}
          </button>
        ) : (
          <PrimaryButton disabled tabIndex={-1} className="flex h-[32px] items-center gap-[6px] px-[14px] text-[12.5px]">{deckHeaderCopy.export}</PrimaryButton>
        )}
        <button
          type="button"
          disabled
          tabIndex={-1}
          className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] border border-[color:var(--border-strong)] bg-transparent p-0 font-mono text-[13px] tracking-[1px] text-[color:var(--fg-body)]"
        >
          …
        </button>
      </div>
    </div>
  );
  if (wide) {
    return (
      <div className="@container hidden md:block">
        <div className="relative bg-[color:var(--surface-sunken)]" style={{ minHeight: 288, borderBottom: "1px solid var(--border)" }}>
          <DeckHeaderArt artCropUri={facts.artCropUri} colorIdentity={facts.artIdentity ?? facts.identity} />
          <InertChangeCommanderDoor width="desktop" hasCrop={Boolean(facts.artCropUri)} pair={facts.partner} />
          <div className={`relative flex min-h-[288px] items-end ${DECK_HEADER_LABEL_INSET}`} style={{ paddingRight: 24, paddingBottom: 18, gap: 18 }}>{label}{actions}</div>
        </div>
        <div className="flex" style={{ borderBottom: "1px solid var(--border)", padding: "6px 24px" }}>{strip}</div>
      </div>
    );
  }
  return (
    <div className="md:hidden">
      <div className="relative overflow-hidden bg-[color:var(--surface-sunken)]" style={{ height: 288 }}>
        <ArtWash strategy="cover" height={288} labelAtPx="block" artCropUri={facts.artCropUri} colorIdentity={facts.artIdentity ?? facts.identity} />
        <PhoneLabel facts={facts} />
        <InertChangeCommanderDoor width="mobile" hasCrop={Boolean(facts.artCropUri)} pair={facts.partner} />
      </div>
      <div className="flex flex-col items-center" style={{ borderTop: "1px solid var(--border)", padding: "14px 16px 12px", gap: 8 }}>
        {strip}
        <div className="flex w-full items-center" style={{ gap: 10 }}>
          <div className="min-w-0 flex-1" style={{ height: 6, borderRadius: 999, background: "var(--elevated)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)", overflow: "hidden" }}>
            {facts.status !== null && facts.built !== null ? <div className="h-full" style={statusBarStyle(facts.status, facts.built, size)} /> : null}
          </div>
          <div data-spine-count className="flex flex-none items-baseline" style={{ gap: 4 }}>
            {facts.built !== null ? <span className="font-mono font-semibold" style={{ fontSize: 14, color: "var(--fg)" }}>{facts.built}</span> : <span aria-hidden className="font-mono font-semibold" style={{ fontSize: 14, visibility: "hidden" }}>0</span>}
            <span data-spine-denominator className="font-mono" style={{ fontSize: 14, color: "var(--fg-faint)" }}>{overCopy.figure.denominator(size)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The band at its shipped height on the sunken ground, then what sits under it, drawn once per width. */
function Header({ wide, facts, place }: { wide: boolean; facts: HeaderFacts | null; place: OpenPlace | null }) {
  const strip = (
    <nav aria-label={deckFlipCopy.region} className={`flex w-full items-center justify-between ${wide ? "min-h-[36px]" : "min-h-[44px]"}`}>
      <Link href="/decks" className={`flex min-h-[44px] items-center gap-[6px] text-[color:var(--fg-body)] ${wide ? "text-[14px]" : "text-[15px]"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        <span>{place?.caption ?? deckFlipCopy.allDecks}</span>
        <PendingReporter href="/decks" />
      </Link>
      {place && (
        <div className="flex items-center gap-[8px]">
          <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{deckFlipCopy.place(place.k, place.n)}</span>
          <InertFlipSquares width={wide ? "desktop" : "phone"} />
        </div>
      )}
    </nav>
  );
  if (facts) return <FactsHeader wide={wide} facts={facts} strip={strip} />;
  if (wide) {
    return (
      <div aria-hidden={undefined} className="@container hidden md:block">
        <div className="relative anim-skeleton bg-[color:var(--surface-sunken)]" style={{ minHeight: 288, borderBottom: "1px solid var(--border)" }}>
        </div>
        <div className="flex" style={{ borderBottom: "1px solid var(--border)", padding: "6px 24px" }}>{strip}</div>
      </div>
    );
  }
  return (
    <div className="md:hidden">
      <div className="anim-skeleton bg-[color:var(--surface-sunken)]" style={{ height: 288 }}>
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

const noopSubscribe = () => () => {};
const serverNull = () => null;

/**
 * `lean` is a direct load's header facts (`readDeckOpenFacts`), which the deck page passes once it has them: the name, tagline and
 * commander line are placed once, and the two stats a press carries stay shapes until the page lands. Without it and without a
 * press entry the band draws its art ground alone, no text shapes, so the first flush has no line to place twice.
 */
export function DeckOpenLoading({ lean }: { lean?: LeanOpenFacts }) {
  const params = useSearchParams();
  const id = usePathname().split("/").filter(Boolean)[1];
  // A press wrote this deck's header facts (`open-entry`); a skeleton for any other deck, or for an entry older than a minute, draws its shapes alone.
  // The server snapshot is absent, so the server and the first hydration draw shapes; a client navigation reads the entry at once.
  const raw = useSyncExternalStore(noopSubscribe, readOpenRaw, serverNull);
  const [now] = useState(Date.now);
  const parsed = parseOpenEntry(raw, now);
  const entry = parsed && parsed.to === id ? parsed : null;
  const facts: HeaderFacts | null = entry?.facts ?? (lean ? { ...lean, status: null, built: null } : null);
  const place = entry?.place ?? null;
  // `?tab=tuning` opens Analysis until tool discovery B2 draws the Tuning tab, so the skeleton draws what the page will.
  const rawTab = params.get(TAB_PARAM);
  const wanted = rawTab === null ? null : drawnView(rawTab as BuilderView);
  const tab = TABS.some((t) => t.id === wanted) ? (wanted as string) : "deck";
  return (
    <div data-loading-screen>
      <span role="status" className="sr-only">{facts ? deckOpenLoadingCopy.opening(facts.name) : deckOpenLoadingCopy.status}</span>
      <StallWatch />
      <Header wide={false} facts={facts} place={place} />
      <Header wide facts={facts} place={place} />
      <Body wide={false} tab={tab} />
      <Body wide tab={tab} />
    </div>
  );
}
