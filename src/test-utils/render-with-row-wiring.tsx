// `render` for a test that draws a deck row (or a list, group or tile of them) outside the builder shell: the same
// Testing Library, with the signed-in row wiring mounted the way the shell mounts it. A test that mocks the deck actions
// gets the mocks through this wiring, so a row's remove, its basics stepper and its undo reach them as they do in the app.

import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import type { ReactNode } from "react";

import { DeckRowWiringProvider } from "../components/decks/deck-row-wiring";
import { LIVE_ROW_WIRING } from "../components/decks/deck-row-wiring-live";

export * from "@testing-library/react";

function Wiring({ children }: { children: ReactNode }) {
  return <DeckRowWiringProvider value={LIVE_ROW_WIRING}>{children}</DeckRowWiringProvider>;
}

export function render(ui: ReactNode, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, { wrapper: Wiring, ...options });
}
