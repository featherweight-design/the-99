// The strip's shelf link is conditional on being under target, which is the
// whole point of it: a link under every cell would be noise, and a link under
// none of them would leave the coverage numbers as a diagnosis with no
// treatment. Both halves of that condition are asserted here.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { RECOMMENDED_MIX } from "../../lib/decks/mix";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { RoleCounterStrip } from "./role-counter-strip";

const card = (role: DeckDetailCard["role"], i: number): DeckDetailCard => ({
  oracleId: `o-${role}-${i}`,
  name: `${role} ${i}`,
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role,
  owned: true,
  quantity: 1,
});

// Enough ramp to sit ON target, so ramp is the control and every other role
// is under target by construction.
const rampAtTarget = Array.from({ length: RECOMMENDED_MIX.ramp.target }, (_, i) =>
  card("ramp", i),
);

const linkFor = (label: string) =>
  screen.queryByRole("link", { name: addPanelCopy.strip.shelfLinkAria(label) });

describe("role counter strip — shelf links", () => {
  it("links a cell that is under target", () => {
    render(<RoleCounterStrip cards={[]} onSeeShelf={vi.fn()} />);
    expect(linkFor(RECOMMENDED_MIX.ramp.label.toLowerCase())).toBeInTheDocument();
  });

  it("leaves a cell that has met its target unlinked", () => {
    render(<RoleCounterStrip cards={rampAtTarget} onSeeShelf={vi.fn()} />);
    expect(linkFor(RECOMMENDED_MIX.ramp.label.toLowerCase())).toBeNull();
    // A sibling still short proves the strip is drawing links at all, rather
    // than the assertion above passing because nothing rendered.
    expect(linkFor(RECOMMENDED_MIX.draw.label.toLowerCase())).toBeInTheDocument();
  });

  it("switches the builder to Consider rather than relying on the anchor", () => {
    const onSeeShelf = vi.fn();
    render(<RoleCounterStrip cards={[]} onSeeShelf={onSeeShelf} />);
    fireEvent.click(linkFor(RECOMMENDED_MIX.ramp.label.toLowerCase())!);
    // Without this the href lands on a panel the deck tab has unmounted.
    expect(onSeeShelf).toHaveBeenCalled();
  });

  it("draws no links at all when the strip is given nowhere to send the user", () => {
    render(<RoleCounterStrip cards={[]} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
