"use client";
// The confirm for a partner from outside the deck (#491): Change commander's confirm, with the card that
// leaves chosen on Suggested changes' Pick line. The write is `changeCommander` with the cut; the Undo that
// follows is the provider's toast.

import { useEffect, useMemo, useState } from "react";
import { BuyTag } from "./buy-tag";
import { DeckSearchField } from "./deck-filter-column";
import { SuggestedChangesPickLine } from "./suggested-changes-pick-line";
import { Plate, shortName } from "./change-commander-sheet";
import { MatchedPlate, pipsOf, widenedIdentity } from "./partner-add-section";
import { useChangeCommander } from "./change-commander-context";
import { SteadyLabel } from "../ui/steady-label";
import { CostPips } from "../ui/cost-pips";
import { Chevron } from "../ui/chevron";
import { GhostButton, PrimaryButton } from "../ui/button";
import { SheetGroupHeading } from "../ui/sheet-group";
import { changeCommander, readOpenedCards } from "../../lib/commander-change/actions";
import type { OpenedCard } from "../../lib/commander-change/opened-cards";
import type { ChangeCandidates } from "../../lib/commander-change/candidates";
import type { PartnerOption } from "../../lib/commander-change/partner-add";
import { changeCommanderCopy as cc } from "../../lib/copy/change-commander";
import { partnerAddCopy as copy } from "../../lib/copy/partner-add";
import { guildLabel } from "../../lib/copy/color-labels";
import type { LineItem } from "../../lib/tuning/state";

type Cut = { oracleId: string; name: string; imageUri: string | null };

/** A cut drawn on the Pick line: the card, and the one reason it is offered (none for a card the reader searched for). */
function cutLine(card: Cut, reason: string, position: number): LineItem {
  return {
    side: "cut", id: `partner-add-cut:${card.oracleId}`, cardOracleId: card.oracleId, cardName: card.name,
    cardTypeLine: "", cardImageUri: card.imageUri, rationale: reason, rationaleShort: reason, evidence: [], position,
    verdict: "pending", owned: true, ownedQuantity: 1, availability: null, price: null, bracketAfter: null,
    applies: true, inDeck: true, locked: false,
  };
}

const SEARCH_SHOWN = 6;

export function PartnerAddConfirm({
  deckId, data, option, hasVersion, onBack, onDone,
}: {
  deckId: string;
  data: ChangeCandidates;
  option: PartnerOption;
  hasVersion: boolean;
  onBack: () => void;
  onDone: () => void;
}) {
  const door = useChangeCommander();
  const add = data.partnerAdd!;
  const [commanderHalf, partner] = option.halves;
  const commanderShort = shortName(commanderHalf.name);
  const partnerShort = shortName(partner.name);
  const pairName = `${commanderShort} and ${partnerShort}`;
  const [writing, setWriting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const needsCut = add.needsCut;
  // The first suggestion is the default; a deck with none takes the first card of the pool.
  const [pickedId, setPickedId] = useState<string | null>(needsCut ? (option.cuts[0]?.oracleId ?? add.cutPool[0]?.oracleId ?? null) : null);
  const picked = add.cutPool.find((c) => c.oracleId === pickedId) ?? option.cuts.find((c) => c.oracleId === pickedId) ?? null;

  const widens = option.opens.length > 0 ? widenedIdentity(data.identity, option.opens) : null;
  const opensColors = option.opens.length > 0 ? guildLabel(option.opens) : "";
  const [opened, setOpened] = useState<OpenedCard[] | null>(null);
  const [showOpened, setShowOpened] = useState(false);
  useEffect(() => {
    if (option.opens.length === 0) return;
    let live = true;
    readOpenedCards(deckId, partner.oracleId)
      .then((r) => { if (live) setOpened(r?.cards ?? []); })
      .catch(() => { if (live) setOpened([]); });
    return () => { live = false; };
  }, [deckId, partner.oracleId, option.opens.length]);

  const reason = (kind: "land" | "card") =>
    kind === "land"
      ? copy.confirm.reasonLands(add.lands, add.landCeiling)
      : option.hasPairRow ? copy.confirm.reasonUnplayed(pairName) : copy.confirm.reasonUnplayedEither(commanderShort, partnerShort);
  const suggested = useMemo(() => option.cuts.map((c, i) => cutLine(c, reason(c.kind), i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [option.cuts, option.hasPairRow, add.lands, add.landCeiling]);
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return add.cutPool.filter((c) => c.name.toLowerCase().includes(q)).slice(0, SEARCH_SHOWN).map((c, i) => cutLine(c, copy.confirm.reasonPicked, i));
  }, [query, add.cutPool]);
  const lines = found ?? (suggested.length > 0 ? suggested : picked ? [cutLine(picked, copy.confirm.reasonPicked, 0)] : []);

  const fate = partner.owned ? <>{cc.sheet.free}</> : <BuyTag variant="row" price={partner.price} newestAsOf={data.newestAsOf} />;
  const sentence = needsCut && picked
    ? copy.confirm.sentence(partnerShort, commanderShort, shortName(picked.name))
    : copy.confirm.sentenceRoom(partnerShort, commanderShort, add.bodyTotal + 2);
  const note = !hasVersion
    ? copy.confirm.brew
    : needsCut && picked ? copy.confirm.lands(shortName(picked.name), commanderShort) : copy.confirm.landsRoom(partnerShort, commanderShort);

  const make = async () => {
    if (writing || (needsCut && !picked)) return;
    setWriting(true);
    setFailed(false);
    try {
      const cutId = needsCut ? picked!.oracleId : null;
      const result = await changeCommander(deckId, { commanderOracleId: commanderHalf.oracleId, partnerOracleId: partner.oracleId }, null, cutId);
      if (!result.ok) {
        setFailed(true);
        return;
      }
      door?.announce(copy.confirm.announced(partnerShort, commanderShort));
      door?.partnerAdded({
        stays: commanderHalf.oracleId, partner: partner.oracleId, cut: cutId,
        names: { stays: commanderShort, partner: partnerShort, cut: picked && needsCut ? shortName(picked.name) : null },
      });
      onDone();
    } catch {
      setFailed(true);
    } finally {
      setWriting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-[16px]">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-[44px] items-center gap-[7px] self-start font-mono text-[11px] text-[color:var(--fg-faint)]"
      >
        {cc.confirm.back}
      </button>
      <div className="flex items-start justify-center gap-[14px] pt-[4px] pb-[2px]">
        {needsCut && picked ? (
          <>
            <Plate
              cards={[{ oracleId: picked.oracleId, name: picked.name, imageUri: picked.imageUri, manaCost: null }]}
              label={cc.confirm.out}
              tone="out"
              pair={false}
            />
            <span aria-hidden="true" className="mt-[-30px] flex-none self-center font-mono text-[18px]" style={{ color: "var(--fg-faint)" }}>→</span>
          </>
        ) : null}
        <Plate
          cards={[commanderHalf, partner].map((h) => ({ oracleId: h.oracleId, name: h.name, imageUri: h.imageUri, manaCost: h.manaCost }))}
          label={cc.confirm.inPair}
          tone="in"
          pair
          fates={[<>{copy.confirm.stays}</>, fate]}
        />
      </div>
      <div className="flex flex-col gap-[9px] pt-[12px]" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-[14px] leading-[1.6] text-pretty" style={{ color: "var(--fg)" }}>{sentence}</p>
        {!partner.owned ? (
          <div className="flex flex-wrap items-center gap-[8px] text-[13px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
            <span>{cc.confirm.buy(partnerShort)}</span>
            <BuyTag variant="row" price={partner.price} newestAsOf={data.newestAsOf} />
          </div>
        ) : null}
        {widens ? (
          <div className="flex flex-col gap-[2px]">
            <span className="inline-flex flex-wrap items-center gap-[8px] text-[13px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
              <CostPips cost={pipsOf(widens)} size={13} className="flex flex-none items-center gap-[3px]" />
              {copy.confirm.widens(guildLabel(widens))}
            </span>
            {opened === null ? (
              <span role="status" className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>{copy.confirm.opensLoading}</span>
            ) : opened.length > 0 ? (
              <>
                <button
                  type="button"
                  aria-expanded={showOpened}
                  aria-controls="partner-add-opened"
                  aria-label={copy.confirm.opensAria(opened.length, opensColors)}
                  onClick={() => setShowOpened((v) => !v)}
                  className="relative inline-flex h-[36px] cursor-pointer items-center gap-[7px] self-start font-mono text-[12px] text-[color:var(--fg-body)] after:absolute after:-inset-y-[4px] after:inset-x-0"
                >
                  <span style={{ borderBottom: "1px dotted var(--fg-faint)" }}>{copy.confirm.opens(opened.length, opensColors)}</span>
                  <Chevron kind="disclosure" open={showOpened} style={{ color: "var(--fg-faint)" }} />
                </button>
                {showOpened ? <MatchedPlate id="partner-add-opened" caption={copy.confirm.opensCaption(opensColors)} cards={opened} /> : null}
              </>
            ) : (
              <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>{copy.confirm.opensNone(opensColors)}</span>
            )}
          </div>
        ) : null}
      </div>
      {needsCut ? (
        <section className="flex flex-col gap-[8px]">
          <SheetGroupHeading as="h3" label={copy.confirm.cutHeading} note={found ? "" : copy.confirm.cutNote} />
          {lines.map((item) => (
            <SuggestedChangesPickLine
              key={item.id}
              item={item}
              permits={[]}
              newestPriceAsOf={null}
              picked={item.cardOracleId === pickedId}
              off={false}
              onToggle={() => setPickedId(item.cardOracleId)}
              aim={null}
            />
          ))}
          {found && found.length === 0 ? (
            <p className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{copy.confirm.anotherNone(query.trim())}</p>
          ) : null}
          <div className="flex flex-col gap-[6px] pt-[4px]">
            <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{copy.confirm.another}</span>
            <DeckSearchField size="sheet" value={query} onChange={setQuery} placeholder={copy.confirm.anotherPlaceholder} label={copy.confirm.another} />
          </div>
        </section>
      ) : null}
      <p className="font-mono text-[10.5px] leading-[1.6] text-pretty" style={{ color: "var(--fg-faint)" }}>{note}</p>
      <div className="mt-auto flex flex-col gap-[8px] md:mt-0 md:flex-row md:items-center md:gap-[10px] md:pt-[4px]">
        <PrimaryButton
          className={"min-h-[44px] rounded-[8px] px-[20px] text-[14px]" + (writing ? " opacity-60" : "")}
          onClick={make}
          aria-busy={writing}
        >
          <SteadyLabel hold={[cc.confirm.pending, cc.confirm.failedRetry, cc.confirm.ctaPair(commanderShort, partnerShort)]}>
            {writing ? cc.confirm.pending : failed ? cc.confirm.failedRetry : cc.confirm.ctaPair(commanderShort, partnerShort)}
          </SteadyLabel>
        </PrimaryButton>
        <GhostButton
          className="min-h-[44px] rounded-[8px] px-[18px] text-[13.5px] font-medium text-[color:var(--fg-muted)]"
          onClick={onBack}
        >
          {cc.confirm.backList}
        </GhostButton>
      </div>
      {failed ? (
        <p role="alert" className="font-mono text-[11px] leading-[1.55]" style={{ color: "var(--danger)" }}>
          {cc.confirm.failed(commanderShort)}
        </p>
      ) : null}
    </div>
  );
}
