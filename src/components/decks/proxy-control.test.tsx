import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const setCardProxied = vi.fn();
vi.mock("../../app/decks/actions", () => ({ setCardProxied: (...a: unknown[]) => setCardProxied(...a) }));

import { ProxyControl } from "./proxy-control";
import { proxyCopy } from "../../lib/copy/proxies";

const onSaved = vi.fn();
const mount = (proxied = false) =>
  render(
    <ProxyControl
      deckId="d1"
      deckName="HD Gods"
      oracleId="o1"
      cardName="The Ozolith"
      proxied={proxied}
      onSaved={onSaved}
    />,
  );

// FILE scope, not inside the first `describe`. Nested, it left a
// never-resolving implementation from one block's in-flight test leaking into
// the next block — where the failure read as a bug in the code under test.
beforeEach(() => {
  setCardProxied.mockReset();
  onSaved.mockReset();
  setCardProxied.mockResolvedValue({ ok: true });
});

describe("the proxy control", () => {

  it("names the deck in the label, not just the heading", async () => {
    // A sheet paged through with Prev/Next is easy to lose your place in, so
    // the name belongs in the sentence the reader is about to act on.
    mount();
    expect(screen.getByText(proxyCopy.control.label("HD Gods"))).toBeTruthy();
  });

  it("marks, and says what did NOT happen alongside what did", async () => {
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(setCardProxied).toHaveBeenCalledWith("d1", "o1", true);
    // "Covered" alone is true and incomplete, and the incomplete half is the one
    // a reader turns into a purchase they never made.
    const marked = screen.getByText(proxyCopy.control.marked("HD Gods"));
    expect(marked.textContent).toContain("No copy in your collection is used");
  });

  it("unmarks on a second press", async () => {
    mount(true);
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(setCardProxied).toHaveBeenCalledWith("d1", "o1", false);
  });

  it("states ruling 2 in both states, and offers no confirm", () => {
    mount();
    expect(screen.getByText(proxyCopy.control.note)).toBeTruthy();
    // Immediate: no Apply, no confirm, no undo receipt. The tick is the receipt.
    expect(screen.queryByRole("button", { name: /apply|confirm/i })).toBeNull();
  });

  it("reverts the tick when the server refuses", async () => {
    // Reachable by being slow: the card left the deck between render and tap.
    setCardProxied.mockResolvedValue({ ok: false, message: "That card isn't in this deck any more." });
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("That card isn't in this deck any more.")).toBeTruthy();
  });

  it("reverts when the action throws", async () => {
    setCardProxied.mockRejectedValue(new Error("network"));
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("invalidates the cached card so the receipt stops being stale", async () => {
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(onSaved).toHaveBeenCalled();
  });

  it("does not invalidate when the write was refused", async () => {
    setCardProxied.mockResolvedValue({ ok: false, message: "nope" });
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("ignores a second tap while the first is in flight", async () => {
    // Two writes whose ORDER the network does not promise: the server could
    // finish `true` last while the reader's last press was `false`.
    let release: (v: unknown) => void = () => {};
    setCardProxied.mockImplementation(() => new Promise((r) => { release = r; }));
    mount();
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(setCardProxied).toHaveBeenCalledTimes(1);
    await act(async () => { release({ ok: true }); });
  });

  it("announces the unmark, not only the mark", async () => {
    // Read off state rather than the transition, the live region announced a
    // change every time an already-proxied card was opened, and said nothing at
    // all on an unmark.
    mount(true);
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(screen.getByText(proxyCopy.control.announceUnmarked("The Ozolith", "HD Gods"))).toBeTruthy();
  });

  it("announces nothing merely for opening a proxied card", () => {
    mount(true);
    expect(screen.queryByText(proxyCopy.control.announceMarked("The Ozolith", "HD Gods"))).toBeNull();
  });
});

describe("the control reconciles with the server", () => {
  it("follows a refreshed card when nothing is in flight", () => {
    // The modal keys on oracle id, so this stays mounted when the card is
    // re-read — which is exactly what `onSaved` causes. Without reconciliation
    // the tick can end up showing the opposite of the receipt beside it.
    const { rerender } = render(
      <ProxyControl deckId="d1" deckName="HD Gods" oracleId="o1" cardName="The Ozolith" proxied={false} />,
    );
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");

    rerender(
      <ProxyControl deckId="d1" deckName="HD Gods" oracleId="o1" cardName="The Ozolith" proxied />,
    );
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("keeps the optimistic value while a write is in flight", async () => {
    // The whole point of the optimism: a refreshed prop arriving mid-write must
    // not yank the tick back under the reader's finger.
    let release: (v: unknown) => void = () => {};
    setCardProxied.mockImplementation(() => new Promise((r) => { release = r; }));
    const { rerender } = render(
      <ProxyControl deckId="d1" deckName="HD Gods" oracleId="o1" cardName="The Ozolith" proxied={false} onSaved={onSaved} />,
    );
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    rerender(
      <ProxyControl deckId="d1" deckName="HD Gods" oracleId="o1" cardName="The Ozolith" proxied={false} onSaved={onSaved} />,
    );
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
    await act(async () => { release({ ok: true }); });
  });
});

describe("when the proxy state could not be read", () => {
  it("does not act on a guess", async () => {
    // `proxiedBy` is null when the query failed, which is NOT "no deck prints
    // this". Drawn from that absence, the toggle shows unchecked over an
    // already-proxied card and the press sends the mark it already has.
    render(
      <ProxyControl
        deckId="d1" deckName="HD Gods" oracleId="o1" cardName="The Ozolith"
        proxied={false} known={false} onSaved={onSaved}
      />,
    );
    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    expect(setCardProxied).not.toHaveBeenCalled();
    expect(screen.getByRole("switch").getAttribute("aria-disabled")).toBe("true");
  });

  it("says so, rather than showing a confident tick", () => {
    render(
      <ProxyControl
        deckId="d1" deckName="HD Gods" oracleId="o1" cardName="The Ozolith"
        proxied known={false}
      />,
    );
    expect(screen.getByText(proxyCopy.control.unknown)).toBeTruthy();
    // And never the marked sentence, which asserts a state nobody read.
    expect(screen.queryByText(proxyCopy.control.marked("HD Gods"))).toBeNull();
  });
});
