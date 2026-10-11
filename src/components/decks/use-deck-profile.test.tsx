// The hook that decides WHEN the profile is fetched, and how many times.
//
// The cost is the reason it exists: 630ms median cold, 1.8-2.2s on the slowest real deck. So
// what is tested is the request count and its triggers — a hook that fetched correctly but twice
// per press would pass every assertion about its returned state.

import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  calls: [] as string[],
  reply: { ok: true, profile: { brackets: {} }, analyzedAt: "2026-09-23T00:00:00Z", fresh: true, versionNumber: null } as unknown,
  throws: false,
  /** Held open when set, so an in-flight request is observable. */
  gate: null as null | (() => void),
  /** One resolver per call when set, so two requests can be released independently. */
  gates: null as null | (() => void)[],
  /** Stored lookups made, and what they answer. */
  peeks: [] as string[],
  stored: { ok: false, reason: "none" } as unknown,
  peekGate: null as null | (() => void),
  peekThrows: false,
}));

vi.mock("../../app/decks/profile-actions", () => ({
  fetchDeckProfile: async (deckId: string) => {
    stub.calls.push(deckId);
    if (stub.gates) await new Promise<void>((r) => stub.gates!.push(r));
    else if (stub.gate) await new Promise<void>((r) => (stub.gate = r));
    if (stub.throws) throw new Error("network");
    return stub.reply;
  },
  fetchStoredDeckProfile: async (deckId: string) => {
    stub.peeks.push(deckId);
    if (stub.peekGate) await new Promise<void>((r) => (stub.peekGate = r));
    if (stub.peekThrows) throw new Error("network");
    return stub.stored;
  },
}));

const { useDeckProfile, shownReading } = await import("./use-deck-profile");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

/** Every (deck, state) pair that reached the screen, so a single wrong render is visible. */
const painted: string[] = [];
/** Every (state, peek settled) pair painted, for the opening loader's rule. */
const settledPaint: string[] = [];

/** Every deck `onFresh` was called for: the overview's write hangs on it (synopsis PR 4). */
const freshCalls: string[] = [];

function Harness({ deckId = A, listKey }: { deckId?: string; listKey?: string }) {
  const { state, request, peek, peekSettled } = useDeckProfile(deckId, listKey, (d) => freshCalls.push(d));
  painted.push(`${deckId}:${state.kind}`);
  settledPaint.push(`${state.kind}:${peekSettled}`);
  return (
    <div>
      <span data-testid="kind">{state.kind}</span>
      <span data-testid="settled">{String(peekSettled)}</span>
      <span data-testid="held">{String("held" in state && state.held !== null)}</span>
      <span data-testid="fresh">{state.kind === "ready" ? String(state.fresh) : "-"}</span>
      <span data-testid="at">{state.kind === "ready" ? state.analyzedAt : "-"}</span>
      <span data-testid="bench">{JSON.stringify(shownReading(state)?.benchmarks ?? null)}</span>
      <button onClick={request}>ask</button>
      <button onClick={peek}>peek</button>
    </div>
  );
}

const kind = (c: ReturnType<typeof render>) => c.getByTestId("kind").textContent;
const fresh = (c: ReturnType<typeof render>) => c.getByTestId("fresh").textContent;
/** The state on screen carries a held reading. */
const held = (c: ReturnType<typeof render>) => c.getByTestId("held").textContent === "true";
const ask = async (c: ReturnType<typeof render>) => {
  await act(async () => {
    c.getByText("ask").click();
  });
};

const peek = async (c: ReturnType<typeof render>) => {
  await act(async () => {
    c.getByText("peek").click();
  });
};

beforeEach(() => {
  freshCalls.length = 0;
  painted.length = 0;
  settledPaint.length = 0;
  stub.peeks = [];
  stub.stored = { ok: false, reason: "none" };
  stub.peekGate = null;
  stub.peekThrows = false;
  stub.calls = [];
  stub.reply = { ok: true, profile: { brackets: {} }, analyzedAt: "2026-09-23T00:00:00Z", fresh: true, versionNumber: null };
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

  // The benchmarks belong to the reading (plan PR 3): they ride every reply into the held reading
  // and stay with it through a stale edit and a failed re-read, as the reading does.
  it("carries a reply's benchmarks on the reading, through a stale edit and a failed re-read", async () => {
    const bench = (c: ReturnType<typeof render>) => c.getByTestId("bench").textContent;
    stub.reply = { ...(stub.reply as object), benchmarks: { mark: "pressed" } };
    const c = render(<Harness listKey="a:1" />);
    await ask(c);
    expect(bench(c)).toBe('{"mark":"pressed"}');
    c.rerender(<Harness listKey="a:1,b:1" />);
    await act(async () => {});
    expect([fresh(c), bench(c)]).toEqual(["false", '{"mark":"pressed"}']);
    stub.throws = true;
    await ask(c);
    expect([kind(c), bench(c)]).toEqual(["failed", '{"mark":"pressed"}']);
    stub.throws = false;
  });

  it("carries a stored reading's benchmarks", async () => {
    stub.stored = { ok: true, profile: { brackets: {} }, analyzedAt: "2026-09-23T00:00:00Z", fresh: true, versionNumber: null, benchmarks: { mark: "stored" } };
    const c = render(<Harness />);
    await peek(c);
    expect(c.getByTestId("bench").textContent).toBe('{"mark":"stored"}');
  });

  it("fetches once when asked, and reports ready", async () => {
    const c = render(<Harness />);
    await ask(c);
    expect(stub.calls).toEqual([A]);
    expect(kind(c)).toBe("ready");
  });

  // AN EDIT IN THE VISIT MAKES THE READING STALE, never withdraws it (the lifecycle rulings,
  // 2026-09-23): it stays on screen under the 2i banner, which offers Re-analyze.
  it("marks a held reading stale when the list changes, and keeps it fresh while it does not", async () => {
    const c = render(<Harness listKey="a:1" />);
    await ask(c);
    expect([kind(c), fresh(c)]).toEqual(["ready", "true"]);
    c.rerender(<Harness listKey="a:1" />);
    await act(async () => {});
    expect([kind(c), fresh(c)]).toEqual(["ready", "true"]);
    c.rerender(<Harness listKey="a:1,b:1" />);
    await act(async () => {});
    expect([kind(c), fresh(c)]).toEqual(["ready", "false"]);
    // And asks again, against the new list.
    await ask(c);
    expect([kind(c), fresh(c)]).toEqual(["ready", "true"]);
    expect(stub.calls).toEqual([A, A]);
  });

  // THE READING IS HELD THROUGH A RE-READ. Loading, a failure and an illegal refusal all keep the
  // reading that was on screen, so the tab never blanks under the reader.
  it("holds the reading on screen through a re-read that fails", async () => {
    const c = render(<Harness listKey="a:1" />);
    await ask(c);
    c.rerender(<Harness listKey="a:1,b:1" />);
    await act(async () => {});
    stub.throws = true;
    await ask(c);
    expect(kind(c)).toBe("failed");
    expect(held(c)).toBe(true);
    stub.throws = false;
  });

  // AN EDIT WHILE THE REQUEST IS IN FLIGHT. The reply describes the list as it stood when the
  // press was made, so it lands STALE rather than as a reading of the list since edited.
  it("lands a reply for a list edited while the request was in flight as stale", async () => {
    stub.gate = () => {};
    const c = render(<Harness listKey="a:1" />);
    await ask(c);
    expect(kind(c)).toBe("loading");
    c.rerender(<Harness listKey="a:1,b:1" />);
    await act(async () => {});
    const release = stub.gate;
    stub.gate = null;
    await act(async () => {
      release?.();
    });
    expect([kind(c), fresh(c)]).toEqual(["ready", "false"]);
  });

  // ...AND OVER A HELD READING, THE HELD ONE STAYS. The server stores a reading only over the list
  // it was asked about, so a reply for a list edited mid-press may be one no reload draws again;
  // the header's chip ignores it, and the tab keeps what it was already showing.
  it("keeps the held reading when the list was edited while a re-read was in flight", async () => {
    const c = render(<Harness listKey="a:1" />);
    await ask(c);
    expect(c.getByTestId("at").textContent).toBe("2026-09-23T00:00:00Z");
    stub.reply = { ok: true, profile: { brackets: {} }, analyzedAt: "2026-09-24T00:00:00Z", fresh: true, versionNumber: null };
    stub.gate = () => {};
    await ask(c);
    c.rerender(<Harness listKey="a:1,b:1" />);
    await act(async () => {});
    const release = stub.gate;
    stub.gate = null;
    await act(async () => {
      release?.();
    });
    expect([kind(c), fresh(c), c.getByTestId("at").textContent]).toEqual(["ready", "false", "2026-09-23T00:00:00Z"]);
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

describe("useDeckProfile peek", () => {
  // A PEEK NEVER COMPUTES. The build is `fetchDeckProfile`; a peek that reached it on a miss
  // would be the auto-run ruling 7 forbids, so both counts are asserted.
  it("stays idle on a miss and makes no build request", async () => {
    const c = render(<Harness />);
    await peek(c);
    expect(stub.peeks).toEqual([A]);
    expect(stub.calls).toEqual([]);
    expect(kind(c)).toBe("idle");
  });

  it("shows a stored analysis as ready", async () => {
    stub.stored = { ok: true, profile: { brackets: {} } };
    const c = render(<Harness />);
    await peek(c);
    expect(kind(c)).toBe("ready");
    expect(stub.calls).toEqual([]);
  });

  // Reopening the tab re-runs the shell's effect; the lookup is once per deck.
  it("looks once per deck", async () => {
    const c = render(<Harness />);
    await peek(c);
    await peek(c);
    expect(stub.peeks).toEqual([A]);
    c.rerender(<Harness deckId={B} />);
    await peek(c);
    expect(stub.peeks).toEqual([A, B]);
    // Back to A: already looked for in this mount.
    c.rerender(<Harness deckId={A} />);
    await peek(c);
    expect(stub.peeks).toEqual([A, B]);
  });

  // A press still in flight for this deck outranks a stored copy, even after the shell moved away
  // and back, which resets the state to idle while the press is pending.
  // THE OPENING LOADER (§8, 8a) waits on this. An idle tab whose peek has not answered does not
  // know it is unanalyzed; one whose peek has answered, with anything, does.
  describe("peekSettled", () => {
    it("is false until the peek answers, then true for a miss", async () => {
      stub.peekGate = () => {};
      const c = render(<Harness />);
      expect(c.getByTestId("settled").textContent).toBe("false");
      await peek(c);
      expect(c.getByTestId("settled").textContent).toBe("false");
      await act(async () => stub.peekGate!());
      expect(c.getByTestId("settled").textContent).toBe("true");
      expect(kind(c)).toBe("idle");
    });

    it("settles on a failed peek too, so a failure never leaves the loader up", async () => {
      stub.peekThrows = true;
      const c = render(<Harness />);
      await peek(c);
      expect(c.getByTestId("settled").textContent).toBe("true");
    });

    it("lands a stored reading in the same render it settles, never idle and settled first", async () => {
      stub.stored = { ok: true, profile: { brackets: {} }, analyzedAt: "2026-09-23T00:00:00Z", fresh: true, versionNumber: null };
      const c = render(<Harness />);
      await peek(c);
      expect(kind(c)).toBe("ready");
      // idle+settled would draw the empty state for a frame before the reading.
      expect(settledPaint).not.toContain("idle:true");
    });
  });

  it("makes no peek while a press for the same deck is in flight", async () => {
    stub.gate = () => {};
    const c = render(<Harness />);
    await ask(c);
    c.rerender(<Harness deckId={B} />);
    c.rerender(<Harness deckId={A} />);
    await peek(c);
    expect(stub.peeks).toEqual([]);
  });

  it.each([
    ["disabled", "disabled"],
    ["not-found", "missing"],
  ])("reports a %s answer as %s rather than as a miss", async (reason, expected) => {
    stub.stored = { ok: false, reason };
    const c = render(<Harness />);
    await peek(c);
    expect(kind(c)).toBe(expected);
    expect(stub.calls).toEqual([]);
  });

  it("treats a failed lookup as a miss", async () => {
    stub.peekThrows = true;
    const c = render(<Harness />);
    await peek(c);
    expect(kind(c)).toBe("idle");
  });

  // A PRESS OUTRANKS A PEEK. The reader asked for a fresh analysis; a stored one landing after
  // the press must not replace the spinner, or the reply the press is waiting for.
  it("drops a peek reply that lands after a press", async () => {
    stub.stored = { ok: true, profile: { brackets: { stale: true } } };
    stub.peekGate = () => {};
    stub.gate = () => {};
    const c = render(<Harness />);
    await peek(c);
    await ask(c);
    expect(kind(c)).toBe("loading");
    await act(async () => {
      stub.peekGate!();
    });
    expect(kind(c)).toBe("loading");
    await act(async () => {
      stub.gate!();
    });
    expect(kind(c)).toBe("ready");
  });

  // A peek for a deck no longer on screen must not paint under the new deck's name.
  it("drops a peek reply for a deck the shell has moved off", async () => {
    stub.stored = { ok: true, profile: { brackets: {} } };
    stub.peekGate = () => {};
    const c = render(<Harness />);
    await peek(c);
    c.rerender(<Harness deckId={B} />);
    await act(async () => {
      stub.peekGate!();
    });
    expect(kind(c)).toBe("idle");
    // The end state alone cannot see this: the deck-changed reset would put a late `ready` back
    // to `idle` one render later. What must never happen is that render.
    expect(painted).not.toContain(`${B}:ready`);
  });
  // THE PRESS ALSO WRITES THE OVERVIEW (synopsis PR 4), and only a press that landed a fresh
  // reading over the list it asked about. Everything else writes nothing.
  describe("onFresh", () => {
    it("fires once for a press that lands a fresh reading", async () => {
      const c = render(<Harness listKey="a:1" />);
      await ask(c);
      expect(freshCalls).toEqual([A]);
    });

    it("does not fire for a peek, which paints a stored reading", async () => {
      stub.stored = { ok: true, profile: { brackets: {} }, analyzedAt: "2026-09-23T00:00:00Z", fresh: true, versionNumber: null };
      const c = render(<Harness listKey="a:1" />);
      await peek(c);
      expect(kind(c)).toBe("ready");
      expect(freshCalls).toEqual([]);
    });

    it("does not fire for a reply an edit overtook", async () => {
      stub.gate = () => {};
      const c = render(<Harness listKey="a:1" />);
      await ask(c);
      c.rerender(<Harness listKey="a:1,b:1" />);
      await act(async () => {});
      const release = stub.gate;
      stub.gate = null;
      await act(async () => {
        release?.();
      });
      expect(freshCalls).toEqual([]);
    });

    it("does not fire for a stale reading, a failure or a refusal", async () => {
      stub.reply = { ok: true, profile: { brackets: {} }, analyzedAt: "2026-09-23T00:00:00Z", fresh: false, versionNumber: null };
      const c = render(<Harness listKey="a:1" />);
      await ask(c);
      stub.throws = true;
      await ask(c);
      stub.throws = false;
      stub.reply = { ok: false, reason: "illegal", built: 40, size: 99 };
      await ask(c);
      expect(freshCalls).toEqual([]);
    });
  });
});
