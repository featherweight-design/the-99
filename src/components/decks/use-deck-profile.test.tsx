// The hook that decides WHEN the profile is fetched, and how many times.
//
// The cost is the reason it exists: 630ms median cold, 1.8-2.2s on the slowest real deck. So
// what is tested is the request count and its triggers — a hook that fetched correctly but
// twice per tab press would pass every assertion about its returned state.

import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  calls: [] as string[],
  reply: { ok: true, profile: { brackets: {} } } as unknown,
  throws: false,
}));

vi.mock("../../app/decks/profile-actions", () => ({
  fetchDeckProfile: async (deckId: string) => {
    stub.calls.push(deckId);
    if (stub.throws) throw new Error("network");
    return stub.reply;
  },
}));

const { useDeckProfile } = await import("./use-deck-profile");

const DECK = "11111111-1111-4111-8111-111111111111";

function Harness({ deckId = DECK, active }: { deckId?: string; active: boolean }) {
  const { state, retry } = useDeckProfile(deckId, active);
  return (
    <div>
      <span data-testid="kind">{state.kind}</span>
      <button onClick={retry}>retry</button>
    </div>
  );
}

const kind = (c: ReturnType<typeof render>) => c.getByTestId("kind").textContent;

beforeEach(() => {
  stub.calls = [];
  stub.reply = { ok: true, profile: { brackets: {} } };
  stub.throws = false;
});

describe("useDeckProfile", () => {
  // NOT BEFORE THE TAB IS OPENED. This is the assertion the whole shape exists for: the deck
  // page must not pay for a profile a reader never asks to see.
  it("makes no request while the tab is closed", async () => {
    const c = render(<Harness active={false} />);
    await act(async () => {});
    expect(stub.calls).toEqual([]);
    expect(kind(c)).toBe("idle");
  });

  it("fetches once when the tab opens, and reports ready", async () => {
    const c = render(<Harness active />);
    await act(async () => {});
    expect(stub.calls).toEqual([DECK]);
    expect(kind(c)).toBe("ready");
  });

  // THE CACHE, stated as a request count. Re-rendering with the tab still open — which happens
  // on every keystroke elsewhere in the shell — must not re-ask.
  it("does not re-request on re-render", async () => {
    const c = render(<Harness active />);
    await act(async () => {});
    c.rerender(<Harness active />);
    c.rerender(<Harness active />);
    await act(async () => {});
    expect(stub.calls).toEqual([DECK]);
  });

  // Closing and reopening the tab is the case a fetch-on-mount inside the panel would get
  // wrong: the panel unmounts, so it would pay 630ms again.
  it("does not re-request when the tab is closed and reopened", async () => {
    const c = render(<Harness active />);
    await act(async () => {});
    c.rerender(<Harness active={false} />);
    c.rerender(<Harness active />);
    await act(async () => {});
    expect(stub.calls).toEqual([DECK]);
    expect(kind(c)).toBe("ready");
  });

  it("reports disabled without treating it as a failure", async () => {
    stub.reply = { ok: false, reason: "disabled" };
    const c = render(<Harness active />);
    await act(async () => {});
    expect(kind(c)).toBe("disabled");
  });

  it("reports a deck it cannot read as missing", async () => {
    stub.reply = { ok: false, reason: "not-found" };
    const c = render(<Harness active />);
    await act(async () => {});
    expect(kind(c)).toBe("missing");
  });

  // A THROW IS `failed`, NEVER `missing` — the action answers a missing deck in its return
  // value, so an exception is the request itself. Telling a reader their deck is gone because
  // the network dropped is a lie with a retry hidden behind it.
  it("reports a thrown request as failed rather than missing", async () => {
    stub.throws = true;
    const c = render(<Harness active />);
    await act(async () => {});
    expect(kind(c)).toBe("failed");
  });

  // The retry is a DELIBERATE re-ask and must work after the one-request guard has been set.
  it("re-asks on retry, which the once-only guard must not block", async () => {
    stub.throws = true;
    const c = render(<Harness active />);
    await act(async () => {});
    expect(stub.calls).toHaveLength(1);
    stub.throws = false;
    await act(async () => {
      c.getByText("retry").click();
    });
    expect(stub.calls).toEqual([DECK, DECK]);
    expect(kind(c)).toBe("ready");
  });
});
