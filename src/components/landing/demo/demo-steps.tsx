"use client";
// What each step draws: the signed-in drawing half, from the exported fixture data, inside the demo's providers. A step takes
// only `data` (the committed projection) and draws no per-player state: every press that would write is inert through the
// providers, and nothing here reads a table, a request or a model.

import { GridView } from "../../collection/grid-view";
import { CommandersList } from "../../commanders/commanders-list";
import type { Projected } from "../../../lib/demo/projected";

const noop = () => {};

export function StepCollection({ data, onOpen }: { data: Projected; onOpen: (oracleId: string) => void }) {
  return <GridView cards={data.collection.cards} totalCards={data.collection.totalCards} onShowMore={noop} onOpen={onOpen} />;
}

export function StepCommanders({ data }: { data: Projected }) {
  return <CommandersList rows={data.commanders.rows} rankBySlug={data.commanders.rankBySlug} avail="all" />;
}

/** The step bodies not built yet draw nothing: the section only ships when every step has its data and its half. */
export function StepBody({ index, data, onOpenCard }: { index: number; data: Projected; onOpenCard: (oracleId: string) => void }) {
  switch (index) {
    case 0:
      return <StepCollection data={data} onOpen={onOpenCard} />;
    case 1:
      return <StepCommanders data={data} />;
    default:
      return null;
  }
}
