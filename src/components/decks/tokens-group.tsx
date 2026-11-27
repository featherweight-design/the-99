"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tokensCopy } from "../../lib/copy/tokens";
import { PendingReporter } from "../shell/pending-reporter";
import { useStoredView } from "../ui/use-stored-view";
import { useDeckTokens } from "./deck-tokens-context";
import { consumeLandingRequest, landingRequestedRecently, SHOW_DECK_TOKENS } from "./deck-tokens-landing";
import { DECK_VIEW_KEY, isDeckView } from "./group-toggle";
import { HoverPreviewProvider } from "./hover-preview";
import { DecklistGroupHeader } from "./decklist-group-header";
import { TokenRow } from "./token-row";
import { TokenTile } from "./token-tile";
import { ArrivalOrder } from "../ui/arrival-queue";
import { Chevron } from "../ui/chevron";
import { HydratedImg } from "../ui/hydrated-art";
import { BAND_GROUND, BAND_HEIGHT, BAND_RULE, DeckBox, DeckBoxFoot } from "./deck-box";

const HEADING = "deck-tokens-heading";
const PANEL = "deck-tokens-panel";

/**
 * Whether the Tokens group is folded: one preference for every deck, as the deck's view is ("I keep tokens
 * folded" is a fact about the reader, not about a deck). Open until this browser says otherwise.
 */
export const TOKENS_FOLD_KEY = "the99:deck-tokens-fold";
const isFold = (value: string): value is "open" | "closed" => value === "open" || value === "closed";

/** How many token pictures the folded band fans. The count beside the title always says how many there are. */
const FAN_MAX = 4;

/**
 * The tokens this deck's cards make, at the foot of Your deck, in a deck box (the Announced group's folding band
 * over the list). They are not the deck: the box says so once, and nothing here moves a count, a price total or the deck's status. Draws nothing outside a
 * provider, for a deck that makes no token, and nothing at all before the catalog has
 * links, so a deck page without the feature is exactly the page it was. The heading folds the group, and
 * the tokens are tiles in the deck's Card view and rows in its List view.
 */
export function TokensGroup() {
  const ctx = useDeckTokens();
  const [fold, chooseFold] = useStoredView(TOKENS_FOLD_KEY, isFold);
  // The deck's own view, from the same stored choice the list reads.
  const [storedView] = useStoredView(DECK_VIEW_KEY, isDeckView);
  const cards = storedView === "card";
  // `Tokens ›` from card details opens a folded group for this visit, without writing the reader's preference. A
  // group that mounts in answer to it (the request came from Shopping or another panel, where it was absent) asks
  // whether one is still fresh.
  const [landed, setLanded] = useState(() => landingRequestedRecently());
  useEffect(() => {
    // Answered once, whichever way it arrived (mounted before the request, or in answer to it).
    consumeLandingRequest();
    const land = () => {
      setLanded(true);
      consumeLandingRequest();
    };
    window.addEventListener(SHOW_DECK_TOKENS, land);
    return () => window.removeEventListener(SHOW_DECK_TOKENS, land);
  }, []);
  if (!ctx || ctx.read.status === "absent") return null;
  const { deckId, read } = ctx;

  if (read.status === "failed") {
    return (
      <section aria-labelledby={HEADING} className="mt-[16px] md:mt-[20px]">
        <DecklistGroupHeader label={tokensCopy.group.label} count={null} note={tokensCopy.group.noteFailed} headingId={HEADING} focusable />
        <p className="m-0 mb-[2px] font-mono text-[10.5px] text-[color:var(--fg-locked)] md:hidden">{tokensCopy.group.noteFailed}</p>
        <p className="m-0 py-[10px] font-mono text-[11px] text-[color:var(--fg-locked)]">{tokensCopy.group.failed}</p>
      </section>
    );
  }

  const open = landed || fold !== "closed";
  const note = tokensCopy.group.note(read.makerCount);
  const siblings = read.tokens.map((t) => ({ oracleId: t.oracleId, name: t.name, imageUri: t.picture?.imageUri ?? null }));
  // The band names itself as the plain header did: the label and the count, without the note.
  const name = `${tokensCopy.group.label} · ${read.tokens.length}`;
  const onToggle = () => {
    setLanded(false);
    chooseFold(open ? "closed" : "open");
  };
  // Folded, the band shows what it holds: the tokens' own art, fanned at card shape. No pictures, no fan.
  const fan = open ? [] : read.tokens.filter((t) => t.picture?.imageUriSmall).slice(0, FAN_MAX);
  return (
    <DeckBox aria-labelledby={HEADING} className="!mt-[18px] md:!mt-[24px]" data-tokens-box="">
      <h3 id={HEADING} tabIndex={-1} aria-label={name} className="m-0 font-normal">
        <button
          type="button"
          aria-label={name}
          aria-expanded={open}
          aria-controls={open ? PANEL : undefined}
          onClick={onToggle}
          className={`flex ${BAND_HEIGHT} w-full cursor-pointer items-center gap-[10px] border-0 py-[8px] pl-[14px] pr-[10px] text-left md:pl-[16px] md:pr-[14px] ${BAND_GROUND} ${open ? BAND_RULE : ""}`}
        >
          <span className="flex min-w-0 flex-col">
            <span>
              <span aria-hidden className="mr-[8px] text-[color:var(--accent-text)]">◆</span>
              {tokensCopy.group.label}
              <span className="ml-[8px] font-mono text-[11px] font-medium tracking-[.08em] text-[color:var(--accent-text)]">{read.tokens.length}</span>
            </span>
            {/* The phone has no right-hand note: it reads as a sub-line under the title. */}
            <span className="font-mono text-[10.5px] font-normal leading-[1.5] text-[color:var(--fg-locked)] md:hidden">{note}</span>
          </span>
          <span className="ml-auto hidden font-mono text-[10.5px] font-normal text-[color:var(--fg-locked)] md:inline">{note}</span>
          {fan.length > 0 ? (
            <span aria-hidden className="ml-auto flex flex-none items-center pl-[4px] md:ml-[6px]">
              {fan.map((t, i) => (
                <HydratedImg
                  key={t.oracleId}
                  eager
                  src={t.picture!.imageUriSmall!}
                  className="h-[38px] w-[27px] flex-none rounded-[2px] object-cover shadow-[0_2px_6px_rgba(0,0,0,0.45)] [border:1px_solid_var(--border-strong)] md:h-[36px] md:w-[26px]"
                  style={{ marginLeft: i ? -11 : 0, transform: `rotate(${(i - (fan.length - 1) / 2) * 7}deg)`, zIndex: fan.length - i }}
                />
              ))}
            </span>
          ) : null}
          <Chevron kind="disclosure" open={open} className={`${fan.length === 0 ? "ml-auto md:ml-[6px]" : "ml-[2px]"} flex-none text-[color:var(--fg-muted)]`} />
        </button>
      </h3>
      {open ? (
        <div id={PANEL} className="px-[12px] py-[12px] md:px-[14px] md:py-[14px]">
          <HoverPreviewProvider>
            {/* One reading order for the tokens' art, rows or tiles (`ArrivalOrder`). */}
            <ArrivalOrder>
              {cards ? (
                // The deck's own Card view declaration (`DecklistGroup`): the column count falls out of the width.
                <ul className="m-0 grid list-none grid-cols-2 items-stretch gap-[12px] p-0 md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))] md:gap-[20px]">
                  {read.tokens.map((t) => (
                    <TokenTile key={t.oracleId} deckId={deckId} token={t} siblings={siblings} />
                  ))}
                </ul>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
                  {read.tokens.map((t) => (
                    <TokenRow key={t.oracleId} deckId={deckId} token={t} newestAsOf={read.newestPriceAsOf} siblings={siblings} />
                  ))}
                </ul>
              )}
            </ArrivalOrder>
          </HoverPreviewProvider>
        </div>
      ) : null}
      {/* The collection was never read: the prompt is the box's foot band, shown only while the box is open. */}
      {open && !read.read ? (
        <DeckBoxFoot>
          <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{tokensCopy.unknown.body}</p>
          <Link href="/collection" className="inline-flex min-h-[44px] items-center text-[13px] text-[color:var(--accent-text)] md:min-h-[30px]">
            {tokensCopy.unknown.action}
            <PendingReporter href="/collection" />
          </Link>
        </DeckBoxFoot>
      ) : null}
    </DeckBox>
  );
}
