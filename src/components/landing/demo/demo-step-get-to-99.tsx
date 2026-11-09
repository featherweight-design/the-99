"use client";
// Step 7, Get it to 99: three tabs, each the signed-in drawing half on the deck the fixture holds for it. Look deeper (Proposed
// cuts) is Giada's stored run, over 99; Top off and Mana Balance are Zimone's, under. The tab is this step's own state.
// Nothing here spends: Look deeper shows its stored result (no offer to press, no credits line), Cut and Keep flip in this
// component's state only, and Top off's commit adds nothing.

import { useState } from "react";

import { CardDetailTrigger, useCardDetail, useCardIntent } from "../../cards/card-detail-context";
import { CutRowView, CutsView } from "../../decks/cuts-view";
import { ManaBalanceView, type ManaSectionId } from "../../decks/mana-balance-view";
import { usePreviewRow } from "../../decks/hover-preview";
import type { Allowance } from "../../../lib/model/allowance-rule";
import type { CutItem, CutsPanel } from "../../../lib/tuning/cuts-state";
import { landingCopy } from "../../../lib/copy/landing";
import type { Projected } from "../../../lib/demo/projected";
import { DemoDeckScope } from "./demo-providers";
import { DemoHead, DemoTabs } from "./demo-tabs";
import { DemoTopOffList } from "./demo-top-off";

const tabs = landingCopy.demo.tabs;
type Tab = "cuts" | "topOff" | "mana";
const TABS: readonly { id: Tab; label: string }[] = [
  { id: "cuts", label: tabs.cuts },
  { id: "topOff", label: tabs.topOff },
  { id: "mana", label: tabs.mana },
];

/** What the cuts drawing is handed for credits: one fixed allowance the demo never draws (`showStanding` is off, and a stored
 *  result offers no paid press). No account's credits are behind it. */
const DEMO_ALLOWANCE: Allowance = { used: 0, limit: 1, reopensAt: null, nextAt: null };

const noop = () => {};

function DemoCutRow({ item, items, verdict, chips, onAnswer }: { item: CutItem; items: CutItem[]; verdict: CutItem["verdict"]; chips: CutsPanel["chips"]; onAnswer: (kind: "cut" | "undo" | "keep" | "restore") => void }) {
  const { open } = useCardDetail();
  const intent = useCardIntent(item.cutOracleId);
  const previewHandlers = usePreviewRow(item.cutImageUri);
  return (
    <CutRowView
      item={item}
      verdict={verdict}
      reviewing={false}
      chipSet={chips}
      busy={false}
      onAnswer={onAnswer}
      onOpen={(event) => open(item.cutOracleId, items.map((i) => ({ oracleId: i.cutOracleId, name: i.cutName, imageUri: i.cutImageUri })), undefined, { opener: event.currentTarget })}
      previewHandlers={previewHandlers}
      intent={intent}
    />
  );
}

function DemoCuts({ data }: { data: Projected }) {
  const panel: CutsPanel = { ...data.cuts, allowance: DEMO_ALLOWANCE, review: null, lastOkFingerprint: null };
  // The verdicts the visitor has pressed, over the stored ones: this state is all a Cut or a Keep changes.
  const [pressed, setPressed] = useState<ReadonlyMap<string, CutItem["verdict"]>>(() => new Map());
  const verdictOf = (item: CutItem) => pressed.get(item.id) ?? item.verdict;
  const TARGET = { cut: "accepted", keep: "dismissed", undo: "pending", restore: "pending" } as const;
  return (
    <CutsView
      panel={panel}
      verdictOf={verdictOf}
      running={false}
      failed={false}
      refusedRun={false}
      resultShown={panel.items.length > 0}
      priorResult={false}
      reviewing={false}
      elapsed="0:00"
      refused={null}
      announced=""
      onPress={noop}
      showStanding={false}
      renderRow={(item, items) => (
        <DemoCutRow item={item} items={items} verdict={verdictOf(item)} chips={panel.chips} onAnswer={(kind) => setPressed((m) => new Map(m).set(item.id, TARGET[kind]))} />
      )}
    />
  );
}

function DemoMana({ data }: { data: Projected }) {
  const [open, setOpen] = useState<ReadonlySet<ManaSectionId>>(() => new Set());
  return (
    <ManaBalanceView
      data={data.mana}
      isOpen={(id) => open.has(id)}
      onToggle={(id) => setOpen((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; })}
      renderCard={(c) => (
        <CardDetailTrigger oracleId={c.oracleId} name={c.name} siblings={c.siblings} imageUri={c.imageUri} preview className={c.className}>
          {c.name}
        </CardDetailTrigger>
      )}
    />
  );
}

export function StepGetTo99({ data }: { data: Projected }) {
  const [tab, setTab] = useState<Tab>("cuts");
  const deckName = tab === "cuts" ? data.decks.over.deckName : data.decks.under.deckName;
  return (
    <div data-testid="demo-get-to-99">
      <DemoTabs tabs={TABS} value={tab} onChange={setTab} label={tabs.aria}>
        {/* Look deeper is Giada's (over 99); Top off and Mana Balance are Zimone's (under): a card pressed carries that deck's role (`detailFor` lays that deck's own combos over the card it opens). */}
        <DemoDeckScope role={tab === "cuts" ? "over" : "under"}>
          <DemoHead deckName={deckName} readOnly={tab !== "mana"} />
          {tab === "cuts" ? <DemoCuts data={data} /> : tab === "topOff" ? <DemoTopOffList topOff={data.topOff} /> : <DemoMana data={data} />}
        </DemoDeckScope>
      </DemoTabs>
    </div>
  );
}
