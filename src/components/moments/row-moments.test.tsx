// The rows' and card details' moments (discovery R1, PR 3): each control registers its moment under the condition the
// screen's own data gives it, and shows the bubble once on screen. The rules themselves are the provider's tests.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ARRIVE_MS, MomentsProvider } from "./moments-provider";
import { MOMENTS, type MomentId } from "../../lib/moments/registry";
import { momentsCopy } from "../../lib/copy/moments";
import { overPageCount } from "../../lib/moments/hold";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { SwapToolsProvider, useSwapTools } from "../../lib/swaps/context";
import { OtherWaysPress, StaticSparesProvider } from "../social/spare-markers";
import { FitsDoor } from "../cards/fits-door";
import { FactTooltip } from "../cards/fact-tooltip";
import { CardWishlist } from "../wishlist/card-wishlist";

vi.mock("../../app/moments-actions", () => ({ spendMomentAction: async () => {} }));
vi.mock("../../app/collection/wishlist/actions", () => ({
  addToWishlistAction: async () => ({ ok: true }),
  removeFromWishlistAction: async () => ({ ok: true }),
  setWishlistWantAction: async () => ({ ok: true }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/decks/d1" }));

let notify: ((entries: { target: Element; isIntersecting: boolean }[]) => void) | null = null;
class FakeObserver {
  constructor(cb: (entries: { target: Element; isIntersecting: boolean }[]) => void) {
    notify = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
const ALL = MOMENTS.map((m) => m.id) as MomentId[];

function wrap(node: ReactNode, spent: string[] = []) {
  return render(
    <MomentsProvider live={ALL} spent={spent}>
      {node}
    </MomentsProvider>,
  );
}
async function seen(el: Element) {
  act(() => notify!([{ target: el, isIntersecting: true }]));
  await act(async () => {
    vi.advanceTimersByTime(ARRIVE_MS);
  });
}
const note = (tool: string) => screen.queryByRole("note", { name: momentsCopy.noteName(tool) });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  notify = null;
});

describe("M5 and M6, the other-ways press", () => {
  const asOf = new Date("2026-09-20T00:00:00Z");
  const POLY = { oracleId: "poly", name: "Polyraptor", owned: false, quantity: 1 } as unknown as DeckDetailCard;
  const SPARE = [{ oracleId: "poly", friend: { publicId: "p-ana", displayName: "Ana", commander: null, pods: [] }, spare: 1 }];
  function Press({ standIn }: { standIn: boolean }) {
    const tools = useSwapTools();
    return (
      <OtherWaysPress
        card={POLY}
        openStandIns={tools ? () => tools.openStandIns(POLY) : undefined}
        standIn={standIn}
        standInAria="Cheaper stand-ins"
        limitFigure="$10"
      />
    );
  }
  const mount = (standIn: boolean, spares: typeof SPARE | [], spent: string[] = []) =>
    wrap(
      <SwapToolsProvider deckId="d1" deckName="Deck" storedLimitCents={null}>
        <StaticSparesProvider spares={spares as never} newestAsOf={asOf}>
          <Press standIn={standIn} />
        </StaticSparesProvider>
      </SwapToolsProvider>,
      spent,
    );

  it("carries Cheaper stand-ins while it holds ⇄, naming the limit", async () => {
    mount(true, []);
    const press = screen.getByTestId("other-ways");
    await seen(press);
    const bubble = note(momentsCopy.standIns("$10").tool);
    expect(bubble?.textContent).toContain(momentsCopy.standIns("$10").line);
    expect(press.getAttribute("aria-describedby")).toBe(bubble?.id);
  });

  it("carries a friend's spare while it holds the spare glyph", async () => {
    mount(false, SPARE);
    await seen(screen.getByTestId("other-ways"));
    expect(note(momentsCopy.friendSpares.tool)).toBeTruthy();
  });

  it("with both, the fixed order shows stand-ins first, then the spare once stand-ins is spent", async () => {
    mount(true, SPARE);
    await seen(screen.getByTestId("other-ways"));
    expect(note(momentsCopy.standIns("$10").tool)).toBeTruthy();
    cleanup();
    window.localStorage.clear();
    mount(true, SPARE, ["stand-ins"]);
    await seen(screen.getByTestId("other-ways"));
    expect(note(momentsCopy.friendSpares.tool)).toBeTruthy();
  });
});

describe("M7, the availability marker's tooltip", () => {
  it("holds the moments off while it is open", async () => {
    const mm = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q === "(pointer: fine)", media: q, onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      render(
        <FactTooltip holdMoments sentence="Short 1">
          <span>short</span>
        </FactTooltip>,
      );
      expect(overPageCount().holds).toBe(0);
      fireEvent.pointerEnter(screen.getByText("short").parentElement!);
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(overPageCount().holds).toBe(1);
      fireEvent.pointerLeave(screen.getByText("short").parentElement!);
      expect(overPageCount().holds).toBe(0);
    } finally {
      window.matchMedia = mm;
    }
  });
});

describe("M8, Find a deck's door", () => {
  const door = (moment: boolean) => (
    <FitsDoor cardName="Sol Ring" onPress={() => {}} pickerOpen={false} layout="row" moment={moment} />
  );
  it("carries Find a deck on an owned card in no deck", async () => {
    wrap(door(true));
    await seen(screen.getByTestId("fits-door"));
    expect(note(momentsCopy.findADeck.tool)).toBeTruthy();
  });
  it("draws nothing otherwise", async () => {
    wrap(door(false));
    await seen(screen.getByTestId("fits-door"));
    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("M9, Add to wishlist", () => {
  const box = (owned: number) => <CardWishlist oracleId="sol" want={null} owned={owned} onWrite={() => {}} />;
  it("carries the Wishlist on a card the reader does not own", async () => {
    wrap(box(0));
    await seen(screen.getByRole("button"));
    expect(note(momentsCopy.wishlist.tool)).toBeTruthy();
  });
  it("draws nothing on an owned card", async () => {
    wrap(box(1));
    await seen(screen.getByRole("button"));
    expect(screen.queryByRole("note")).toBeNull();
  });
});
