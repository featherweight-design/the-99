// The strip's contract after #184: the cell IS the control.
//
// A cell under target is a button that opens its shelf; a cell that has met
// its target is a figure with no action at all. The five per-cell rationale
// disclosures and the five sub-44px `consider` anchors beneath them are gone,
// replaced by one strip-level disclosure carrying every role's rationale — ten
// targets become six. These tests replace the six anchor cases that stood here
// before, which asserted a link that no longer exists.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { type MixRole, recommendedMix } from "../../lib/decks/mix";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { RoleCounterStrip } from "./role-counter-strip";
import { RoleCounterCell } from "./role-counter-cell";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

const ROLES: MixRole[] = ["ramp", "draw", "removal", "wipes", "land"];

/** Consider drawing a shelf for every role — the case the rest of these assume. */
const ALL_SHELVES = new Set(ROLES);

const card = (role: DeckDetailCard["role"], i: number): DeckDetailCard => ({
  oracleId: `o-${role}-${i}`,
  name: `${role} ${i}`,
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  cmc: 2,
  role,
  owned: true,
  quantity: 1,
  auto: false,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
});

/** Enough of one role to sit ON target, leaving every other role short. */
const atTarget = (role: MixRole) =>
  Array.from({ length: TEST_MIX.cells[role].target }, (_, i) => card(role, i));

/** Every role at target — the forced state where no cell is a control. */
const allAtTarget = ROLES.flatMap(atTarget);

const cellFor = (role: MixRole, have: number) =>
  screen.queryByRole("button", {
    name: addPanelCopy.strip.cellLinkAria(
      TEST_MIX.cells[role].label,
      have,
      TEST_MIX.cells[role].target,
    ),
  });

describe("role counter strip — a short cell is the control", () => {
  it("makes a cell under target a button whose name carries both figures", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    expect(cellFor("ramp", 0)).toBeInTheDocument();
    expect(cellFor("ramp", 0)).toHaveTextContent(addPanelCopy.strip.cellLink);
  });

  it("names the role's shelf, so five cells in a row are told apart", () => {
    const onSeeShelf = vi.fn();
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={onSeeShelf} rolesWithShelves={ALL_SHELVES} />);
    fireEvent.click(cellFor("draw", 0)!);
    expect(onSeeShelf).toHaveBeenCalledWith("draw");
  });

  it("draws no anchor anywhere — the cell replaced the link, it did not join it", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  // Six targets, not ten: at most five cells plus the one strip disclosure.
  it("draws one control per short cell plus a single disclosure", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    expect(screen.getAllByRole("button")).toHaveLength(ROLES.length + 1);
  });
});

describe("role counter strip — a met cell is a figure", () => {
  it("gives a met cell no button and no consider caption", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={atTarget("ramp")} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    expect(cellFor("ramp", TEST_MIX.cells.ramp.target)).toBeNull();
    const met = screen.getByRole("figure", {
      name: addPanelCopy.strip.cellStaticAria(
        TEST_MIX.cells.ramp.label,
        TEST_MIX.cells.ramp.target,
        TEST_MIX.cells.ramp.target,
      ),
    });
    expect(met).not.toHaveTextContent(addPanelCopy.strip.cellLink);
    // A sibling still short proves the strip is drawing controls at all,
    // rather than the assertion above passing because nothing rendered.
    expect(cellFor("draw", 0)).toBeInTheDocument();
  });

  it("leaves a met cell out of the tab order", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={atTarget("ramp")} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    const met = screen.getByRole("figure", {
      name: addPanelCopy.strip.cellStaticAria(
        TEST_MIX.cells.ramp.label,
        TEST_MIX.cells.ramp.target,
        TEST_MIX.cells.ramp.target,
      ),
    });
    expect(met).not.toHaveAttribute("tabindex");
    met.focus();
    expect(met).not.toHaveFocus();
  });

  // Forced state: every role met. Nothing in the strip is a control except the
  // disclosure, and no cell offers a shelf it cannot deliver.
  it("draws no cell controls at all when every role is met", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={allAtTarget} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    expect(screen.getAllByRole("figure")).toHaveLength(ROLES.length);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button")).toHaveAccessibleName(
      addPanelCopy.strip.rationaleToggle,
    );
  });

  // Forced state: every role short. Five controls, one disclosure, six targets.
  it("draws a control on every cell when every role is short", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    expect(screen.queryAllByRole("figure")).toHaveLength(0);
    for (const role of ROLES) expect(cellFor(role, 0)).toBeInTheDocument();
  });

  // Without a handler there is nowhere to send anyone, so a short cell has to
  // fall back to the figure rather than render a button that does nothing.
  it("falls back to a figure when the strip is given nowhere to send the user", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} />);
    expect(screen.getAllByRole("figure")).toHaveLength(ROLES.length);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  // Short is not sufficient: Consider builds a shelf from owned suggestions and
  // drops it when empty, so a role with nothing owned to offer has no heading to
  // scroll to and the click would only switch tabs.
  it("leaves a short cell a figure when Consider draws no shelf for that role", () => {
    render(
      <RoleCounterStrip mix={TEST_MIX}
        cards={[]}
        onSeeShelf={vi.fn()}
        rolesWithShelves={new Set<MixRole>(["draw"])}
      />,
    );
    expect(cellFor("draw", 0)).toBeInTheDocument();
    expect(cellFor("ramp", 0)).toBeNull();
    expect(screen.getAllByRole("figure")).toHaveLength(ROLES.length - 1);
  });
});

describe("role counter strip — one disclosure for the whole strip", () => {
  it("starts closed with the trigger and no panel", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    const trigger = screen.getByRole("button", {
      name: addPanelCopy.strip.rationaleToggle,
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(addPanelCopy.strip.rationaleClose)).toBeNull();
  });

  it("opens one panel carrying every role's rationale", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    fireEvent.click(
      screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle }),
    );
    const panel = screen.getByRole("region", { name: addPanelCopy.strip.rationaleToggle });
    for (const body of Object.values(addPanelCopy.strip.rationaleBodies)) {
      expect(panel).toHaveTextContent(body);
    }
    // Four lines for five roles: Removal and Wipes share one, as drawn.
    expect(panel.querySelectorAll("p")).toHaveLength(4);
    // Headings quote TEST_MIX.cells, so the panel can never disagree with the
    // cell above it about a target.
    expect(panel).toHaveTextContent(
      `${TEST_MIX.cells.removal.label} ${TEST_MIX.cells.removal.target} · ${TEST_MIX.cells.wipes.label} ${TEST_MIX.cells.wipes.target}`,
    );
    expect(panel).toHaveTextContent(`${TEST_MIX.cells.land.label} ~${TEST_MIX.cells.land.target}`);
  });

  // WCAG 2.5.3: the accessible name has to contain the words on screen, so the
  // authored sentence describes rather than names. It also does not follow the
  // control open — "Show why each role has the target it has" is false once the
  // panel below is already showing the answer.
  it("names the control by its drawn text, and only offers to Show while closed", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    const trigger = screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle });
    expect(trigger).toHaveAccessibleDescription(addPanelCopy.strip.rationaleToggleAria);

    fireEvent.click(trigger);

    const open = screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle });
    expect(open).toHaveAttribute("aria-expanded", "true");
    expect(open).not.toHaveAccessibleDescription(addPanelCopy.strip.rationaleToggleAria);
  });

  // The two states were two subtrees, so React unmounted the trigger on every
  // toggle and a keyboard user's focus dropped to `document.body` at the moment
  // they opened the panel — right before the content they asked for arrived.
  // Same node in both states is what keeps the caret where they left it.
  it("keeps focus on the trigger across a toggle", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    const trigger = screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle });
    trigger.focus();

    fireEvent.click(trigger);
    expect(document.activeElement).toBe(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(trigger);
    expect(document.activeElement).toBe(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  // Hide unmounts itself, so without a hand-off the caret lands on
  // `document.body` — the same defect as the toggle above, one control over.
  it("hands focus back to the trigger when Hide unmounts itself", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    const trigger = screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle });
    fireEvent.click(trigger);

    const hide = screen.getByRole("button", { name: addPanelCopy.strip.rationaleClose });
    hide.focus();
    fireEvent.click(hide);

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle }),
    );
  });

  it("closes again from Hide", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    const trigger = screen.getByRole("button", {
      name: addPanelCopy.strip.rationaleToggle,
    });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: addPanelCopy.strip.rationaleClose }));
    expect(
      screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: addPanelCopy.strip.rationaleToggle })).toBeNull();
  });

  // The header carries no hint at either width. Every version of it described
  // the cells as a class, and a cell short of a role Consider built no shelf
  // for is not in that class — it is deliberately inert. The affordance lives
  // on the cell that has it, which prints `consider →` and nothing else does.
  it("annotates the cells with no header hint", () => {
    const { container } = render(<RoleCounterStrip mix={TEST_MIX} cards={[]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    expect(addPanelCopy.strip).not.toHaveProperty("hint");
    expect(JSON.stringify(addPanelCopy.strip)).not.toContain("shelf below");
    expect(container.textContent).not.toContain("Click a cell for rationale");
    expect(container.textContent).toContain(addPanelCopy.strip.cellLink);
  });
});

describe("role counter strip — unresolved rows", () => {
  // The strip's contract with unresolved rows is that it has none: no sixth
  // cell, no asterisk on a figure, no adjusted denominator. An unresolved line
  // has no oracle ID and so belongs to no role at all.
  it("gains no cell and no asterisk from unresolved rows", () => {
    const { container } = render(
      <RoleCounterStrip mix={TEST_MIX} cards={atTarget("ramp")} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />,
    );
    const cells = within(screen.getByLabelText("Recommended mix")).getAllByRole(
      "figure",
      { hidden: true },
    ).length;
    expect(cells + screen.getAllByRole("button").length - 1).toBe(
      Object.keys(TEST_MIX.cells).length,
    );
    expect(container.textContent).not.toMatch(/unresolved/i);
    expect(container.textContent).not.toContain("*");
  });
});

describe("role counter strip — the draft sub-run (#389, surface 1)", () => {
  const ZERO = { ramp: 0, draw: 0, removal: 0, wipes: 0, land: 0 } as Record<MixRole, number>;

  // `wasCounts` IS the draft's presence, so the note has no second flag to get
  // out of step with: a deck with something pending says which list it counted.
  it("names the list the figures came from while a draft exists", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} wasCounts={ZERO} />);
    expect(screen.getByText(deckVersioningCopy.pending.mixStripDraftNote)).toBeInTheDocument();
  });

  // On a clean deck there is only one list to have counted, and naming it would
  // raise a question the reader does not have.
  it("says nothing on a deck with nothing pending", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} />);
    expect(
      screen.queryByText(deckVersioningCopy.pending.mixStripDraftNote),
    ).toBeNull();
  });

  // The previous figure is the point of the sub-run: a role the draft moved says
  // where it came from, so the reader can see the edit in the mix rather than
  // only the mix it left behind.
  it("names the version's figure on a role the draft moved", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} wasCounts={{ ...ZERO, ramp: 3 }} />);
    expect(
      screen.getByText(deckVersioningCopy.pending.mixCellWas(3)),
    ).toBeInTheDocument();
  });

  // A caption inside a figure is not part of its accessible name, so the move
  // would otherwise be visual only.
  it("carries the version's figure in the cell's accessible name", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} wasCounts={{ ...ZERO, ramp: 3 }} />);
    expect(
      screen.getByRole("figure", {
        name: new RegExp(`${deckVersioningCopy.pending.mixCellWas(3)}$`),
      }),
    ).toBeInTheDocument();
  });

  // "was 0" beside a 0 is noise, so an unmoved role says nothing — which is why
  // the strip compares rather than passing `wasCounts` straight through. Every
  // other case here holds `wasCounts` equal to the counts, so without this pair
  // a strip that drew `was` unconditionally would still pass them all.
  it("says nothing on a role the draft left where it was", () => {
    // Both figures 0, which is what unmoved means here. The fixture above holds
    // a role that moved 3 → 0, where `was 0` was never the string in question.
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} wasCounts={ZERO} />);
    expect(
      screen.queryByText(deckVersioningCopy.pending.mixCellWas(0)),
    ).toBeNull();
  });

  // Brass, and beside the EDHREC line rather than under it — the two sub-runs
  // read as one sentence about where the numbers come from.
  it("draws the note in accent, at the source line's size and breakpoint", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[]} wasCounts={ZERO} />);
    const note = screen.getByText(deckVersioningCopy.pending.mixStripDraftNote);
    expect(note.getAttribute("style")).toContain("var(--accent)");
    expect(note.className).toContain("text-[10.5px]");
    expect(note.className).toContain("md:inline");
  });
});

describe("role counter cell — A3 in-flight treatment (have === null)", () => {
  const renderInFlight = () =>
    render(
      <RoleCounterCell
        label="Ramp"
        have={null}
        target={10}
        advisory={false}
      />,
    );

  it("draws a dashed rule and a dash numerator, and no fill element", () => {
    const { container } = renderInFlight();
    // No fill bar track (the track has this specific class combination)
    const fillBar = container.querySelector(".rounded-full.overflow-hidden");
    expect(fillBar).toBeNull();
    // The numerator reads as a dash — textContent of the cell must include an em dash before the denominator
    // Check the cell contains "—" (em dash) but NOT a digit as the count
    expect(container.textContent).toMatch(/—\s*\/\s*10/);
    // The rule itself: height 0 so the cell does not change height between
    // frames, and dashed so it does not read as an empty track.
    const rule = container.querySelector('[style*="dashed"]') as HTMLElement;
    expect(rule).not.toBeNull();
    expect(rule.style.borderTop).toContain("dashed");
    expect(rule.style.height).toBe("0px");
  });

  it("does not announce a zero count to a screen reader", () => {
    const { container } = renderInFlight();
    const label = container.firstElementChild?.getAttribute("aria-label") ?? "";
    // "0 of 10" is the zero-for-no-data the dash on the cell face exists to
    // avoid, said in the one channel nobody can see it in.
    expect(label).not.toContain("0 of 10");
    expect(label).toBe(addPanelCopy.strip.cellStaticAria("Ramp", null, 10));
  });

  it("keeps the denominator when have is null", () => {
    const { container } = renderInFlight();
    // The denominator (/ 10) must be present
    expect(container.textContent).toContain("/ 10");
  });

  it("drops the label to --fg-locked and the figure to --border-strong", () => {
    const { container } = renderInFlight();
    // Label must use text-fg-locked (not text-fg-faint)
    const label = container.querySelector("p:first-child");
    expect(label?.className).toContain("text-fg-locked");
    expect(label?.className).not.toContain("text-fg-faint");
    // Figure color must be --border-strong
    const figure = container.querySelector("p:nth-child(2)");
    expect(figure?.getAttribute("style")).toContain("var(--border-strong)");
  });
});

describe("role counter cell — A4 short cell in a just-filled deck", () => {
  it("a short cell in a just-filled deck takes the border-strong hairline", () => {
    const { container } = render(
      <RoleCounterCell
        label="Ramp"
        have={0}
        target={10}
        advisory={false}
        justFilled={true}
      />,
    );
    // The cell shell must use border-border-strong (phone) plus md:border-border
    // (desktop reset) — the strong hairline is a phone-only affordance.
    const cell = container.firstElementChild as HTMLElement;
    expect(cell.className).toContain("border-border-strong");
    expect(cell.className).toContain("md:border-border");
  });

  it("a met cell in a just-filled deck does not take border-strong", () => {
    const { container } = render(
      <RoleCounterCell
        label="Ramp"
        have={10}
        target={10}
        advisory={false}
        justFilled={true}
      />,
    );
    // The met cell keeps the default border — border-strong is only for short cells
    const cell = container.firstElementChild as HTMLElement;
    expect(cell.className).not.toContain("border-border-strong");
    expect(cell.className).toContain("border-border");
  });
});

describe("role counter strip — counting by label", () => {
  it("counts by card.role with no label rows, exactly as before", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[card("ramp", 0), card("ramp", 1)]} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    expect(cellFor("ramp", 2)).not.toBeNull();
  });

  it("counts by the label rows when given: a card the classifier calls ramp but labels call draw is draw", () => {
    const labelRows = { "o-ramp-0": ["draw" as const], "o-ramp-1": ["ramp" as const, "draw" as const] };
    render(
      <RoleCounterStrip
        mix={TEST_MIX}
        cards={[card("ramp", 0), card("ramp", 1)]}
        labelRows={labelRows}
        onSeeShelf={vi.fn()}
        rolesWithShelves={ALL_SHELVES}
      />,
    );
    expect(cellFor("ramp", 1)).not.toBeNull();
    expect(cellFor("draw", 2)).not.toBeNull();
  });

  it("says nothing about a card with no label, and counts it by its text", () => {
    render(<RoleCounterStrip mix={TEST_MIX} cards={[card("ramp", 0), card("ramp", 1)]} labelRows={{ "o-ramp-0": ["ramp"] }} onSeeShelf={vi.fn()} rolesWithShelves={ALL_SHELVES} />);
    fireEvent.click(screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle }));
    expect(screen.queryByText(/no label|their text|its text/i)).toBeNull();
    expect(cellFor("ramp", 2)).not.toBeNull();
  });
});
