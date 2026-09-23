// The header chip's source rule: what may be drawn, and what retires it.

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Bracket } from "../../lib/bracket/types";
import type { DeckProfile } from "../../lib/profile/types";

// The pressed-profile path reads `slotDeck`, whose own rules are tested beside it. Here a profile
// is a carrier for the range it would slot to, so the hook's KEYING is what is under test.
vi.mock("../../lib/bracket/slot", () => ({
  slotDeck: (p: { __permits: Bracket[] }) => ({ permits: p.__permits }),
}));
const pressed = (permits: Bracket[]) => ({ __permits: permits }) as unknown as DeckProfile;

const { useHeaderBracket } = await import("./use-header-bracket");

type Props = Parameters<typeof useHeaderBracket>[0];

function Harness(props: Props) {
  const permits = useHeaderBracket(props);
  return <span data-testid="permits">{permits ? permits.join("-") : "none"}</span>;
}

const A = "deck-a";
const B = "deck-b";
const LIST = [{ oracleId: "c1", quantity: 1 }, { oracleId: "c2", quantity: 1 }];
const view = (props: Partial<Props>) => (
  <Harness deckId={A} cards={LIST} storedPermits={null} readyProfile={null} loading={false} {...props} />
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

  // RULING 4: an edit during the visit HOLDS the chip. The analysis no longer describes the deck,
  // and the Analysis tab says so; the header keeps the bracket the deck was last read at.
  it("holds the chip when the card list changes", () => {
    const stored: Bracket[] = [3];
    const c = render(view({ storedPermits: stored }));
    c.rerender(view({ storedPermits: stored, cards: [...LIST, { oracleId: "c3", quantity: 1 }] }));
    expect(shown(c)).toBe("3");
  });

  it("holds a press's answer over a later edit", () => {
    const c = render(view({ loading: true }));
    c.rerender(view({ readyProfile: pressed([4]) }));
    c.rerender(view({ readyProfile: pressed([4]), cards: [...LIST, { oracleId: "c3", quantity: 1 }] }));
    expect(shown(c)).toBe("4");
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

  // A shape no writer produces fails closed rather than throwing inside `verdictHead`.
  it("draws nothing for a stored range no writer produces", () => {
    expect(shown(render(view({ storedPermits: [1, 3] as Bracket[] })))).toBe("none");
  });

  it("draws a press's answer for the list it was made against", () => {
    const c = render(view({ loading: true }));
    c.rerender(view({ readyProfile: pressed([3]) }));
    expect(shown(c)).toBe("3");
  });

  // An edit while the press is in flight: the answer describes the list before the edit, and the
  // server refused to store it. The chip keeps what it held.
  it("never takes a late answer for a list edited while it was in flight", () => {
    const edited = [...LIST, { oracleId: "c3", quantity: 1 }];
    const c = render(view({ storedPermits: [1, 2], loading: true }));
    c.rerender(view({ storedPermits: [1, 2], loading: true, cards: edited }));
    c.rerender(view({ storedPermits: [1, 2], cards: edited, readyProfile: pressed([3]) }));
    expect(shown(c)).toBe("1-2");
  });

  // A revalidation that began before the press completed arrives after it, carrying the old row.
  it("keeps a press's answer over a stale server prop for the same list", () => {
    const answer = pressed([3]);
    const c = render(view({ loading: true }));
    c.rerender(view({ readyProfile: answer }));
    c.rerender(view({ readyProfile: answer, storedPermits: [1, 2] }));
    expect(shown(c)).toBe("3");
  });
});
