// @vitest-environment jsdom
// The trade box's feet (friend trades PR 5): their offer with a card gone draws Yes but holds it, while No and
// Counter stay pressable; Counter's accessible name says whose offer it counters; and the traded day is the
// calendar day of the reader's zone.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tradeCopy } from "../../lib/copy/trades";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";
import { tradeDay } from "../../lib/social/when";
import { TradeBox, type TradeBoxProps } from "./trade-tab";

const COLIN = named("Colin");
const A = "00000000-0000-4000-8000-0000000000a1";
const B = "00000000-0000-4000-8000-0000000000b1";

const box = (over: Partial<TradeBoxProps> = {}): TradeBoxProps => ({
  friend: COLIN,
  state: "look",
  fromThem: [{ oracleId: A, name: "Arcane Signet", imageUri: null, gone: true }],
  fromYou: [{ oracleId: B, name: "Brainstorm", imageUri: null }],
  prices: { store: "manapool", cents: {}, dated: null },
  daysLeft: 9,
  busy: null,
  onAnswer: vi.fn(),
  onCounter: vi.fn(),
  ...over,
});

afterEach(cleanup);

describe("TradeBox", () => {
  it("holds Yes on their offer with a card gone, and leaves No and Counter pressable", () => {
    render(<TradeBox {...box()} />);
    expect(screen.getByTestId("spare-yes")).toBeDisabled();
    expect(screen.getByTestId("spare-no")).toBeEnabled();
    expect(screen.getByTestId("trade-counter")).toBeEnabled();
  });

  it("names whose offer Counter counters", () => {
    render(<TradeBox {...box({ state: "theirs", fromThem: [{ oracleId: A, name: "Arcane Signet", imageUri: null }] })} />);
    expect(screen.getByTestId("trade-counter")).toHaveAttribute("aria-label", plain(tradeCopy.counterAria(COLIN)));
  });
});

describe("tradeDay", () => {
  it("is the calendar day in the zone asked for", () => {
    const late = new Date("2026-11-27T03:00:00Z");
    expect(tradeDay(late, "UTC")).toBe("Nov 27");
    expect(tradeDay(late, "America/Los_Angeles")).toBe("Nov 26");
  });
});
