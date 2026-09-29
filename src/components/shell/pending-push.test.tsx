import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Report } from "./pending-report";
import { usePendingPush } from "./pending-push";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function Harness({ onReady }: { onReady: (go: (href: string) => void) => void }) {
  const { go } = usePendingPush();
  onReady(go);
  return null;
}

function mount(pathname: string) {
  const reports: [string, boolean][] = [];
  let go: (href: string) => void = () => {};
  render(
    <Report.Provider value={{ report: (_id, href, pending) => reports.push([href, pending]), pathname }}>
      <Harness onReady={(g) => (go = g)} />
    </Report.Provider>,
  );
  return { reports, go: (href: string) => go(href) };
}

describe("usePendingPush", () => {
  it("pushes, and reports the push as pending to the provider", () => {
    push.mockClear();
    const { reports, go } = mount("/decks");
    act(() => go("/collection/replace"));
    expect(push).toHaveBeenCalledWith("/collection/replace");
    expect(reports).toContainEqual(["/collection/replace", true]);
  });

  it("reports nothing pending for a push to the page already open", () => {
    const { reports, go } = mount("/decks");
    act(() => go("/decks?folder=a"));
    expect(reports.some(([, pending]) => pending)).toBe(false);
  });

  it("reports nothing until it is asked to go", () => {
    const { reports } = mount("/decks");
    expect(reports.some(([, pending]) => pending)).toBe(false);
  });
});
