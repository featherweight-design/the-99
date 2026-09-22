import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { MODAL_COMBO_CAP_DESKTOP } from "../../lib/combos/modal-block";
import type { ModalComboPartner } from "../../lib/combos/near-miss";
import { stubViewport } from "../../test-utils/stub-viewport";
import { ComboPartnersDetail } from "./combo-partners-detail";

const partner = (over: Partial<ModalComboPartner> = {}): ModalComboPartner => ({
  oracleId: "p-1", name: "Isochron Scepter", state: "owned", popularity: 100, ...over,
});

const card = (partners?: ModalComboPartner[]): BrowseCard =>
  ({ oracleId: "c-1", name: "Dramatic Reversal", comboPartners: partners }) as BrowseCard;

describe("the card modal's combo block", () => {
  // ABSENT ENTIRELY when nothing is detected — no heading, no empty state, no reserved
  // height. A drawn absence would read as a cleared check, and detection here is bounded.
  it("draws nothing at all for a card with no detected partner", () => {
    const { container } = render(<ComboPartnersDetail card={card()} />);
    expect(container.firstChild).toBeNull();
    const { container: empty } = render(<ComboPartnersDetail card={card([])} />);
    expect(empty.firstChild).toBeNull();
  });

  it("names each partner and its state", () => {
    render(
      <ComboPartnersDetail
        card={card([
          partner({ oracleId: "a", name: "Isochron Scepter", state: "owned" }),
          partner({ oracleId: "b", name: "Basalt Monolith", state: "notOwned" }),
        ])}
      />,
    );
    // MATCHED ACROSS ELEMENTS: the line is two spans now — the app's words at `--fg-body`
    // and the partner's NAME at 600 in `--fg`, which is what the addendum sets.
    const lineOf = (name: string) =>
      screen.getAllByRole("listitem").find((li) =>
        li.textContent?.includes(comboAwarenessCopy.modal.line(name)),
      );
    expect(lineOf("Isochron Scepter")).toBeTruthy();
    // And the name is the half that is set apart.
    expect(
      [...lineOf("Isochron Scepter")!.querySelectorAll("span")].some(
        (el) => el.textContent === "Isochron Scepter" && el.className.includes("font-semibold"),
      ),
      "the partner name is not set apart from the app's words",
    ).toBe(true);
    expect(screen.getByText(comboAwarenessCopy.modal.state.owned)).toBeInTheDocument();
    expect(screen.getByText(comboAwarenessCopy.modal.state.notOwned)).toBeInTheDocument();
  });

  // NO COUNT IN THE HEADING. `+8 more` is a fact about what is HIDDEN; `Two-card combos · 14`
  // would be a claim about what EXISTS, and detection excludes template-gated variants.
  it("prints no figure in the heading", () => {
    render(<ComboPartnersDetail card={card([partner(), partner({ oracleId: "b" })])} />);
    expect(screen.getByText(comboAwarenessCopy.modal.heading).textContent).toBe(
      comboAwarenessCopy.modal.heading,
    );
  });

  // THE BOUND IS TIED TO THE BLOCK, so a screen reader hears it with the heading — and it is
  // rendered whether or not it is open, or `aria-describedby` would dangle.
  it("describes the block with the bound, open or closed", () => {
    const { container } = render(<ComboPartnersDetail card={card([partner()])} />);
    // ON THE HEADING: a reader navigating by heading is the one who needs the bound, and a
    // relation on the wrapping container is not reliably announced with the h3 inside it.
    const heading = screen.getByText(comboAwarenessCopy.modal.heading);
    const described = heading.getAttribute("aria-describedby");
    expect(described).toBeTruthy();
    expect(document.getElementById(described!)?.textContent).toBe(
      comboAwarenessCopy.modal.qualifier,
    );
  });

  // A REAL TARGET, and the sentence opens IN PLACE. Round 1 could refuse a tap route because
  // the key and the modal carried the words; here the modal IS the last surface.
  it("opens the bound in place when its marker is pressed", async () => {
    const { container } = render(<ComboPartnersDetail card={card([partner()])} />);
    const marker = screen.getByRole("button", {
      name: comboAwarenessCopy.modal.boundMarkerAria,
    });
    expect(marker.getAttribute("aria-expanded")).toBe("false");
    const bound = document.getElementById(
      screen.getByText(comboAwarenessCopy.modal.heading).getAttribute("aria-describedby")!,
    )!;
    expect(bound.className).toContain("sr-only");

    await act(async () => {
      marker.click();
    });
    expect(marker.getAttribute("aria-expanded")).toBe("true");
    expect(bound.className).not.toContain("sr-only");
  });

  // THE COMMON CASE DISCLOSES NOTHING: 49% of pieces have exactly one partner.
  it("offers no disclosure below the cap", () => {
    render(<ComboPartnersDetail card={card([partner()])} />);
    expect(screen.queryByText(/more|Show all/)).toBeNull();
  });

  // THE BLOCK GROWS IN PLACE. It does not scroll inside itself and does not open a second
  // surface, so every partner is in the document once expanded.
  it("caps, discloses, and grows in place", async () => {
    stubViewport(1300);
    const many = Array.from({ length: MODAL_COMBO_CAP_DESKTOP + 3 }, (_, i) =>
      partner({ oracleId: `p${i}`, name: `Partner ${i}`, popularity: 1000 - i }),
    );
    render(<ComboPartnersDetail card={card(many)} />);

    const lines = () =>
      screen.getAllByRole("listitem").filter((li) => li.textContent?.includes("with Partner"));
    expect(lines()).toHaveLength(MODAL_COMBO_CAP_DESKTOP);
    const more = screen.getByRole("button", {
      name: comboAwarenessCopy.modal.showAllAria(many.length),
    });
    expect(more).toHaveTextContent(comboAwarenessCopy.modal.more(3));

    await act(async () => {
      more.click();
    });
    expect(lines()).toHaveLength(many.length);
    // AND IT SAYS WHAT PRESSING IT NOW DOES. A control whose label still reads `Show all N`
    // while `aria-expanded` is true announces one state and offers the other.
    expect(more).toHaveTextContent(comboAwarenessCopy.modal.collapse);
    expect(more.getAttribute("aria-expanded")).toBe("true");
  });

  // AT 390px THE STATE WRAPS UNDER THE NAME rather than truncating it — the app's words move
  // before the card's name does, which is this feature's rule everywhere.
  //
  // ASSERTED STRUCTURALLY, and that is a weaker check than it looks: jsdom lays nothing out,
  // so removing `flex-wrap` changes no measurement here and only the class list can be read.
  // A class assertion agrees with itself. The real proof is a browser probe, and this feature
  // has none yet — recorded as a follow-up rather than implied by a green test.
  it("stacks the state under the NAME below sm, not under the glyph", () => {
    const { container } = render(<ComboPartnersDetail card={card([partner()])} />);
    const li = container.querySelector("li")!;
    // The glyph stays beside a column that holds the name and the state, so the state lands
    // under the name rather than at the row's left edge beneath the lemniscate.
    const column = li.lastElementChild!;
    expect(column.className, "the name and state do not share a column").toContain(
      "flex-col",
    );
    expect(column.className, "the column never returns to a row").toContain("sm:flex-row");
    expect(
      column.querySelector('[data-testid="combo-glyph"]'),
      "the glyph was pulled into the text column",
    ).toBeNull();
    expect(column.textContent).toContain("Isochron Scepter");
  });

  // THE THREE STATES AND NOTHING ELSE. No price, no copy count, no availability marker —
  // those are facts about your copies of the card you OPENED, and the modal has two blocks
  // for them already.
  it("carries no money and no copy count", () => {
    const { container } = render(
      <ComboPartnersDetail card={card([partner({ state: "notOwned" })])} />,
    );
    const block = container.querySelector("[data-testid='combo-partners-block']")!;
    expect(block.textContent).not.toMatch(/\$|×\d/);
  });
});
