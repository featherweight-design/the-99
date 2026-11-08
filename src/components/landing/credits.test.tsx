import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { landingCopy } from "../../lib/copy/landing";
import type { LandingClaims } from "../../lib/public/landing-claims";
import { Credits, coversEveryToolThreeTimes } from "./credits";

const ON: LandingClaims = { welcome: { units: 15, days: 30 }, buying: { pack: { units: 40, priceCents: 500 }, plan: { units: 50, priceCents: 500 } }, suggestedTwo: true, publicPages: true };
const c = landingCopy.credits;

describe("Credits", () => {
  it("leads with the welcome credits, then the daily credit, then the columns", () => {
    render(<Credits claims={ON} />);
    const value = screen.getByTestId("landing-value");
    expect(within(value).getByText(c.welcome.label)).toBeInTheDocument();
    expect(within(value).getByText(c.welcome.note(30))).toBeInTheDocument();
    expect(within(value).getByText(c.daily.label)).toBeInTheDocument();
    expect(within(value).getByText(c.daily.note)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([c.free.title, `${c.paid.title}${c.paid.chip}`]);
  });

  it("says one free credit a day that comes back after 24 hours, never +1 or a free run", () => {
    render(<Credits claims={ON} />);
    const daily = within(screen.getByTestId("landing-value")).getByText(c.daily.label);
    expect(daily.parentElement?.querySelector("b")?.textContent).toBe(c.daily.figure);
    expect(daily.parentElement).toHaveTextContent(c.daily.note);
    const text = screen.getByTestId("landing-credits").textContent ?? "";
    expect(text).not.toMatch(/\+1|free run|every day/i);
  });

  it("draws the three-times sentence with its Suggested changes qualifier only while the 2-credit rule is live", () => {
    const { unmount } = render(<Credits claims={ON} />);
    expect(screen.getByText(new RegExp(c.enoughV2.replace(/[()]/g, "\\$&")))).toBeInTheDocument();
    unmount();
    render(<Credits claims={{ ...ON, suggestedTwo: false }} />);
    expect(screen.getByText(new RegExp(c.enough))).toBeInTheDocument();
    expect(screen.queryByText(/up to 10 changes/)).toBeNull();
  });

  it("omits every welcome line when welcome credits are off, and the three-times claim with it", () => {
    render(<Credits claims={{ ...ON, welcome: null }} />);
    expect(screen.queryByText(c.welcome.label)).toBeNull();
    expect(screen.queryByText(/three times/)).toBeNull();
    expect(screen.getByText(c.daily.label)).toBeInTheDocument();
  });

  it("draws the chip on the credits column: 1–2 per run under the 2-credit rule, 1 per run without it", () => {
    const { unmount } = render(<Credits claims={ON} />);
    expect(screen.getByText(c.paid.chip)).toBeInTheDocument();
    unmount();
    render(<Credits claims={{ ...ON, suggestedTwo: false }} />);
    expect(screen.getByText(c.paid.chipOne)).toBeInTheDocument();
    expect(screen.queryByText(c.paid.chip)).toBeNull();
  });

  it("with welcome credits off and payments on, the buy line has its own words, not Keep going", () => {
    render(<Credits claims={{ ...ON, welcome: null }} />);
    expect(screen.getByText(new RegExp(c.moreCredits))).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(c.keepGoing))).toBeNull();
  });

  it("omits the pack and plan line and the price link when payments are off", () => {
    render(<Credits claims={{ ...ON, buying: null }} />);
    expect(screen.queryByRole("button", { name: c.costLink })).toBeNull();
    expect(screen.queryByText(new RegExp(c.keepGoing))).toBeNull();
    expect(screen.queryByText(new RegExp(c.moreCredits))).toBeNull();
  });

  it("draws the link only when payments are on, and puts no price on the page itself", () => {
    render(<Credits claims={ON} />);
    expect(screen.getByRole("button", { name: c.costLink })).toBeInTheDocument();
    expect(screen.getByTestId("landing-credits").textContent).not.toMatch(/\$\d/);
  });

  it("states the cost of each paid tool, Suggested changes as 1 to 2 credits only under the 2-credit rule", () => {
    const { unmount } = render(<Credits claims={ON} />);
    expect(screen.getByText(c.suggestedV2)).toBeInTheDocument();
    unmount();
    render(<Credits claims={{ ...ON, suggestedTwo: false }} />);
    expect(screen.queryByText(c.suggestedV2)).toBeNull();
    expect(screen.getAllByText(c.one)).toHaveLength(5);
  });

  it("draws the picture only for a grant of exactly three runs of the five tools", () => {
    expect(coversEveryToolThreeTimes({ units: 15, days: 30 })).toBe(true);
    expect(coversEveryToolThreeTimes({ units: 10, days: 30 })).toBe(false);
    expect(coversEveryToolThreeTimes(null)).toBe(false);
    render(<Credits claims={{ ...ON, welcome: { units: 10, days: 30 } }} />);
    expect(screen.queryByText(c.threeTimes(10))).toBeNull();
  });

  it("opens and closes the cost sheet with the figures it was handed", () => {
    render(<Credits claims={{ ...ON, buying: { pack: { units: 40, priceCents: 500 }, plan: { units: 50, priceCents: 500 } } }} />);
    act(() => { fireEvent.click(screen.getByRole("button", { name: c.costLink })); });
    const dialog = screen.getByRole("dialog", { name: landingCopy.sheet.title });
    expect(within(dialog).getByText("$5")).toBeInTheDocument();
    expect(within(dialog).getByText("$5 a month")).toBeInTheDocument();
    expect(within(dialog).getByText(landingCopy.sheet.pack.line(40))).toBeInTheDocument();
    expect(within(dialog).getByText(landingCopy.sheet.plan.line(50))).toBeInTheDocument();
  });
});
