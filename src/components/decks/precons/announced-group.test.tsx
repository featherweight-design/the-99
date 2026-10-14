import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnnouncedMatch } from "../../../lib/precons/arrivals";
import type { RevealedCommander } from "../../../lib/precons/revealed";
import type { UpcomingSet } from "../../../lib/precons/upcoming";
import { ANNOUNCED_KEY, AnnouncedGroup, type AnnouncedGroupProps } from "./announced-group";

const set = (code: string, name: string, releasesOn: string, over: Partial<UpcomingSet> = {}): UpcomingSet => ({
  code, name, releasesOn, released: false, cardCount: 40, parentName: null, arrivedAt: null, seen: false, ...over,
});
const commander = (n: number, name = `TRC commander ${n}`, colorIdentity = ["W"]): RevealedCommander => ({
  oracleId: `o${n}`, name, colorIdentity, imageUriSmall: `https://img/${n}.jpg`, collectorNumber: String(n),
});
const match = (s: UpcomingSet, commanders: RevealedCommander[], revealed = commanders.length): AnnouncedMatch => ({
  set: s, commanders, matched: commanders.length, revealed,
});

const trcCards = [commander(78, "Christine Chapel, Combat Medic"), ...Array.from({ length: 14 }, (_, i) => commander(100 + i))];
const trc = match(set("trc", "Star Trek Commander", "2026-11-13"), trcCards);
const mdc = match(set("mdc", "Darkhold Destiny Commander", "2027-04-09"), [commander(1, "Gargantos, the Endbringer", ["B", "G"])]);

const draw = (over: Partial<AnnouncedGroupProps> = {}) =>
  render(
    <AnnouncedGroup matches={[trc, mdc]} today="2026-10-14" newCodes={[]} opensByItself={false} view="tiles" listed={{}} {...over} />,
  );
const head = () => screen.getByRole("button", { name: /^Announced/ });
const region = (container: HTMLElement) => container.querySelector("#announced-sets") as HTMLElement;

describe("AnnouncedGroup", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/decks/precons");
  });

  it("is closed by default, a heading button with the count and the next release (C1)", () => {
    const { container } = draw();
    expect(screen.getByRole("heading", { level: 2 })).toContainElement(head());
    expect(head()).toHaveAttribute("aria-expanded", "false");
    expect(head()).toHaveAttribute("aria-controls", "announced-sets");
    expect(head()).toHaveTextContent("2 sets · next Nov 13");
    expect(region(container)).toHaveAttribute("inert");
  });

  it("opens by itself when it holds news, and shows the new tag (C2)", () => {
    const { container } = draw({ opensByItself: true, newCodes: ["trc"] });
    expect(head()).toHaveAttribute("aria-expanded", "true");
    expect(head()).toHaveTextContent("2 sets");
    expect(head()).not.toHaveTextContent("next");
    expect(region(container)).not.toHaveAttribute("inert");
    const trcBlock = screen.getAllByTestId("announced-set")[0];
    expect(within(trcBlock).getByRole("heading", { level: 3 })).toHaveTextContent("Star Trek Commander");
    expect(within(trcBlock).getByText("new")).toBeInTheDocument();
  });

  it("opens by itself on the banner's #announced link", () => {
    window.history.replaceState(null, "", "/decks/precons?sort=newest#announced");
    draw();
    expect(head()).toHaveAttribute("aria-expanded", "true");
  });

  it("holds this browser's last press when there is no news, and a press writes it", () => {
    window.localStorage.setItem(ANNOUNCED_KEY, "open");
    const { unmount } = draw();
    expect(head()).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(head());
    expect(head()).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem(ANNOUNCED_KEY)).toBe("closed");
    unmount();
    draw();
    expect(head()).toHaveAttribute("aria-expanded", "false");
  });

  it("lets news open it over a stored close, and a press still closes it", () => {
    window.localStorage.setItem(ANNOUNCED_KEY, "closed");
    draw({ opensByItself: true, newCodes: ["trc"] });
    expect(head()).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(head());
    expect(head()).toHaveAttribute("aria-expanded", "false");
  });

  it("names every revealed card in text, with its full name and colors spoken (T4, T5)", () => {
    draw({ opensByItself: true });
    const [trcBlock, mdcBlock] = screen.getAllByTestId("announced-set");
    expect(within(trcBlock).getAllByTestId("revealed-card")).toHaveLength(15);
    expect(within(trcBlock).getByText("Christine Chapel, Combat Medic, White. Revealed commander.")).toBeInTheDocument();
    expect(within(trcBlock).getByText("TRC · Nov 13, 2026 · in 30 days · 15 commanders revealed")).toBeInTheDocument();
    expect(within(trcBlock).getByText("Nov 13, 2026 · in 30 days")).toBeInTheDocument();
    expect(within(mdcBlock).getByText("MDC · Apr 9, 2027 · in 6 months · 1 commander revealed")).toBeInTheDocument();
    expect(within(mdcBlock).getByText("Gargantos, the Endbringer, Black, Green. Revealed commander.")).toBeInTheDocument();
  });

  it("draws one plate for a set with none revealed (T2)", () => {
    draw({ matches: [match(set("mdc", "Darkhold Destiny Commander", "2027-04-09"), [])], opensByItself: true });
    expect(screen.getByTestId("none-plate")).toHaveTextContent("none revealed yet");
    expect(screen.getByText("MDC · Apr 9, 2027 · in 6 months · no commanders revealed yet")).toBeInTheDocument();
  });

  it("reads `out` on release day, and offers the jump to listed decklists (L1, L2)", () => {
    const out = match(set("trc", "Star Trek Commander", "2026-11-13", { released: true }), trcCards);
    draw({ matches: [out, mdc], today: "2026-11-13", opensByItself: true, listed: { mdc: { count: 2, year: "2027" } } });
    expect(screen.getByText("TRC · out Nov 13, 2026 · decklists not listed yet · 15 commanders revealed")).toBeInTheDocument();
    expect(screen.getByText("Out Nov 13, 2026 · decklists not listed yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "2 decklists listed ↓" })).toHaveAttribute("href", "#precons-2027");
    // The next release a closed head names is the next one still to come.
    fireEvent.click(head());
    expect(head()).toHaveTextContent("2 sets · next Apr 9");
  });

  it("says how many of the revealed match when a filter narrowed them (T6)", () => {
    draw({ matches: [match(trc.set, [trcCards[0]], 15)], opensByItself: true });
    expect(screen.getByText("TRC · Nov 13, 2026 · in 30 days · 1 of 15 revealed matches")).toBeInTheDocument();
    expect(head()).toHaveTextContent("1 set");
  });

  it("draws nothing when no set survives (T1, T9)", () => {
    const { container } = draw({ matches: [] });
    expect(container).toBeEmptyDOMElement();
  });

  describe("rows (Q1–Q3)", () => {
    it("takes the same closed head, then one precon-shaped row per set", () => {
      draw({ view: "rows" });
      expect(head()).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(head());
      const [trcRow, mdcRow] = screen.getAllByTestId("announced-row");
      expect(within(trcRow).getByText("Christine Chapel, Combat Medic and 14 more")).toBeInTheDocument();
      expect(within(trcRow).getByText("in 30 days")).toBeInTheDocument();
      expect(within(trcRow).getByText("TRC · Nov 13, 2026")).toBeInTheDocument();
      expect(within(mdcRow).getAllByText("Gargantos, the Endbringer")[0]).toHaveClass("truncate");
      expect(within(mdcRow).getByText("in 6 months")).toBeInTheDocument();
    });

    it("opens a row's cards under its own disclosure, closed every visit", () => {
      draw({ view: "rows", opensByItself: true });
      const trcRow = screen.getAllByTestId("announced-row")[0];
      const press = within(trcRow).getByRole("button");
      expect(within(trcRow).getByRole("heading", { level: 3 })).toContainElement(press);
      expect(press).toHaveAttribute("aria-expanded", "false");
      expect(within(trcRow).queryAllByTestId("revealed-card").filter((c) => c.closest("[hidden]") === null)).toHaveLength(0);
      fireEvent.click(press);
      expect(press).toHaveAttribute("aria-expanded", "true");
      expect(within(trcRow).getAllByTestId("revealed-card").filter((c) => c.closest("[hidden]") === null)).toHaveLength(15);
    });

    it("does not open a set with nothing revealed (R2)", () => {
      draw({ view: "rows", opensByItself: true, matches: [match(set("mdc", "Darkhold Destiny Commander", "2027-04-09"), [])] });
      const row = screen.getByTestId("announced-row");
      expect(within(row).queryByRole("button")).toBeNull();
      expect(within(row).getByText("No commanders revealed yet")).toBeInTheDocument();
      expect(within(row).getByTestId("row-plate")).toBeInTheDocument();
    });
  });
});
