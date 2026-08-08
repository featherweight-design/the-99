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
import { RECOMMENDED_MIX, type MixRole } from "../../lib/decks/mix";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { RoleCounterStrip } from "./role-counter-strip";

const ROLES: MixRole[] = ["ramp", "draw", "removal", "wipes", "land"];

const card = (role: DeckDetailCard["role"], i: number): DeckDetailCard => ({
  oracleId: `o-${role}-${i}`,
  name: `${role} ${i}`,
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role,
  owned: true,
  quantity: 1,
});

/** Enough of one role to sit ON target, leaving every other role short. */
const atTarget = (role: MixRole) =>
  Array.from({ length: RECOMMENDED_MIX[role].target }, (_, i) => card(role, i));

/** Every role at target — the forced state where no cell is a control. */
const allAtTarget = ROLES.flatMap(atTarget);

const cellFor = (role: MixRole, have: number) =>
  screen.queryByRole("button", {
    name: addPanelCopy.strip.cellLinkAria(
      RECOMMENDED_MIX[role].label,
      have,
      RECOMMENDED_MIX[role].target,
    ),
  });

describe("role counter strip — a short cell is the control", () => {
  it("makes a cell under target a button whose name carries both figures", () => {
    render(<RoleCounterStrip cards={[]} onSeeShelf={vi.fn()} />);
    expect(cellFor("ramp", 0)).toBeInTheDocument();
    expect(cellFor("ramp", 0)).toHaveTextContent(addPanelCopy.strip.cellLink);
  });

  it("names the role's shelf, so five cells in a row are told apart", () => {
    const onSeeShelf = vi.fn();
    render(<RoleCounterStrip cards={[]} onSeeShelf={onSeeShelf} />);
    fireEvent.click(cellFor("draw", 0)!);
    expect(onSeeShelf).toHaveBeenCalledWith("draw");
  });

  it("draws no anchor anywhere — the cell replaced the link, it did not join it", () => {
    render(<RoleCounterStrip cards={[]} onSeeShelf={vi.fn()} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  // Six targets, not ten: at most five cells plus the one strip disclosure.
  it("draws one control per short cell plus a single disclosure", () => {
    render(<RoleCounterStrip cards={[]} onSeeShelf={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(ROLES.length + 1);
  });
});

describe("role counter strip — a met cell is a figure", () => {
  it("gives a met cell no button and no consider caption", () => {
    render(<RoleCounterStrip cards={atTarget("ramp")} onSeeShelf={vi.fn()} />);
    expect(cellFor("ramp", RECOMMENDED_MIX.ramp.target)).toBeNull();
    const met = screen.getByRole("figure", {
      name: addPanelCopy.strip.cellStaticAria(
        RECOMMENDED_MIX.ramp.label,
        RECOMMENDED_MIX.ramp.target,
        RECOMMENDED_MIX.ramp.target,
      ),
    });
    expect(met).not.toHaveTextContent(addPanelCopy.strip.cellLink);
    // A sibling still short proves the strip is drawing controls at all,
    // rather than the assertion above passing because nothing rendered.
    expect(cellFor("draw", 0)).toBeInTheDocument();
  });

  it("leaves a met cell out of the tab order", () => {
    render(<RoleCounterStrip cards={atTarget("ramp")} onSeeShelf={vi.fn()} />);
    const met = screen.getByRole("figure", {
      name: addPanelCopy.strip.cellStaticAria(
        RECOMMENDED_MIX.ramp.label,
        RECOMMENDED_MIX.ramp.target,
        RECOMMENDED_MIX.ramp.target,
      ),
    });
    expect(met).not.toHaveAttribute("tabindex");
    met.focus();
    expect(met).not.toHaveFocus();
  });

  // Forced state: every role met. Nothing in the strip is a control except the
  // disclosure, and no cell offers a shelf it cannot deliver.
  it("draws no cell controls at all when every role is met", () => {
    render(<RoleCounterStrip cards={allAtTarget} onSeeShelf={vi.fn()} />);
    expect(screen.getAllByRole("figure")).toHaveLength(ROLES.length);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button")).toHaveAccessibleName(
      addPanelCopy.strip.rationaleToggle,
    );
  });

  // Forced state: every role short. Five controls, one disclosure, six targets.
  it("draws a control on every cell when every role is short", () => {
    render(<RoleCounterStrip cards={[]} onSeeShelf={vi.fn()} />);
    expect(screen.queryAllByRole("figure")).toHaveLength(0);
    for (const role of ROLES) expect(cellFor(role, 0)).toBeInTheDocument();
  });

  // Without a handler there is nowhere to send anyone, so a short cell has to
  // fall back to the figure rather than render a button that does nothing.
  it("falls back to a figure when the strip is given nowhere to send the user", () => {
    render(<RoleCounterStrip cards={[]} />);
    expect(screen.getAllByRole("figure")).toHaveLength(ROLES.length);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

describe("role counter strip — one disclosure for the whole strip", () => {
  it("starts closed with the trigger and no panel", () => {
    render(<RoleCounterStrip cards={[]} onSeeShelf={vi.fn()} />);
    const trigger = screen.getByRole("button", {
      name: addPanelCopy.strip.rationaleToggle,
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(addPanelCopy.strip.rationaleClose)).toBeNull();
  });

  it("opens one panel carrying every role's rationale", () => {
    render(<RoleCounterStrip cards={[]} onSeeShelf={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle }),
    );
    const panel = screen.getByRole("region", { name: addPanelCopy.strip.rationaleToggle });
    for (const body of Object.values(addPanelCopy.strip.rationaleBodies)) {
      expect(panel).toHaveTextContent(body);
    }
    // Four lines for five roles: Removal and Wipes share one, as drawn.
    expect(panel.querySelectorAll("p")).toHaveLength(4);
    // Headings quote RECOMMENDED_MIX, so the panel can never disagree with the
    // cell above it about a target.
    expect(panel).toHaveTextContent(
      `${RECOMMENDED_MIX.removal.label} ${RECOMMENDED_MIX.removal.target} · ${RECOMMENDED_MIX.wipes.label} ${RECOMMENDED_MIX.wipes.target}`,
    );
    expect(panel).toHaveTextContent(`${RECOMMENDED_MIX.land.label} ~${RECOMMENDED_MIX.land.target}`);
  });

  // WCAG 2.5.3: the accessible name has to contain the words on screen, so the
  // authored sentence describes rather than names. It also does not follow the
  // control open — "Show why each role has the target it has" is false once the
  // panel below is already showing the answer.
  it("names the control by its drawn text, and only offers to Show while closed", () => {
    render(<RoleCounterStrip cards={[]} onSeeShelf={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle });
    expect(trigger).toHaveAccessibleDescription(addPanelCopy.strip.rationaleToggleAria);

    fireEvent.click(trigger);

    const open = screen.getByRole("button", { name: addPanelCopy.strip.rationaleToggle });
    expect(open).toHaveAttribute("aria-expanded", "true");
    expect(open).not.toHaveAccessibleDescription(addPanelCopy.strip.rationaleToggleAria);
  });

  it("closes again from Hide", () => {
    render(<RoleCounterStrip cards={[]} onSeeShelf={vi.fn()} />);
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

  // The hazard the addendum called its one genuine shipping risk: `strip.hint`
  // was replaced at the same key, so the superseded clause must be gone from
  // the module and from the rendered strip alike.
  it("ships exactly one live strip hint", () => {
    const { container } = render(<RoleCounterStrip cards={[]} onSeeShelf={vi.fn()} />);
    expect(addPanelCopy.strip.hint).toBe("A cell under target opens its shelf below");
    expect(container.textContent).toContain(addPanelCopy.strip.hint);
    expect(container.textContent).not.toContain("Click a cell for rationale");
    expect(JSON.stringify(addPanelCopy.strip)).not.toContain("links its shelf below");
  });
});

describe("role counter strip — unresolved rows", () => {
  // The strip's contract with unresolved rows is that it has none: no sixth
  // cell, no asterisk on a figure, no adjusted denominator. An unresolved line
  // has no oracle ID and so belongs to no role at all.
  it("gains no cell and no asterisk from unresolved rows", () => {
    const { container } = render(
      <RoleCounterStrip cards={atTarget("ramp")} onSeeShelf={vi.fn()} />,
    );
    const cells = within(screen.getByLabelText("Recommended mix")).getAllByRole(
      "figure",
      { hidden: true },
    ).length;
    expect(cells + screen.getAllByRole("button").length - 1).toBe(
      Object.keys(RECOMMENDED_MIX).length,
    );
    expect(container.textContent).not.toMatch(/unresolved/i);
    expect(container.textContent).not.toContain("*");
  });
});
