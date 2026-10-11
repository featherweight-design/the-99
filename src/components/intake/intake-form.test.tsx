// The form mounts where the platform lacks ResizeObserver (older WebViews): the dock is measured
// once and on resize instead, and the form renders rather than throwing on mount.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn(async (query: string) => { void query; return { kind: "refused" as const }; }));
vi.mock("../../app/decks/new/choose/actions", () => ({ submitChoose: push }));

const { IntakeForm } = await import("./intake-form");
const { emptyParams } = await import("../../lib/intake/params");

const saved = globalThis.ResizeObserver;
afterEach(() => {
  globalThis.ResizeObserver = saved;
});

describe("the intake form", () => {
  it("renders with no ResizeObserver, and listens for resizes instead", () => {
    // @ts-expect-error: the platform this guards has none.
    delete globalThis.ResizeObserver;
    const listen = vi.spyOn(window, "addEventListener");
    render(<IntakeForm themes={[]} initial={emptyParams()} />);
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
    expect(listen.mock.calls.some(([type]) => type === "resize")).toBe(true);
    listen.mockRestore();
  });
});

describe("the Theme field's join", () => {
  const themes = [
    { slug: "orcs", label: "Orcs", commanders: 20 },
    { slug: "elves", label: "Elves", commanders: 98 },
  ];
  const group = () => screen.getByRole("radiogroup", { name: "Themes: all or any" });

  it("is greyed below two themes and keeps its value there", () => {
    render(<IntakeForm themes={themes} initial={{ ...emptyParams(), themes: ["orcs"], themeJoin: "any" }} />);
    expect(group().getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(within(group()).getByRole("radio", { name: "All" }));
    expect(within(group()).getByRole("radio", { name: "Any" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("EDHREC’s theme tags. Pick more than one if you like.")).toBeTruthy();
  });

  it("from two themes, says its rule and sends it with the submit", () => {
    push.mockClear();
    render(<IntakeForm themes={themes} initial={{ ...emptyParams(), themes: ["orcs", "elves"] }} />);
    expect(group().getAttribute("aria-disabled")).toBeNull();
    expect(screen.getByText("All of these: a commander has to fit every one.")).toBeTruthy();
    fireEvent.click(within(group()).getByRole("radio", { name: "Any" }));
    expect(screen.getByText("Any of these: a commander has to fit one, and ranks by the one it fits best.")).toBeTruthy();
    fireEvent.submit(group().closest("form")!);
    expect(String(push.mock.calls[0][0])).toContain("tj=any");
  });
});

describe("Cards for the 99", () => {
  it("sends own-only with the submit, and says the budget caps the commander and a card it would buy", () => {
    push.mockClear();
    render(<IntakeForm themes={[]} initial={emptyParams()} />);
    const group = screen.getByRole("radiogroup", { name: "Cards for the 99" });
    fireEvent.click(within(group).getByRole("radio", { name: "Only cards I own" }));
    expect(screen.getByText("With the 99 from your cards, this caps the commander and any card you ask for that you’d have to buy. It never ranks.")).toBeTruthy();
    fireEvent.submit(group.closest("form")!);
    expect(String(push.mock.calls[0][0])).toContain("pool=own");
  });
});

describe("Anything else? (the read addendum, 7a to 7c and 7n)", () => {
  const now = "2026-10-11T12:00:00.000Z";
  const credit = { used: 1, limit: 10, nextAt: "2026-10-12T02:01:00.000Z", reopensAt: null, paused: null, ownerShare: false, now };
  const box = () => screen.getByLabelText(/Anything else\?/);
  const presses = () => screen.getAllByRole("button", { name: /Find commanders|1 credit/ });

  it("is the form's last field, marked optional", () => {
    render(<IntakeForm themes={[]} initial={emptyParams()} standing={credit} />);
    const fields = screen.getAllByRole("textbox");
    expect(fields[fields.length - 1]).toBe(box());
    expect(screen.getByText("optional")).toBeTruthy();
  });

  it("7a: empty, the press is plain and says nothing of credits", () => {
    render(<IntakeForm themes={[]} initial={emptyParams()} standing={credit} />);
    expect(screen.queryByText("1 credit")).toBeNull();
    expect(screen.queryByText(/Uses a credit/)).toBeNull();
  });

  it("7b: with text and a credit free, the press carries the pill and the first-use line", () => {
    render(<IntakeForm themes={[]} initial={{ ...emptyParams(), words: "scary horrors" }} standing={credit} />);
    expect(screen.getAllByText("1 credit").length).toBeGreaterThan(0);
    expect(presses()[0].getAttribute("aria-label")).toBe("1 credit. Find commanders and read what you wrote.");
    expect(screen.getAllByText(/Uses a credit\. 9 of 10 left/).length).toBeGreaterThan(0);
    expect(screen.getByText("13 / 800")).toBeTruthy();
    // 32 on the phone's 48 button, 30 on the desktop's 44 (the read's design table).
    expect(screen.getAllByText("1 credit")[0].className).toContain("h-[32px] md:h-[30px]");
  });

  it("7c: with text and no credit, no pill, and the line says the words won't be read", () => {
    render(<IntakeForm themes={[]} initial={{ ...emptyParams(), words: "scary" }} standing={{ ...credit, used: 10 }} />);
    expect(screen.queryByText("1 credit")).toBeNull();
    expect(screen.getAllByText(/^Won’t be read: 0 of 10 left/).length).toBeGreaterThan(0);
    expect(screen.getByText("Kept here for when a credit comes back.")).toBeTruthy();
  });

  it("leaves the line out of the server's HTML, which cannot know the reader's time zone", () => {
    const html = renderToString(<IntakeForm themes={[]} initial={{ ...emptyParams(), words: "scary" }} standing={{ ...credit, used: 10 }} />);
    expect(html).not.toContain("Won’t be read");
  });

  it("7n: paused says why, before a spent allowance", () => {
    render(<IntakeForm themes={[]} initial={{ ...emptyParams(), words: "scary" }} standing={{ ...credit, used: 10, paused: "2026-11-01T00:00:00.000Z" }} />);
    expect(screen.getAllByText(/^Paused until November 1\./).length).toBeGreaterThan(0);
    expect(screen.queryByText("1 credit")).toBeNull();
  });

  it("draws the plain press when the standing could not be read", () => {
    render(<IntakeForm themes={[]} initial={{ ...emptyParams(), words: "scary" }} standing={null} />);
    expect(screen.queryByText("1 credit")).toBeNull();
    expect(screen.queryByText(/Uses a credit|Won’t be read|left/)).toBeNull();
  });

  it("submits the words whole with the answers, and never a card", () => {
    push.mockClear();
    render(<IntakeForm themes={[]} initial={{ ...emptyParams(), card: "11111111-1111-4111-8111-111111111111", words: "x" }} standing={credit} />);
    fireEvent.change(box(), { target: { value: "a Landfall deck unlike mine" } });
    fireEvent.click(presses()[0]);
    const sent = new URLSearchParams(String(push.mock.calls[0][0]).slice(1));
    expect(sent.get("w")).toBe("a Landfall deck unlike mine");
    expect(sent.get("a")).toBeNull();
  });
});
