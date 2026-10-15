import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import type { ModalComboPartner } from "../../lib/combos/near-miss";
import { ComboPartnersDetail } from "./combo-partners-detail";

const partner = (over: Partial<ModalComboPartner> = {}): ModalComboPartner => ({
  oracleId: "p-1", name: "Isochron Scepter", state: "owned", popularity: 100, ...over,
});

const card = (partners?: ModalComboPartner[]): BrowseCard =>
  ({ oracleId: "c-1", name: "Dramatic Reversal", comboPartners: partners }) as BrowseCard;

describe("the card modal's combo block", () => {
  const open = async () => {
    await act(async () => {
      screen.getByRole("button", { name: /Two-card combos/ }).click();
    });
  };

  // ABSENT ENTIRELY when nothing is detected — no heading, no empty state, no reserved
  // height. A drawn absence would read as a cleared check, and detection here is bounded.
  it("draws nothing at all for a card with no detected partner", () => {
    const { container } = render(<ComboPartnersDetail card={card()} />);
    expect(container.firstChild).toBeNull();
    const { container: empty } = render(<ComboPartnersDetail card={card([])} />);
    expect(empty.firstChild).toBeNull();
  });

  it("turns its disclosure chevron with the header's expanded state", async () => {
    render(<ComboPartnersDetail card={card([partner()])} />);
    const header = screen.getByRole("button", { name: /Two-card combos/ });
    const chevron = () => header.querySelector("[data-chevron=disclosure]");
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(chevron()?.getAttribute("data-open")).toBe("false");
    await open();
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(chevron()?.getAttribute("data-open")).toBe("true");
  });

  it("names each partner and its state", async () => {
    render(
      <ComboPartnersDetail
        card={card([
          partner({ oracleId: "a", name: "Isochron Scepter", state: "owned" }),
          partner({ oracleId: "b", name: "Basalt Monolith", state: "notOwned" }),
        ])}
      />,
    );
    await open();
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






  // THE SPACE AFTER `with` SURVIVES. The lead is a flex item of its own, and a trailing space
  // at the end of a box's line is collapsed, so staging drew `withApproach of the Second Sun`.
  // jsdom collapses nothing and would read the space back either way, so this pins the rule
  // that keeps it rather than the text.
  it("keeps the space between `with` and the partner's name", async () => {
    render(<ComboPartnersDetail card={card([partner({ name: "Approach of the Second Sun" })])} />);
    await open();
    const lead = [...screen.getByRole("listitem").querySelectorAll("span")].find(
      (el) => el.textContent === comboAwarenessCopy.modal.lineLead,
    );
    expect(lead, "the lead is not its own element").toBeTruthy();
    expect(lead!.className).toMatch(/\bwhitespace-pre\b/);
  });

  // AT 390px THE STATE WRAPS UNDER THE NAME rather than truncating it — the app's words move
  // before the card's name does, which is this feature's rule everywhere.
  //
  // CLOSED AT EVERY COUNT, INCLUDING ONE. A block that is sometimes a row and sometimes a
  // list is a block whose position the reader cannot learn.
  it("starts closed even with a single partner, and lists nothing", () => {
    render(<ComboPartnersDetail card={card([partner()])} />);
    const row = screen.getByRole("button", { name: /Two-card combos/ });
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("list")).toBeNull();
  });

  // THE COUNTS ARE THE ONE PLACE A COUNT IS LEGAL: they describe this list, not what exists.
  // `in this deck` leads and is the only part in colour, because it is the only urgent part.
  it("counts by state, in deck first, and omits a state it has none of", () => {
    render(
      <ComboPartnersDetail
        card={card([
          partner({ oracleId: "a", state: "notOwned" }),
          partner({ oracleId: "b", state: "inDeck" }),
          partner({ oracleId: "c", state: "notOwned" }),
        ])}
      />,
    );
    const text = screen.getByRole("button", { name: /Two-card combos/ }).textContent ?? "";
    expect(text).toContain(comboAwarenessCopy.modal.summary.inDeck(1));
    expect(text).toContain(comboAwarenessCopy.modal.summary.notOwned(2));
    expect(text, "a zero state was printed").not.toContain("you own");
    expect(text.indexOf("in this deck")).toBeLessThan(text.indexOf("you don"));
  });

  // THE WHOLE ROW IS THE TARGET, and the six/four cap is withdrawn: a closed block already
  // stops a fourteen-line one, and a reader who asked for the list is not served by a second
  // disclosure inside it.
  it("opens on the row and lists every partner, with no second disclosure", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      partner({ oracleId: `p${i}`, name: `Partner ${i}` }),
    );
    render(<ComboPartnersDetail card={card(many)} />);
    await open();
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.queryByText(/more$|^Show all/)).toBeNull();
  });

  // THE `*` IS NOT DRAWN WHILE CLOSED, and when it appears it REVEALS the sentence — the one
  // place this feature states its own limits. An earlier revision deleted that paragraph
  // outright and every test stayed green, because the case only asserted the MARKER existed.
  it("reveals the bound only once open, outside the row's button", async () => {
    render(<ComboPartnersDetail card={card([partner()])} />);
    const row = screen.getByRole("button", { name: /Two-card combos/ });
    expect(row.getAttribute("aria-controls")).toBeNull();
    expect(
      screen.queryByRole("button", { name: comboAwarenessCopy.modal.boundMarkerAria }),
    ).toBeNull();

    await open();
    const marker = screen.getByRole("button", {
      name: comboAwarenessCopy.modal.boundMarkerAria,
    });
    const described = row.getAttribute("aria-describedby");
    expect(described, "the row describes nothing").toBeTruthy();
    expect(document.getElementById(described!)?.textContent).toBe(
      comboAwarenessCopy.modal.qualifier,
    );
    expect(document.getElementById(row.getAttribute("aria-controls")!)).toBeTruthy();
    // NO INTERACTIVE NESTING: a control inside a native button announces two as one. Asserted
    // from the ROW, because `marker.closest("button")` returns the marker either way.
    expect(row.contains(marker), "the marker is nested inside the row's button").toBe(false);
  });

  // THE BLOCK STAYS IN THE MODAL'S HEADING OUTLINE, beside `Bracket facts`.
  it("keeps a level-3 heading around its toggle", () => {
    render(<ComboPartnersDetail card={card([partner()])} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.textContent).toContain(comboAwarenessCopy.modal.heading);
    expect(heading.contains(screen.getByRole("button", { name: /Two-card combos/ }))).toBe(true);
  });

  // THE ROW SPEAKS ITS COUNTS, so a reader who cannot see it learns what opening it shows.
  it("names the toggle with the label and the counts", () => {
    render(<ComboPartnersDetail card={card([partner({ state: "owned" })])} />);
    expect(
      screen.getByRole("button", { name: /Two-card combos/ }).getAttribute("aria-label"),
    ).toBe(comboAwarenessCopy.modal.toggleAria(comboAwarenessCopy.modal.summary.owned(1)));
  });

  // ASSERTED STRUCTURALLY, and that is a weaker check than it looks: jsdom lays nothing out,
  // so removing `flex-wrap` changes no measurement here and only the class list can be read.
  // A class assertion agrees with itself. The real proof is a browser probe, and this feature
  // has none yet — recorded as a follow-up rather than implied by a green test.
  it("stacks the state under the NAME below sm, not under the glyph", async () => {
    const { container } = render(<ComboPartnersDetail card={card([partner()])} />);
    await open();
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

  // THE SCOPE LINE TAKES OVER FROM THE COUNTS when the block opens — on the header itself,
  // so the block gains no chrome by opening — and it is absent without a deck, which is the
  // `/collection` face.
  it("names the deck once open, and only when there is one", async () => {
    const { rerender } = render(
      <ComboPartnersDetail card={card([partner()])} deckName="Kykar, Wind's Fury" />,
    );
    expect(screen.queryByText(/against Kykar/)).toBeNull();
    await open();
    expect(
      screen.getByText(comboAwarenessCopy.modal.scope("Kykar, Wind's Fury")),
    ).toBeInTheDocument();

    rerender(<ComboPartnersDetail card={card([partner()])} />);
    expect(screen.queryByText(/against /)).toBeNull();
  });

  // THE PARTNER NAME IS THE ONLY TARGET IN THE BLOCK, and it REPLACES this modal rather than
  // stacking on it. A pair fact read from one end wants the other end.
  it("opens the partner from its name, and nothing else is pressable", async () => {
    const onSelectPartner = vi.fn();
    render(
      <ComboPartnersDetail
        card={card([partner({ oracleId: "p-1", name: "Isochron Scepter" })])}
        onSelectPartner={onSelectPartner}
      />,
    );
    await open();
    await act(async () => {
      screen.getByRole("button", { name: "Isochron Scepter" }).click();
    });
    expect(onSelectPartner).toHaveBeenCalledWith("p-1");
    // The row's toggle, the bound marker and the partner — and nothing more.
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  // THE TOUCH TARGET IS NOT CLIPPED BY AN ANCESTOR. `truncate` sets `overflow: hidden`, so a
  // wrapper carrying it clips whatever buys the button its 44px — the height was there and
  // unreachable. Each half truncates itself instead.
  it("keeps the partner button out of a truncating ancestor", async () => {
    render(
      <ComboPartnersDetail
        card={card([partner({ name: "Power Artifact" })])}
        onSelectPartner={() => {}}
      />,
    );
    await open();
    const button = screen.getByRole("button", { name: "Power Artifact" });
    expect(button.className, "the button has no touch height of its own").toContain(
      "min-h-[44px]",
    );
    // No ancestor between the button and the row clips it.
    let el: HTMLElement | null = button.parentElement;
    while (el && el.tagName !== "LI") {
      expect(el.className, `a clipping ancestor: ${el.className}`).not.toContain("truncate");
      el = el.parentElement;
    }
  });

  // WITHOUT A HANDLER IT IS NOT A TARGET, rather than a dead button: `/collection` opens this
  // modal too, and a control that does nothing is worse than emphasis.
  it("leaves the name as emphasis when nothing can open a partner", async () => {
    render(<ComboPartnersDetail card={card([partner({ name: "Basalt Monolith" })])} />);
    await open();
    expect(screen.queryByRole("button", { name: "Basalt Monolith" })).toBeNull();
    expect(screen.getByText("Basalt Monolith")).toBeInTheDocument();
  });

  // THE THREE STATES AND NOTHING ELSE. No price, no copy count, no availability marker —
  // those are facts about your copies of the card you OPENED, and the modal has two blocks
  // for them already.
  it("carries no money and no copy count", async () => {
    const { container } = render(
      <ComboPartnersDetail card={card([partner({ state: "notOwned" })])} />,
    );
    await open();
    const block = container.querySelector("[data-testid='combo-partners-block']")!;
    expect(block.textContent).not.toMatch(/\$|×\d/);
  });
});
