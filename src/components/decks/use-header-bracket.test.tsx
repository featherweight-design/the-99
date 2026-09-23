// The header chip's source rule: what may be drawn, and what retires it.

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Bracket } from "../../lib/bracket/types";
import { useHeaderBracket } from "./use-header-bracket";

type Props = Parameters<typeof useHeaderBracket>[0];

function Harness(props: Props) {
  const permits = useHeaderBracket(props);
  return <span data-testid="permits">{permits ? permits.join("-") : "none"}</span>;
}

const A = "deck-a";
const B = "deck-b";
const LIST = [{ oracleId: "c1", quantity: 1 }, { oracleId: "c2", quantity: 1 }];
// The pressed-profile source goes through `slotDeck` on a real profile, so it is driven here
// through the stored range instead: a hand-built profile would assert its own fixture, and the
// two cases that matter (an edit, a change of deck) are the same rule for either source.
const view = (props: Partial<Props>) => (
  <Harness deckId={A} cards={LIST} storedPermits={null} readyProfile={null} {...props} />
);
const shown = (c: ReturnType<typeof render>) => c.getByTestId("permits").textContent;

describe("useHeaderBracket", () => {
  it("draws the stored range for the deck it was served with", () => {
    const c = render(view({ storedPermits: [1, 2] }));
    expect(shown(c)).toBe("1-2");
  });

  it("draws nothing for an unread deck", () => {
    expect(shown(render(view({})))).toBe("none");
  });

  // An edit during the visit: the analysis no longer describes the deck.
  // The SAME array: a client render between revalidations hands the prop back unchanged, and a
  // new array is the server answering again, which is the next case.
  it("retires the chip when the card list changes", () => {
    const stored: Bracket[] = [3];
    const c = render(view({ storedPermits: stored }));
    c.rerender(view({ storedPermits: stored, cards: [...LIST, { oracleId: "c3", quantity: 1 }] }));
    expect(shown(c)).toBe("none");
  });

  // A route change to another deck holding the SAME list, which the card list alone cannot see.
  it("retires the chip when the deck changes, even over an identical list", () => {
    const stored: Bracket[] = [3];
    const c = render(view({ storedPermits: stored }));
    c.rerender(view({ deckId: B, storedPermits: stored }));
    expect(shown(c)).toBe("none");
  });

  // A revalidated page is the server's answer for the deck as it now stands.
  it("takes a new stored range from the server", () => {
    const c = render(view({ storedPermits: [3] }));
    c.rerender(view({ storedPermits: [4, 5] }));
    expect(shown(c)).toBe("4-5");
  });
});
