// The pages' moments (discovery R1, PR 4): each control registers its moment under the condition the screen's own data
// gives it, and shows the bubble once on screen. The rules themselves are the provider's tests.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ARRIVE_MS, MomentsProvider } from "./moments-provider";
import { MOMENTS, type MomentId } from "../../lib/moments/registry";
import { momentsCopy } from "../../lib/copy/moments";
import { NavRail, TabBar } from "../shell/nav";
import { StatsViewSwitch } from "../decks/lineup/stats-view-switch";
import { PreconDoor } from "../decks/precons/precon-door";
import { UploadChoice, type SyncChoice } from "../collection/upload-choice";

vi.mock("../../app/moments-actions", () => ({ spendMomentAction: async () => {} }));
vi.mock("../../lib/ui/reveal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/ui/reveal")>()),
  reveal: vi.fn(),
}));
vi.mock("../shell/pending-push", () => ({ usePendingPush: () => ({ go: () => {} }) }));
let pathname = "/commanders";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Ana", fullName: "Ana Ruiz", primaryEmailAddress: { emailAddress: "a@example.com" } } }),
  useClerk: () => ({ redirectToUserProfile: vi.fn(), signOut: vi.fn() }),
}));

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

function wrap(node: ReactNode) {
  return render(
    <MomentsProvider live={ALL} spent={[]}>
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
  pathname = "/commanders";
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  notify = null;
});

describe("M12, Discover in the rail and the tab bar", () => {
  const discover = () => screen.getAllByRole("link").find((a) => a.getAttribute("href") === "/discover")!;
  it.each([
    ["the rail", () => <NavRail locked={false} theme="amonkhet" helpMoment />],
    ["the tab bar", () => <TabBar locked={false} helpMoment />],
  ])("carries Help me choose in %s on /commanders for a reader with no deck", async (_, bar) => {
    wrap(bar());
    const link = discover();
    await seen(link);
    const bubble = note(momentsCopy.helpMeChoose.tool);
    expect(link.getAttribute("aria-describedby")).toBe(bubble?.id);
  });
  it.each(["/decks", "/commanders/atraxa-praetors-voice"])("stays away on %s", async (path) => {
    pathname = path;
    wrap(<TabBar locked={false} helpMoment />);
    await seen(discover());
    expect(screen.queryByRole("note")).toBeNull();
  });
  it("stays away for a reader with a deck", async () => {
    wrap(<TabBar locked={false} helpMoment={false} />);
    await seen(discover());
    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("M13, the Stats switch", () => {
  const sw = (moment: boolean, view: "tiles" | "stats" = "tiles") => <StatsViewSwitch view={view} onView={() => {}} moment={moment} />;
  it("carries Stats with three decks or more, on Tiles", async () => {
    wrap(sw(true));
    await seen(screen.getByRole("tablist").parentElement!);
    expect(note(momentsCopy.lineup.tool)).toBeTruthy();
  });
  it.each([
    ["under three decks", false, "tiles"],
    ["already on Stats", true, "stats"],
  ] as const)("stays away %s", async (_, moment, view) => {
    wrap(sw(moment, view));
    await seen(screen.getByRole("tablist").parentElement!);
    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("M14, Browse precons", () => {
  it("carries Precons on the picker's door", async () => {
    wrap(<PreconDoor />);
    const link = screen.getByRole("link");
    await seen(link);
    expect(link.getAttribute("aria-describedby")).toBe(note(momentsCopy.precons.tool)?.id);
  });
});

describe("M15, the Sync card", () => {
  const base = {
    filename: "f.csv", rows: 10, replaceBefore: 10, addBefore: 10, replaceAfter: 10, addAfter: 20,
    facts: { editsSinceUpload: 0, lastUploadAt: "2026-10-02T12:00:00.000Z", historyReaches: true },
    overlap: { held: 1, of: 10 }, onContinue: () => {}, onCancel: () => {},
  };
  const sync = (over: Partial<SyncChoice> = {}): SyncChoice => ({
    unavailable: null, anchorAt: "2026-10-02T12:00:00.000Z", figure: { before: 10, after: 12 },
    note: { kind: "keeps", cards: 1 }, next: { kind: "sync" }, stale: null, followUp: null, ...over,
  });
  const card = () => document.querySelector("[data-choice=sync]")!;
  it("carries Sync on a choice step that offers it", async () => {
    wrap(<UploadChoice {...base} sync={sync()} picked={null} onPick={() => {}} />);
    await seen(card());
    expect(card().getAttribute("aria-describedby")).toBe(note(momentsCopy.collectionSync.tool)?.id);
  });
  it.each(["Enter", " "])("picks Sync and closes the tip on %j, as a press does", async (key) => {
    const onPick = vi.fn();
    wrap(<UploadChoice {...base} sync={sync()} picked={null} onPick={onPick} />);
    await seen(card());
    expect(note(momentsCopy.collectionSync.tool)).toBeTruthy();
    act(() => { fireEvent.keyDown(card(), { key }); });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith("sync");
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(note(momentsCopy.collectionSync.tool)).toBeNull();
  });
  it("stays away while the card shows syncOff", async () => {
    wrap(<UploadChoice {...base} sync={sync({ unavailable: "noRecord" })} picked={null} onPick={() => {}} />);
    await seen(card());
    expect(screen.queryByRole("note")).toBeNull();
  });
});
