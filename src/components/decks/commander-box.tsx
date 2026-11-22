"use client";
// Second commander (#491): the box the deck's single commander draws on its card details, after the card's facts.
// One line naming the ability and a button that closes the card and opens Change commander, whose Add a partner
// section sits first in the list. Registered once from the deck page, so a card opened anywhere else draws none.

import { useEffect } from "react";
import { useCardDetail } from "../cards/card-detail-provider";
import { partnerAddCopy } from "../../lib/copy/partner-add";
import { shortName } from "../../lib/cards/short-name";
import { GhostButton } from "../ui/button";
import { useChangeCommander } from "./change-commander-context";
import { Sheet } from "./change-commander-door";

export function CommanderBoxRegistration({ commanderName }: { commanderName: string }) {
  const { registerCommanderBox, close } = useCardDetail();
  const door = useChangeCommander();
  const addPartner = door?.addPartner ?? null;
  const openSheet = door?.openSheet;
  useEffect(() => {
    if (!addPartner || !openSheet) return;
    const short = shortName(commanderName);
    return registerCommanderBox((oracleId) =>
      oracleId === addPartner.oracleId ? (
        <section
          data-commander-box
          className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px] flex items-center gap-[14px]"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <div className="min-w-0 flex-1">
            <h3 className="font-mono text-[9.5px] md:text-[10px] uppercase tracking-[0.14em] mb-[6px]" style={{ color: "var(--fg-faint)" }}>
              {partnerAddCopy.door.heading}
            </h3>
            <p className="m-0 text-[13.5px] md:text-[15px] leading-[1.5]" style={{ color: "var(--fg-body)" }}>
              {partnerAddCopy.door.body(short, addPartner.ability)}
            </p>
          </div>
          <GhostButton
            data-commander-box-cta
            onClick={() => { close(); openSheet("details"); }}
            className="shrink-0 min-h-[44px]"
          >
            {partnerAddCopy.section.title(addPartner.ability.kind)}
          </GhostButton>
        </section>
      ) : null,
    );
  }, [registerCommanderBox, close, addPartner, openSheet, commanderName]);
  // The sheet the box opens: the card modal closed first, so it is the only layer up.
  return <Sheet width="details" />;
}
