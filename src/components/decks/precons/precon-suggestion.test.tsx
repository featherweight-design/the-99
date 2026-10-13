import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { suggestionDismissKey, type PreconMatch } from "../../../lib/precons/link";

const linkActions = vi.hoisted(() => ({ linkPrecon: vi.fn(), unlinkPrecon: vi.fn() }));
vi.mock("../../../app/decks/precon-link-actions", () => linkActions);
import { PreconSuggestion } from "./precon-suggestion";
import { LinkPreconRow } from "./precon-link-dialogs";

const match = (name: string, shared: number, of: number, sameCommanders: boolean, over: Partial<PreconMatch> = {}): PreconMatch => ({
  fileName: name.replace(/\W/g, ""), name, setCode: "CMM", releaseDate: "2023-08-04", commanders: ["Ulalek, Fused Atrocity"],
  leadImage: null, cards: 99, shared, of, sameCommanders, ...over,
});
const eldrazi = match("Eldrazi Unbound", 73, 85, true);
const counter = match("Counter Intelligence", 64, 91, false, { commanders: ["Kilo, Apogee Mind"], setCode: "EOC", releaseDate: "2025-08-01" });

beforeEach(() => { window.localStorage.clear(); linkActions.linkPrecon.mockReset(); });

describe("PreconSuggestion", () => {
  it("names the precon and the count, never a verdict (K1)", () => {
    render(<PreconSuggestion deckId="d1" deckName="HD - Eldrazi" suggestions={[eldrazi]} />);
    expect(screen.getByText("Looks like this started as Eldrazi Unbound.")).toBeInTheDocument();
    expect(screen.getByText("73 of its 85 cards are in this deck · same commander")).toBeInTheDocument();
  });

  it("says commanders for a pair precon the deck kept both of", () => {
    const pair = match("Food and Fellowship", 70, 84, true, { commanders: ["Frodo, Adventurous Hobbit", "Sam, Loyal Attendant"] });
    render(<PreconSuggestion deckId="d2" deckName="Shire" suggestions={[pair]} />);
    expect(screen.getByText("70 of its 84 cards are in this deck · same commanders")).toBeInTheDocument();
  });

  it("says a swapped commander in the sentence and names the precon's (K2)", () => {
    render(<PreconSuggestion deckId="d1" deckName="Kilo" suggestions={[counter]} />);
    expect(screen.getByText("Looks like this started as Counter Intelligence, with a different commander.")).toBeInTheDocument();
    expect(screen.getByText("64 of its 91 cards are in this deck · led by Kilo, Apogee Mind")).toBeInTheDocument();
  });

  it("remembers ✕ in this browser per deck and precon, and writes nothing (K1d)", () => {
    const { unmount } = render(<PreconSuggestion deckId="d1" deckName="HD - Eldrazi" suggestions={[eldrazi]} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss the suggestion that this started as Eldrazi Unbound" }));
    expect(screen.queryByText(/Looks like/)).toBeNull();
    expect(window.localStorage.getItem(suggestionDismissKey("d1", eldrazi.fileName))).toBe("1");
    unmount();
    // Another precon crossing the rule later still suggests.
    render(<PreconSuggestion deckId="d1" deckName="HD - Eldrazi" suggestions={[counter]} />);
    expect(screen.getByText(/Counter Intelligence/)).toBeInTheDocument();
    expect(linkActions.linkPrecon).not.toHaveBeenCalled();
  });

  it("names two precons in one strip, a Link each, and ✕ dismisses both (K15)", () => {
    render(<PreconSuggestion deckId="d1" deckName="HD" suggestions={[eldrazi, counter]} />);
    expect(screen.getByText("Looks like this started as one of two precons")).toBeInTheDocument();
    // Each `Link` names its precon to a screen reader.
    expect(screen.getByRole("button", { name: "Link Eldrazi Unbound" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link Counter Intelligence" })).toBeInTheDocument();
    expect(screen.getByText("EOC · Aug 2025 · led by Kilo, Apogee Mind · 64 of its 91 cards are in this deck")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Dismiss/ }));
    expect(screen.queryByText(/Looks like/)).toBeNull();
    expect(window.localStorage.getItem(suggestionDismissKey("d1", counter.fileName))).toBe("1");
  });

  it("confirms before linking, with the precon's own card count (K3), and keeps the dialog on a failure", async () => {
    linkActions.linkPrecon.mockRejectedValueOnce(new Error("boom"));
    render(<PreconSuggestion deckId="d1" deckName="HD - Eldrazi" suggestions={[eldrazi]} />);
    fireEvent.click(screen.getByRole("button", { name: "Link it" }));
    const dialog = screen.getByRole("dialog", { name: "Link HD - Eldrazi to Eldrazi Unbound" });
    expect(within(dialog).getByText("Eldrazi Unbound · 99 cards · before v1")).toBeInTheDocument();
    expect(within(dialog).getByText("73 of its 85")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Link" }));
    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent("That didn’t link. Try again."));
    expect(linkActions.linkPrecon).toHaveBeenCalledWith("d1", "EldraziUnbound");
  });
});

describe("LinkPreconRow", () => {
  const open = () => {
    render(<LinkPreconRow deckId="d1" deckName="HD - Zombies" picker={[
      match("Wretched Ranks", 13, 67, true, { commanders: ["Ghoulcaller Gisa"] }),
      match("Undead Unleashed", 9, 79, false, { commanders: ["Wilhelt, the Rotcleaver"] }),
    ]} />);
    fireEvent.click(screen.getByRole("button", { name: "Link a precon" }));
    return screen.getByRole("dialog", { name: "Which precon was HD - Zombies built from?" });
  };

  it("asks for a selection with the button disabled until one is made (K6n)", () => {
    const dialog = open();
    expect(within(dialog).getByText("Select a precon to link.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Link" })).toBeDisabled();
  });

  it("selects and unselects a row, and names the selection in the button (K6)", async () => {
    linkActions.linkPrecon.mockResolvedValueOnce(undefined);
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Select Wretched Ranks" }));
    expect(within(dialog).getByRole("radio", { name: "Unselect Wretched Ranks" })).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByText("Linking adds v0 before v1. Your cards don’t change.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Unselect Wretched Ranks" }));
    expect(within(dialog).getByRole("button", { name: "Link" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Select Undead Unleashed" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Link Undead Unleashed" }));
    await waitFor(() => expect(linkActions.linkPrecon).toHaveBeenCalledWith("d1", "UndeadUnleashed"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("searches the precons by name, commander or set", () => {
    const dialog = open();
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "wilhelt" } });
    expect(within(dialog).getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual(["Select Undead Unleashed"]);
  });

  it("is one tab stop, and the arrows move the selection and the focus, wrapping", () => {
    const dialog = open();
    const radios = () => within(dialog).getAllByRole("radio");
    expect(radios().map((r) => r.tabIndex)).toEqual([0, -1]);
    fireEvent.keyDown(radios()[0], { key: "ArrowDown" });
    expect(radios()[1]).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(radios()[1]);
    expect(radios().map((r) => r.tabIndex)).toEqual([-1, 0]);
    fireEvent.keyDown(radios()[1], { key: "ArrowDown" });
    expect(radios()[0]).toHaveAttribute("aria-checked", "true");
  });

  it("says a search matched nothing, rather than drawing an empty list", () => {
    const dialog = open();
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "zzz" } });
    expect(within(dialog).queryAllByRole("radio")).toHaveLength(0);
    expect(within(dialog).getByText("No precon matches “zzz”")).toBeInTheDocument();
  });
});

// Hugh, 2026-10-13: the strip was too tall. Link it sits on the heading's line and ✕ in the corner; only
// a width under 360px stacks them.
describe("PreconSuggestion layout", () => {
  it("puts Link it beside the text from 360px up, stacks it only below, and pins ✕ to the top", () => {
    render(<PreconSuggestion deckId="d1" deckName="HD - Eldrazi" suggestions={[eldrazi]} />);
    const link = screen.getByRole("button", { name: "Link it" });
    const row = link.parentElement!;
    expect(row.className).toContain("min-[360px]:flex-row");
    expect(row.className).not.toContain("md:flex-row");
    expect(link.className).toContain("min-[360px]:self-auto");
    expect(screen.getByRole("button", { name: /^Dismiss/ }).className).toContain("self-start");
  });
});
