// The hook that decides WHEN the profile is fetched, and how many times.
//
// The cost is the reason it exists: 630ms median cold, 1.8-2.2s on the slowest real deck. So
// what is tested is the request count and its triggers — a hook that fetched correctly but twice
// per press would pass every assertion about its returned state.

import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  calls: [] as string[],
  reply: { ok: true, profile: { brackets: {} } } as unknown,
  throws: false,
  /** Held open when set, so an in-flight request is observable. */
  gate: null as null | (() => void),
  /** One resolver per call when set, so two requests can be released independently. */
  gates: null as null | (() => void)[],
}));

vi.mock("../../app/decks/profile-actions", () => ({
  fetchDeckProfile: async (deckId: string) => {
    stub.calls.push(deckId);
    if (stub.gates) await new Promise<void>((r) => stub.gates!.push(r));
    else if (stub.gate) await new Promise<void>((r) => (stub.gate = r));
    if (stub.throws) throw new Error("network");
    return stub.reply;
  },
}));

const { useDeckProfile } = await import("./use-deck-profile");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function Harness({ deckId = A }: { deckId?: string }) {
  const { state, request } = useDeckProfile(deckId);
  return (
    <div>
      <span data-testid="kind">{state.kind}</span>
      <button onClick={request}>ask</button>
    </div>
  );
}

const kind = (c: ReturnType<typeof render>) => c.getByTestId("kind").textContent;
const ask = async (c: ReturnType<typeof render>) => {
  await act(async () => {
    c.getByText("ask").click();
  });
};

beforeEach(() => {
  stub.calls = [];
  stub.reply = { ok: true, profile: { brackets: {} } };
  stub.throws = false;
  stub.gate = null;
  stub.gates = null;
});

describe("useDeckProfile", () => {
  // NOT UNTIL THE READER ASKS. Round 4's ruling 7: the verdict fires on analyse or commit and
  // nowhere else — no auto-run on tab open. Rendering must make no request at all.
  it("makes no request until asked", async () => {
    const c = render(<Harness />);
    await act(async () => {});
    c.rerender(<Harness />);
    await act(async () => {});
    expect(stub.calls).toEqual([]);
    expect(kind(c)).toBe("idle");
  });

  it("fetches once when asked, and reports ready", async () => {
    const c = render(<Harness />);
    await ask(c);
    expect(stub.calls).toEqual([A]);
    expect(kind(c)).toBe("ready");
  });

  // THE CACHE, stated as a request count. Re-rendering — which happens on every keystroke
  // elsewhere in the shell — must not re-ask.
  it("does not re-request on re-render", async () => {
    const c = render(<Harness />);
    await ask(c);
    c.rerender(<Harness />);
    c.rerender(<Harness />);
    await act(async () => {});
    expect(stub.calls).toEqual([A]);
  });

  // A SECOND PRESS IS A DELIBERATE RE-ASK, and must work: an edited deck is re-asked about on
  // purpose, which is how staleness is resolved without any automatic fetch.
  it("re-asks on a second press", async () => {
    const c = render(<Harness />);
    await ask(c);
    await ask(c);
    expect(stub.calls).toEqual([A, A]);
  });

  // ...but a press while one is in flight is not duplicated. A reader double-pressing a control
  // that takes two seconds must not pay for two builds.
  it("does not duplicate a request already in flight", async () => {
    stub.gate = () => {};
    const c = render(<Harness />);
    await ask(c);
    expect(kind(c)).toBe("loading");
    await ask(c);
    expect(stub.calls).toEqual([A]);
    const release = stub.gate;
    stub.gate = null;
    await act(async () => {
      release?.();
    });
  });

  // KEYED ON THE DECK. The shell outlives a route change between two decks, so an answer held
  // for deck A must not be shown under deck B's name — and must not be silently reused either.
  it("drops an answer held for another deck rather than showing it", async () => {
    const c = render(<Harness deckId={A} />);
    await ask(c);
    expect(kind(c)).toBe("ready");
    c.rerender(<Harness deckId={B} />);
    await act(async () => {});
    expect(kind(c)).toBe("idle");
    expect(stub.calls).toEqual([A]);
    await ask(c);
    expect(stub.calls).toEqual([A, B]);
  });

  // THE LATE REPLY. A request for deck A that settles after the shell has moved to deck B must
  // be dropped, or B renders A's profile — and this is the ONLY path that reaches that guard,
  // because the render-time key reset clears the state before the reply lands. Gated so the
  // switch happens while the request is genuinely in flight.
  it("drops a reply that arrives after the deck has changed", async () => {
    stub.gate = () => {};
    const c = render(<Harness deckId={A} />);
    await ask(c);
    expect(kind(c)).toBe("loading");

    c.rerender(<Harness deckId={B} />);
    await act(async () => {});
    expect(kind(c)).toBe("idle");

    const release = stub.gate;
    stub.gate = null;
    await act(async () => {
      release?.();
    });
    // Still idle: deck A's profile was answered and thrown away rather than shown under B.
    expect(kind(c)).toBe("idle");
    expect(stub.calls).toEqual([A]);
  });

  // THE IN-FLIGHT FLAG IS NOT CLEARED BY AN OLDER DECK'S REPLY.
  //
  // A starts; the shell moves to B; B is requested; then A finally resolves. If A's reply clears
  // the flag, a further press starts a DUPLICATE B while B's first request is still in flight —
  // the very thing the flag exists to prevent, arriving by a longer road. Three presses, and the
  // assertion is that only two requests were ever made.
  it("does not let an older deck's reply unlock a duplicate for the current one", async () => {
    stub.gates = [];
    const c = render(<Harness deckId={A} />);
    await ask(c);                       // A in flight
    c.rerender(<Harness deckId={B} />); // the shell moves on
    await act(async () => {});
    await ask(c);                       // B in flight
    expect(stub.calls).toEqual([A, B]);

    const releaseA = stub.gates[0];
    await act(async () => {
      releaseA?.();
    });

    await ask(c);                       // must NOT start a second B
    expect(stub.calls).toEqual([A, B]);

    const releaseB = stub.gates[1];
    stub.gates = null;
    await act(async () => {
      releaseB?.();
    });
  });

  it("reports disabled without treating it as a failure", async () => {
    stub.reply = { ok: false, reason: "disabled" };
    const c = render(<Harness />);
    await ask(c);
    expect(kind(c)).toBe("disabled");
  });

  it("reports a deck it cannot read as missing", async () => {
    stub.reply = { ok: false, reason: "not-found" };
    const c = render(<Harness />);
    await ask(c);
    expect(kind(c)).toBe("missing");
  });

  // A THROW IS `failed`, NEVER `missing` — the action answers a missing deck in its return
  // value, so an exception is the request itself. Telling a reader their deck is gone because
  // the network dropped is a lie with a retry hidden behind it.
  it("reports a thrown request as failed rather than missing", async () => {
    stub.throws = true;
    const c = render(<Harness />);
    await ask(c);
    expect(kind(c)).toBe("failed");
  });

  it("can be re-asked after a failure", async () => {
    stub.throws = true;
    const c = render(<Harness />);
    await ask(c);
    expect(kind(c)).toBe("failed");
    stub.throws = false;
    await ask(c);
    expect(stub.calls).toEqual([A, A]);
    expect(kind(c)).toBe("ready");
  });
});
