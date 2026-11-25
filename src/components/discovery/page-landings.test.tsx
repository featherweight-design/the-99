import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { importReviewCopy } from "../../lib/copy/import-review";
import { socialCopy } from "../../lib/copy/social";

// Try it's landing on each tool's own page (discovery R2·3, E11), against the page's REAL control: the page's own
// reading of `?tool=` (`pageToolLanding`) handed to `ToolLandingMount`, as the server component does. A page on a busier
// screen lands (halo on its control, parameter stripped, moment spent); a page that IS the tool lands with no halo and
// spends nothing (R12, G29); each strips a stale id.

const spendMomentAction = vi.fn(async (id: unknown) => void id);
vi.mock("../../app/moments-actions", () => ({ spendMomentAction: (id: unknown) => spendMomentAction(id) }));
vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("../../lib/ui/reveal", () => ({ reveal: () => {} }));
vi.mock("../../app/decks/new/choose/actions", () => ({ submitChoose: vi.fn(), hideChooseIntro: vi.fn(async () => ({ ok: true })) }));
vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: vi.fn(async () => []) }));
vi.mock("../../app/decks/new/choose/form-reach-actions", () => ({ formReachData: vi.fn(async () => null) }));
vi.mock("../../app/collection/actions", () => ({ previewUpload: vi.fn(), previewPaste: vi.fn() }));
vi.mock("../../app/collection/wishlist/actions", () => ({
  addToWishlistAction: vi.fn(),
  searchWishlistCardsAction: vi.fn(async () => []),
  setWishlistWantAction: vi.fn(),
}));

class FakeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const { TargetsProvider, HALO_ATTR } = await import("./targets-provider");
const { ToolLandingMount } = await import("./tool-landing-mount");
const { MomentsProvider } = await import("../moments/moments-provider");
const { pageToolLanding } = await import("../../lib/discovery/tools");
const { emptyParams } = await import("../../lib/intake/params");
const { IntakeForm } = await import("../intake/intake-form");
const { ChooseIntro } = await import("../intake/choose-intro");
const { PreconListView } = await import("../decks/precons/precon-list-view");
const { FitsDoor } = await import("../cards/fits-door");
const { WishlistSearch } = await import("../wishlist/wishlist-search");
const { UploadEntry } = await import("../collection/upload-entry");
const { StatsViewSwitch } = await import("../decks/lineup/stats-view-switch");
const { FriendsHead } = await import("../social/friends-head");

type ToolId = Parameters<typeof pageToolLanding>[2];

/** Find a deck's door draws only once the reader opens a card: a press stands in for that. */
function CardLater() {
  const [open, setOpen] = useState(false);
  return open ? (
    <FitsDoor cardName="Sol Ring" onPress={() => {}} pickerOpen={false} layout="row" />
  ) : (
    <button type="button" onClick={() => setOpen(true)}>open a card</button>
  );
}

const precon = {
  fileName: "Unbound", name: "Eldrazi Unbound", setCode: "SET", releaseDate: "2023-08-04", twinName: null,
  commanders: [{ oracleId: "c", name: "Commander", imageUri: null, colorIdentity: ["G"] }],
  identity: ["G"], owned: 10, of: 80, unmapped: 0, built: [],
};

const PAGES: {
  tool: ToolId;
  path: string;
  page: () => ReactNode;
  /** The tool's own control, as the reader sees it. */
  control: () => HTMLElement;
  open?: () => void;
  /** A page that is the tool: it lands at its top with no halo (R12, G29). */
  quiet?: true;
}[] = [
  {
    tool: "help-me-choose",
    path: "/decks/new/choose",
    page: () => (
      <>
        <ChooseIntro initiallyOpen art={null} daily={null} />
        <IntakeForm themes={[]} initial={emptyParams()} />
      </>
    ),
    // The intro panel, while it is open (R12, G29).
    control: () => document.querySelector('[data-choose-intro="open"]') as HTMLElement,
  },
  {
    tool: "precons",
    path: "/decks/precons",
    page: () => <PreconListView rows={[precon]} hasCollection fromNew={false} initial={{ q: "", colours: [], order: null, view: null }} query="" />,
    control: () => screen.getAllByRole("searchbox")[0].closest("div.min-w-0") as HTMLElement,
    quiet: true,
  },
  {
    tool: "find-a-deck",
    path: "/collection",
    page: () => <CardLater />,
    open: () => act(() => screen.getByRole("button", { name: "open a card" }).click()),
    control: () => screen.getByTestId("fits-door"),
  },
  {
    tool: "wishlist",
    path: "/collection/wishlist",
    page: () => <WishlistSearch onOpenChange={() => {}} onWant={() => {}} onFailure={() => {}} />,
    control: () => screen.getByRole("searchbox").closest("div.relative") as HTMLElement,
    quiet: true,
  },
  {
    tool: "collection-sync",
    path: "/collection/replace",
    page: () => <UploadEntry currentCardCount={12} onPreview={() => {}} choice />,
    control: () => screen.getByLabelText(importReviewCopy.entry.uploadAria).closest("label") as HTMLElement,
    quiet: true,
  },
  {
    tool: "lineup",
    path: "/decks",
    page: () => <StatsViewSwitch view="stats" onView={() => {}} />,
    control: () => screen.getByRole("tablist").closest("span") as HTMLElement,
    quiet: true,
  },
  {
    tool: "friends",
    path: "/friends",
    page: () => (
      <FriendsHead name="Hugh" commander={null} onRename={() => {}} onOpenPicker={() => {}} invitePending={false} held={false} onInvite={() => {}} />
    ),
    control: () => screen.getByRole("button", { name: socialCopy.page.invite }),
    quiet: true,
  },
];

const LIVE = ["help-me-choose", "precons", "find-a-deck", "wishlist", "collection-sync", "lineup"] as const;

function mount(tool: ToolId, page: () => ReactNode, on: boolean) {
  const landing = pageToolLanding(new URL(window.location.href).searchParams.get("tool"), () => on, tool);
  return render(
    <TargetsProvider>
      <MomentsProvider live={[...LIVE]} spent={[]}>
        <ToolLandingMount landing={landing} request="r1" deferred={tool === "find-a-deck"} />
        {page()}
      </MomentsProvider>
    </TargetsProvider>,
  );
}

const flush = () => act(async () => {});
const haloed = () => [...document.querySelectorAll(`[${HALO_ATTR}]`)];

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  spendMomentAction.mockClear();
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe.each(PAGES.filter((p) => !p.quiet))("Try it's landing on $tool's page", ({ tool, path, page, control, open }) => {
  it("haloes the tool's own control and only it, strips the parameter, spends the moment, presses nothing", async () => {
    window.history.replaceState(null, "", `${path}?tool=${tool}&probe=1`);
    mount(tool, page, true);
    await flush();
    open?.();
    await flush();
    const el = control();
    expect(el).not.toBeNull();
    expect(haloed()).toEqual([el]);
    expect(window.location.search).toBe("?probe=1");
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(spendMomentAction).toHaveBeenCalledWith(tool);
  });

  it("strips a stale id with no halo and writes nothing", async () => {
    for (const asked of ["nope", tool === "friends" ? "wishlist" : "friends", "top-off"]) {
      window.history.replaceState(null, "", `${path}?tool=${asked}&probe=1`);
      const { unmount } = mount(tool, page, true);
      await flush();
      open?.();
      await flush();
      expect(window.location.search, asked).toBe("?probe=1");
      expect(haloed(), asked).toEqual([]);
      unmount();
    }
    expect(spendMomentAction).not.toHaveBeenCalled();
  });

  // Every tool with a page landing (Help me choose, Precons, Find a deck, `lineup`, the wishlist, Collection Sync and
  // Friends) has no switch left (each retired), so none has an off state to strip on. `tools.test.ts` holds that a tool
  // with a live switch is not landed while it is off.
});

// A page that IS the tool (R12, G29): its control still draws and stays registered (the moments and the tour use it),
// but the landing is the top of the page: the parameter is stripped at once, nothing is haloed, no moment is spent.
describe.each(PAGES.filter((p) => p.quiet))("Try it's quiet landing on $tool's page", ({ tool, path, page, control }) => {
  it("strips the parameter with no halo and spends nothing", async () => {
    window.history.replaceState(null, "", `${path}?tool=${tool}&probe=1`);
    mount(tool, page, true);
    await flush();
    expect(control()).not.toBeNull();
    expect(window.location.search).toBe("?probe=1");
    act(() => vi.advanceTimersByTime(10_000));
    await flush();
    expect(haloed()).toEqual([]);
    expect(spendMomentAction).not.toHaveBeenCalled();
  });
});

describe("Help me choose with the intro folded", () => {
  it("registers no target, so a landing haloes nothing and spends nothing", async () => {
    window.history.replaceState(null, "", "/decks/new/choose?tool=help-me-choose");
    mount("help-me-choose", () => (
      <>
        <ChooseIntro initiallyOpen={false} art={null} daily={null} />
        <IntakeForm themes={[]} initial={emptyParams()} />
      </>
    ), true);
    await flush();
    act(() => vi.advanceTimersByTime(10_000));
    await flush();
    expect(haloed()).toEqual([]);
    expect(spendMomentAction).not.toHaveBeenCalled();
  });
});

describe("the page targets' own registration", () => {
  it("first run's buttons entry is no Sync page, so it registers no target", async () => {
    window.history.replaceState(null, "", "/?tool=collection-sync");
    mount("collection-sync", () => <UploadEntry currentCardCount={0} onPreview={() => {}} entry="buttons" />, true);
    await flush();
    act(() => vi.advanceTimersByTime(10_000));
    await flush();
    expect(haloed()).toEqual([]);
    expect(spendMomentAction).not.toHaveBeenCalled();
  });
});
