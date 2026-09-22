import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BrowseListCard } from "../../lib/collection/browse";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { CollectionMarkKey } from "./collection-mark-key";
import { GridView } from "./grid-view";
import { RowsView } from "./rows-view";

const card = (over: Partial<BrowseListCard> = {}): BrowseListCard =>
  ({
    oracleId: "o-1", name: "Thassa's Oracle", typeLine: "Creature — Merfolk Wizard",
    manaCost: "{U}{U}", cmc: 2, keywords: [], rarity: "rare", colorIdentity: ["U"],
    imageUri: null, printedName: null, quantity: 1, setCodes: [], setCounts: [],
    primarySetCode: "THB", preferredPrinting: null,
    ...over,
  }) as unknown as BrowseListCard;

const props = { totalCards: 1, onShowMore: () => {}, onOpen: () => {}, pendingOracleId: null };
const PARTNER = { oracleId: "o-2", name: "Demonic Consultation" };

describe("combo awareness state 1 on /collection", () => {
  // THE CLAUSE REPLACES THE TYPE LINE rather than adding a third line. The row's height is
  // fixed, and of the two facts the combo is the one a reader cannot get from anywhere else.
  it("puts the clause where the type line was, at both widths", () => {
    const { container } = render(
      <RowsView cards={[card({ comboPartner: PARTNER })]} {...props} />,
    );
    expect(container.textContent).toContain("Demonic Consultation");
    expect(container.textContent).not.toContain("Creature — Merfolk Wizard");
  });

  // Both widths are in the document at once — one is `md:hidden`, the other `hidden md:block`
  // — so the two sentences have to be checked together, and the phone's is the SHORT tail.
  it("shortens the app's words on the phone line and not on the desktop one", () => {
    const { container } = render(
      <RowsView cards={[card({ comboPartner: PARTNER })]} {...props} />,
    );
    expect(container.textContent).toContain(
      comboAwarenessCopy.clause.ownBothShort("Demonic Consultation"),
    );
    expect(container.textContent).toContain(
      comboAwarenessCopy.clause.ownBoth("Demonic Consultation"),
    );
  });

  // THE ROW SPEAKS IT, and this is the only voicing: the glyph is aria-hidden and the visible
  // sentence has taken the type line's place, so a row without this clause in its accessible
  // name loses the fact entirely while still reading a type line that is no longer drawn.
  it("names the combo in the row's accessible name", () => {
    render(<RowsView cards={[card({ comboPartner: PARTNER })]} {...props} />);
    const row = screen.getAllByRole("button")[0];
    expect(row.getAttribute("aria-label") ?? "").toContain(
      comboAwarenessCopy.a11y.ownBoth("Demonic Consultation"),
    );
  });

  it("leaves a card with no combo exactly as it was", () => {
    const { container } = render(<RowsView cards={[card()]} {...props} />);
    expect(container.textContent).toContain("Creature — Merfolk Wizard");
    expect(container.querySelector('[data-testid="combo-clause"]')).toBeNull();
    const row = screen.getAllByRole("button")[0];
    expect(row.getAttribute("aria-label") ?? "").not.toContain("two-card combo");
  });

  // THE TILE: `SET · rarity` YIELDS. The caption's height is fixed and there is no third line,
  // so one of the two goes — and the set code is the one recoverable elsewhere.
  it("gives the tile's set line to the clause", () => {
    const { container } = render(
      <GridView cards={[card({ comboPartner: PARTNER })]} {...props} />,
    );
    expect(container.querySelector('[data-testid="combo-clause"]')).not.toBeNull();
    expect(container.textContent).toContain(
      comboAwarenessCopy.clause.ownBothShort("Demonic Consultation"),
    );
    // The set code is gone from the caption, which is the yield the design asks for.
    expect(container.textContent).not.toContain("THB");
  });

  it("keeps the tile's set line when there is no combo", () => {
    const { container } = render(<GridView cards={[card()]} {...props} />);
    expect(container.textContent).toContain("THB");
    expect(container.querySelector('[data-testid="combo-clause"]')).toBeNull();
  });

  // THE GLYPH IS GLOSSED ON THE SURFACE IT DEBUTS ON. A glyph identifies and cannot teach,
  // and neither clause sentence contains the word "combo" — so without a key entry a fourth
  // mark arrives on /collection with nothing anywhere to say what it means. That is the
  // failure the deck-status marks were retired in a day for.
  it("glosses the lemniscate in the key", () => {
    const { container } = render(<CollectionMarkKey />);
    expect(container.textContent).toContain(comboAwarenessCopy.keyWord);
    expect(container.querySelector('[data-testid="combo-glyph"]')).not.toBeNull();
  });

  // THE TILE SPEAKS THE FULL SENTENCE, AFTER THE NAME. The drawn clause is aria-hidden like
  // the bracket marks beside it, because left audible it is heard BEFORE the card it is
  // about — and in its shortened visual form, which never says "two-card combo".
  it("speaks the tile's combo after the card's name, in full", () => {
    const { container } = render(
      <GridView cards={[card({ comboPartner: PARTNER })]} {...props} />,
    );
    const spoken = container.querySelector(".sr-only")?.textContent ?? "";
    expect(spoken).toContain("Thassa's Oracle");
    expect(spoken).toContain(comboAwarenessCopy.a11y.ownBoth("Demonic Consultation"));
    expect(spoken.indexOf("Thassa's Oracle")).toBeLessThan(spoken.indexOf("two-card combo"));
    // And the drawn one is silent, or the sentence is heard twice.
    const drawn = container.querySelector('[data-testid="combo-clause"]')!;
    expect(drawn.closest("[aria-hidden]")).not.toBeNull();
  });

  // NO COUNT, on either host. Detection excludes template-gated variants by design.
  it("prints no figure beside the sentence on either host", () => {
    for (const View of [RowsView, GridView]) {
      const { container, unmount } = render(
        <View cards={[card({ comboPartner: PARTNER })]} {...props} />,
      );
      const clause = container.querySelector('[data-testid="combo-clause"]')!;
      expect(within(clause as HTMLElement).queryByText(/\+\d|· \d/)).toBeNull();
      unmount();
    }
  });
});
