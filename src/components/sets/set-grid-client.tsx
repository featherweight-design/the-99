"use client";

// The grid's client boundary: the card modal's provider, and the one signal the grid needs
// out of it.
//
// A printing pick is written from inside `CardDetailProvider`, and this page's data depends
// on WHICH printing is owned — a pick moves the filled cell. The modal closing is usually
// when that happens, but not always: a reader who closes it before the action returns
// would be left on a stale grid with nothing to tell them so, because `revalidatePath`
// does not refresh a mounted client route and window focus does not fire for an action
// taken in this tab.
//
// So the provider's post-write callback bumps a generation, and the grid rechecks on it.

import { useState } from "react";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SetGridView, type SetGridViewProps } from "./set-grid-view";

export function SetGridClient(props: Omit<SetGridViewProps, "artGeneration">) {
  const [artGeneration, setArtGeneration] = useState(0);

  return (
    <CardDetailProvider onArtChange={() => setArtGeneration((g) => g + 1)}>
      <SetGridView {...props} artGeneration={artGeneration} />
    </CardDetailProvider>
  );
}
