// Friends' spares in the stand-ins modal (Social R2 PR 8a; R3 `Option B opened` O1 to O3, `Spares` S3): the section,
// the three titles and when they settle, and the nothing-cheaper sentence giving way to a friend's spare.
import * as React from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { spareCopy } from "../../lib/copy/social";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { StandInsRead } from "../../lib/swaps/gather";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";

const asOf = new Date("2026-09-20T00:00:00Z");
const cardRow = (name: string) => ({ oracleId: `id-${name}`, name, typeLine: "Instant", oracleText: "", keywords: [], cmc: 2, imageUri: null });
const standIn = (name: string, free: boolean) => ({
  card: cardRow(name), free, soft: 0, owned: free ? 1 : 0, cents: free ? null : 300, foilOnly: false,
  inclusion: null, synergy: null, isUniversal: false, shared: ["removal"], sharedThemes: [], extra: [], missing: [], once: [], rung: null, drawbacks: [], givesUp: [], credit: 1, advisory: 0, lostMethods: [],
});
const READ = {
  job: { kind: "spell", roles: ["removal"], mv: 2 }, originalCents: 1500, jobRoles: ["removal"],
  groups: [{ same: true, type: "instant", rows: [{ ...standIn("Swords to Plowshares", true), soft: 1 }, standIn("Chaos Warp", false)], total: 2 }],
  original: cardRow("Anguished Unmaking"), commanders: ["Gishath"], newestAsOf: asOf,
} as unknown as StandInsRead;

const { loadStandInsAction, takeStandInAction, undoSwapAction } = vi.hoisted(() => ({
  loadStandInsAction: vi.fn(), takeStandInAction: vi.fn(), undoSwapAction: vi.fn(),
}));
// `landOnReceipt` is a hold that outlives the sheet that starts it, so nothing in the component stops it
// when a test ends: its eased reveal arms a timer that fires into a torn-down jsdom (an unhandled
// error after every test has passed). The test owns what it started, so it keeps each hold's stop
// and ends them all after unmounting.
const holds = vi.hoisted(() => ({ stops: [] as Array<() => void> }));
vi.mock("./swap-receipt", async (original) => {
  const real = await original<typeof import("./swap-receipt")>();
  return {
    ...real,
    landOnReceipt: (swapId: string) => {
      const stop = real.landOnReceipt(swapId);
      holds.stops.push(stop);
      return stop;
    },
  };
});
afterEach(() => {
  cleanup();
  for (const stop of holds.stops.splice(0)) stop();
});
vi.mock("../../lib/swaps/actions", () => ({ loadStandInsAction, takeStandInAction, undoSwapAction }));

// The trigger reports the list its stacked card would page, so the sheet's Prev/Next set is
// readable here. Kept as full objects (JSON), not just oracle ids: the sibling list carries
// each row's name and art (H23 carousel PR 1b), and a mock that reduced it to ids would still
// pass if the sheet reverted to bare ids and dropped that plumbing entirely.
// Every label a sheet registers under, through a stable wrapper so a re-registration is a real one: a label that
// moves when the spares land tears the registration down under an open card (round 1).
const registered = vi.hoisted(() => ({ labels: [] as (string | undefined)[], wrap: new WeakMap<object, unknown>() }));
vi.mock("../cards/card-detail-provider", async (actual) => {
  const real = await actual<typeof import("../cards/card-detail-provider")>();
  const wrapRegister = (register: ReturnType<typeof real.useCardDetail>["registerSheet"]) => {
    let reg = registered.wrap.get(register) as typeof register | undefined;
    if (!reg) {
      reg = (label, ...rest) => {
        registered.labels.push(label);
        return register(label, ...rest);
      };
      registered.wrap.set(register, reg);
    }
    return reg;
  };
  return {
  ...real,
  useCardDetailIfAny: () => {
    const ctx = real.useCardDetailIfAny();
    return ctx && { ...ctx, registerSheet: wrapRegister(ctx.registerSheet) };
  },
  useCardDetail: () => {
    const ctx = real.useCardDetail();
    return { ...ctx, registerSheet: wrapRegister(ctx.registerSheet) };
  },
  CardDetailTrigger: (
    { siblings, children }: { siblings?: readonly (string | { oracleId: string; name?: string; imageUri?: string | null })[]; children: React.ReactNode },
  ) => (
    <button
      type="button"
      data-siblings={JSON.stringify(
        siblings?.map((s) => (typeof s === "string" ? { oracleId: s } : s)) ?? [],
      )}
    >
      {children}
    </button>
  ),
};
});

const { CardDetailProvider } = await import("../cards/card-detail-provider");
const { SwapToolsProvider } = await import("../../lib/swaps/context");
const { DeckPageSwitches } = await import("./deck-page-switches");
const { StandInsSheet } = await import("./stand-ins-sheet");

const original = {
  oracleId: "id-Anguished Unmaking", name: "Anguished Unmaking", role: "removal", owned: false, quantity: 1, cardTypeGroup: "Instants",
  price: { cents: 1500, foilCents: null, etchedCents: null, asOf },
} as unknown as DeckDetailCard;
const NOTHING = { ...READ, groups: [] } as unknown as StandInsRead;

const friend = (name: string, pods: string[]) => ({ publicId: `p-${name}`, displayName: name, commander: null, pods });
const SPARES = [
  // Colin holds more, so leads though Ana comes first by name.
  { oracleId: original.oracleId, friend: friend("Ana", ["Thursday pod"]), spare: 1 },
  { oracleId: original.oracleId, friend: friend("Colin", ["Thursday pod", "Friday pod"]), spare: 2 },
];

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  loadStandInsAction.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

const answer = (spares: unknown[]) => Promise.resolve({ ok: true, json: async () => ({ spares }) });

async function open(socialFriends = true) {
  await act(async () => {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DeckPageSwitches howItWorks={false} socialFriends={socialFriends}>
          <SwapToolsProvider deckId="d1" deckName="HD Gishath" storedLimitCents={null}>
            <StandInsSheet card={original} newestAsOf={asOf} onClose={() => {}} />
          </SwapToolsProvider>
        </DeckPageSwitches>
      </CardDetailProvider>,
    );
  });
}
/** The title as drawn: a pending name is read by assistive tech and never drawn. */
const title = () => {
  const h = screen.getByRole("heading", { level: 2 });
  return h.querySelector(".sr-only") ? "" : h.textContent;
};
const T = swapToolsCopy.sheet;

describe("the stand-ins modal with friends' spares", () => {
  it("reads nothing and keeps the shipped title from the first frame with the friends switch off", async () => {
    loadStandInsAction.mockReturnValue(new Promise(() => {}));
    await open(false);
    expect(title()).toBe(T.title);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads this card's spares, and holds the title and the body until both reads are in", async () => {
    let land!: (r: StandInsRead) => void;
    loadStandInsAction.mockReturnValue(new Promise((r) => { land = r; }));
    fetchMock.mockReturnValue(answer(SPARES));
    await open();
    expect(fetchMock).toHaveBeenCalledWith(`/api/friend-spares?ids=${encodeURIComponent(original.oracleId)}`, expect.anything());
    // The spares are in, the stand-ins are not: no title drawn, the dialog still named, and the loading block.
    expect(title()).toBe("");
    expect(screen.getByRole("dialog", { name: T.title })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("friend-spares")).toBeNull();
    await act(async () => { land(READ); });
    expect(title()).toBe(spareCopy.modalTitleBoth);
    expect(screen.getByRole("dialog", { name: spareCopy.modalTitleBoth })).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("holds the title, and keeps the loading block, while the spares are out though the stand-ins are in", async () => {
    loadStandInsAction.mockResolvedValue(READ);
    fetchMock.mockReturnValue(new Promise(() => {}));
    await open();
    expect(title()).toBe("");
    expect(screen.getByRole("dialog", { name: T.title })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 4 })).toBeNull();
  });

  it("registers under one fixed label, so spares landing never re-register the sheet", async () => {
    registered.labels.length = 0;
    loadStandInsAction.mockResolvedValue(READ);
    fetchMock.mockReturnValue(answer(SPARES));
    await open();
    expect(title()).toBe(spareCopy.modalTitleBoth);
    expect(registered.labels.length).toBeGreaterThan(0);
    expect(new Set(registered.labels)).toEqual(new Set([T.backLabel]));
  });

  it("draws Before you buy with friends first, most spares first, then the stand-ins (O1)", async () => {
    loadStandInsAction.mockResolvedValue(READ);
    fetchMock.mockReturnValue(answer(SPARES));
    await open();
    expect(title()).toBe(spareCopy.modalTitleBoth);
    const section = screen.getByTestId("friend-spares");
    expect(section.textContent).toContain(spareCopy.section(2));
    expect(section.textContent).toContain(spareCopy.viewOnly);
    expect(within(section).getAllByTestId("friend-spare").map((r) => r.querySelector("b")?.textContent)).toEqual(["Colin", "Ana"]);
    expect(section.textContent).toContain(plain(spareCopy.via([named("Thursday pod"), named("Friday pod")])));
    expect(plain(spareCopy.via([named("Thursday pod"), named("Friday pod")]))).toBe("shares with Thursday pod and Friday pod");
    expect(section.textContent).toContain(spareCopy.count(2));
    expect(section.textContent).toContain(spareCopy.foot);
    // View only: nothing on a friend's row can be pressed.
    expect(within(section).queryAllByRole("button")).toHaveLength(0);
    const group = screen.getByRole("heading", { level: 4 });
    expect(section.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: spareCopy.close })).toBeInTheDocument();
  });

  it("draws Friends with a spare when nothing cheaper exists, and leaves out the sentence saying so (O2)", async () => {
    loadStandInsAction.mockResolvedValue(NOTHING);
    fetchMock.mockReturnValue(answer(SPARES));
    await open();
    expect(title()).toBe(spareCopy.modalTitleSpares);
    expect(screen.queryByText(/Nothing cheaper|nothing cheaper/)).toBeNull();
  });

  it("is the shipped modal word for word when no friend has a spare (O3)", async () => {
    loadStandInsAction.mockResolvedValue(NOTHING);
    fetchMock.mockReturnValue(answer([]));
    await open();
    expect(title()).toBe(T.title);
    expect(screen.queryByTestId("friend-spares")).toBeNull();
    expect(screen.getByRole("button", { name: T.closeAria })).toBeInTheDocument();
    expect(screen.getByTestId("stand-ins-sheet").textContent).toMatch(/cheaper/i);
  });

  it("treats a failed spares read as none (G3)", async () => {
    loadStandInsAction.mockResolvedValue(READ);
    // A refusal whose body still parses is a refusal all the same.
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ spares: SPARES }) });
    await open();
    expect(title()).toBe(T.title);
    expect(screen.queryByTestId("friend-spares")).toBeNull();
  });

  it("names the friends when the stand-ins read fails, beside the shipped failure", async () => {
    loadStandInsAction.mockResolvedValue(null);
    fetchMock.mockReturnValue(answer(SPARES));
    await open();
    expect(title()).toBe(spareCopy.modalTitleSpares);
    expect(screen.getByTestId("friend-spares")).toBeInTheDocument();
    expect(screen.getByRole("alert").textContent).toContain(T.failed.heading);
  });

  it("keeps only this card's rows from the answer", async () => {
    loadStandInsAction.mockResolvedValue(READ);
    fetchMock.mockReturnValue(answer([...SPARES, { oracleId: "id-other", friend: friend("Zed", ["X"]), spare: 4 }]));
    await open();
    expect(within(screen.getByTestId("friend-spares")).getAllByTestId("friend-spare")).toHaveLength(2);
  });
});
