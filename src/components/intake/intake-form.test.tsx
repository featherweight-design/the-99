// The form mounts where the platform lacks ResizeObserver (older WebViews): the dock is measured
// once and on resize instead, and the form renders rather than throwing on mount.

import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("describes each press by its own line, so the words going unread is announced with the button", () => {
    render(<IntakeForm themes={[]} initial={{ ...emptyParams(), words: "scary" }} standing={{ ...credit, used: 10 }} />);
    const presses = screen.getAllByRole("button", { name: "Find commanders" });
    expect(presses).toHaveLength(2);
    for (const b of presses) {
      expect(b.getAttribute("aria-describedby")).toBeTruthy();
      expect(document.getElementById(b.getAttribute("aria-describedby")!)!.textContent).toMatch(/^Won’t be read/);
    }
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

  it("begins one read for a double click in one tick", () => {
    push.mockClear();
    render(<IntakeForm themes={[]} initial={{ ...emptyParams(), words: "x" }} standing={credit} />);
    // One act, so React commits nothing between the two presses: the same tick a double click lands in.
    const press = presses()[0];
    act(() => { press.click(); press.click(); });
    expect(push).toHaveBeenCalledTimes(1);
  });

  describe("the press answers at once, before the server round trip", () => {
    // A submit that has not come back: the page is still the form, as it is for seconds on a slow
    // connection while the Server Action loads the pool.
    const slow = () => {
      let release!: () => void;
      push.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ kind: "refused" as const }); }));
      return () => act(async () => { release(); });
    };

    it("hairlines a paid press, keeps its pill and says Reading…, on both the desktop and phone buttons", async () => {
      push.mockClear();
      const settle = slow();
      render(<IntakeForm themes={[]} initial={{ ...emptyParams(), words: "scary" }} standing={credit} />);
      await act(async () => { fireEvent.click(presses()[0]); });
      for (const press of presses()) {
        // aria-disabled, not disabled: a disabled button would drop the focus it was pressed with.
        expect(press.getAttribute("aria-disabled")).toBe("true");
        expect(press.hasAttribute("disabled")).toBe(false);
        expect(press.getAttribute("aria-busy")).toBe("true");
        expect(press.textContent).toBe("1 creditReading…");
        expect(press.getAttribute("aria-label")).toBe("1 credit. Reading…");
        expect(press.className).not.toContain("bg-[color:var(--fg)]");
      }
      await settle();
      // A refusal returns the form to what it was.
      for (const press of presses()) {
        expect(press.hasAttribute("aria-disabled")).toBe(false);
        expect(press.textContent).toContain("Find commanders");
      }
    });

    it("ignores a second press while it works", async () => {
      push.mockClear();
      slow();
      render(<IntakeForm themes={[]} initial={{ ...emptyParams(), words: "scary" }} standing={credit} />);
      const press = presses()[0];
      await act(async () => { fireEvent.click(press); });
      await act(async () => { fireEvent.click(press); });
      expect(push).toHaveBeenCalledTimes(1);
    });

    it("greys an unpaid press without changing its words, so its box cannot grow", async () => {
      push.mockClear();
      slow();
      render(<IntakeForm themes={[]} initial={emptyParams()} standing={credit} />);
      await act(async () => { fireEvent.click(presses()[0]); });
      const pending = screen.getAllByRole("button", { name: "Find commanders" });
      expect(pending).toHaveLength(2);
      for (const press of pending) {
        expect(press.getAttribute("aria-disabled")).toBe("true");
        expect(press.getAttribute("aria-busy")).toBe("true");
        expect(press.textContent).toBe("Find commanders");
      }
    });

    it("keeps a paid press paid while its request is in flight, whatever the box now holds", async () => {
      push.mockClear();
      slow();
      render(<IntakeForm themes={[]} initial={{ ...emptyParams(), words: "scary" }} standing={credit} />);
      await act(async () => { fireEvent.click(presses()[0]); });
      // The box stays editable; clearing it must not turn the in-flight press into a free one.
      fireEvent.change(box(), { target: { value: "" } });
      for (const press of presses()) expect(press.textContent).toBe("1 creditReading…");
    });
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
