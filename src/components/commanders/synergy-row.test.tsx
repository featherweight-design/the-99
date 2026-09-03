import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SynergyRow } from "./synergy-row";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";
import type { CardFacet } from "../../lib/cards/facet";
import { CardDetailProvider } from "../cards/card-detail-provider";

const base: SynergyCard = {
  oracleId: "a", name: "Command Tower", typeLine: "Land — Gate",
  facet: "land", inclusionPct: 82, synergyPts: 1, owned: true,
};

type MountProps = {
  card?: SynergyCard;
  selected?: boolean;
  onToggle?: () => void;
  siblings?: string[];
  width?: "desktop" | "phone";
  facet?: CardFacet | "all";
};

function mount(props: MountProps = {}) {
  const {
    card = base,
    selected = false,
    onToggle = () => {},
    siblings = ["a"],
    width = "desktop",
    facet = "land",
  } = props;
  return render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <SynergyRow card={card} selected={selected} onToggle={onToggle} siblings={siblings} width={width} facet={facet} />
    </CardDetailProvider>,
  );
}

describe("SynergyRow", () => {
  it("states a single point in the singular", () => {
    mount();
    expect(screen.getByText("+1 pt")).toBeInTheDocument();
  });

  it("draws a negative figure with a minus sign, not a hyphen", () => {
    mount({ card: { ...base, synergyPts: -5 } });
    expect(screen.getByText("−5 pts")).toBeInTheDocument();
  });

  // An absent synergy must not suppress a real inclusion beside it.
  it("draws each figure's absence independently", () => {
    mount({ card: { ...base, synergyPts: null } });
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBe(1);
  });

  // Slot 3: under a single facet the pill already names the bucket, so the
  // column earns its width by printing the subtype.
  it("prints the full type line under a single facet", () => {
    mount({ facet: "land" });
    expect(screen.getByText("Land — Gate")).toBeInTheDocument();
  });

  // …and under All the list is mixed, so the bucket is the useful thing.
  it("prints the bucket alone under the All facet", () => {
    mount({ facet: "all" });
    expect(screen.getByText("Land")).toBeInTheDocument();
    expect(screen.queryByText("Land — Gate")).not.toBeInTheDocument();
  });

  it("names ownership in the accessible name rather than by colour alone", () => {
    mount({ card: { ...base, owned: false } });
    expect(screen.getByLabelText(/Not in your collection/)).toBeInTheDocument();
  });

  it("toggles through an aria-pressed button", () => {
    const onToggle = vi.fn();
    mount({ onToggle });
    const toggle = screen.getByRole("button", { name: synergyCopy.select.addAria("Command Tower") });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("offers the remove label once selected", () => {
    mount({ selected: true });
    expect(
      screen.getByRole("button", { name: synergyCopy.select.removeAria("Command Tower") }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("drops the type column at phone width and prefixes the inclusion figure", () => {
    mount({ width: "phone" });
    expect(screen.queryByText("Land — Gate")).not.toBeInTheDocument();
    expect(screen.getByText(/edhrec 82%/)).toBeInTheDocument();
  });
});
