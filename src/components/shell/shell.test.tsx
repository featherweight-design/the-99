// Shell's half of the About sheet: whether it mounts the sheet, and with what.
// The sheet's own rules are about-sheet.test.tsx's; what only this can answer is
// that the mount does not depend on the header being present, because the
// sheet's latch only works if the element survives a re-render that carries none.

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));
// The navigation-pending provider runs code-started pushes, so it reads the router; this suite
// renders it outside an app router, where the real hook throws.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: () => {} }),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_1" }) }));
// The reader's resolved switches: the environment, with any override a test lays over it.
let overrides: Record<string, string> = {};
vi.mock("../../lib/switches/snapshot", () => ({ resolveSwitchEnv: async () => ({ ...process.env, ...overrides }) }));
let uniqueCards = 5;
vi.mock("../../lib/home/summary", () => ({ getCollectionStats: async () => ({ uniqueCards }) }));
vi.mock("./nav", () => ({ NavRail: () => null, TabBar: () => null, MobileHeader: () => null }));
vi.mock("./about-sheet", () => ({
  AboutSheet: ({ state }: { state: { kind: string } }) => <div data-testid="about-sheet">{state.kind}</div>,
}));

const Shell = (await import("./shell")).default;
const { DEFAULT_THEME } = await import("../../lib/theme/themes");

async function renderShell() {
  render(await Shell({ children: <p>page</p>, theme: DEFAULT_THEME }));
}

beforeEach(() => {
  requestHeaders = new Headers();
});
afterEach(() => {
  delete process.env.ABOUT_SHEET_ENABLED;
  overrides = {};
  uniqueCards = 5;
});

describe("Shell and the About sheet", () => {
  it("mounts nothing with the switch off, whatever the header says", async () => {
    requestHeaders = new Headers({ "x-about-sheet": "0" });
    await renderShell();
    expect(screen.queryByTestId("about-sheet")).toBeNull();
  });

  it("hands the sheet the proxy's decision with the switch on", async () => {
    process.env.ABOUT_SHEET_ENABLED = "true";
    requestHeaders = new Headers({ "x-about-sheet": "0" });
    await renderShell();
    expect(screen.getByTestId("about-sheet").textContent).toBe("firstRun");
  });

  it("follows the reader's own switches, as the proxy does, not the environment's", async () => {
    // An override switching the sheet on for this reader: the proxy decides it, so the shell reads it.
    overrides = { ABOUT_SHEET_ENABLED: "true" };
    requestHeaders = new Headers({ "x-about-sheet": "0" });
    await renderShell();
    expect(screen.getByTestId("about-sheet").textContent).toBe("firstRun");
  });

  it("ignores the header for a reader the sheet is off for, though the environment has it on", async () => {
    // The proxy strips the header only for readers it is on for, so this one's could be forged.
    process.env.ABOUT_SHEET_ENABLED = "true";
    overrides = { ABOUT_SHEET_ENABLED: "false" };
    requestHeaders = new Headers({ "x-about-sheet": "0" });
    await renderShell();
    expect(screen.queryByTestId("about-sheet")).toBeNull();
  });

  it("still mounts it with no header, so a re-render cannot unmount an open sheet", async () => {
    process.env.ABOUT_SHEET_ENABLED = "true";
    await renderShell();
    expect(screen.getByTestId("about-sheet").textContent).toBe("none");
  });

  it("puts it after the page, last in tab order", async () => {
    process.env.ABOUT_SHEET_ENABLED = "true";
    await renderShell();
    const main = screen.getByText("page").closest("main")!;
    const sheet = screen.getByTestId("about-sheet");
    expect(main.compareDocumentPosition(sheet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// The lock's tab bar is 88px (first-run-locked-nav 4.1). Set on the shell's
// wrapper, so the bar and every surface reserving its height read one figure.
describe("Shell and the locked tab bar height", () => {
  it("sets --tabbar-h to 88px while locked, around the bar and the main column", async () => {
    uniqueCards = 0;
    await renderShell();
    const main = screen.getByText("page").closest("main")!;
    const wrapper = main.closest<HTMLElement>("[style]")!;
    expect(wrapper.style.getPropertyValue("--tabbar-h")).toBe("88px");
    expect(main.className).toContain("pb-[calc(var(--tabbar-h)");
    // Outside the pending provider, whose loading overlay renders beside the shell rather than
    // inside it: that overlay has to read the same 88px or its foot sits under the bar.
    expect(wrapper.className).toBe("contents");
    expect(wrapper.parentElement?.closest("[style*='--tabbar-h']") ?? null).toBeNull();
  });

  it("leaves the global 74px alone once unlocked", async () => {
    await renderShell();
    const main = screen.getByText("page").closest("main")!;
    expect(main.closest<HTMLElement>("[style*='--tabbar-h']")).toBeNull();
  });
});
