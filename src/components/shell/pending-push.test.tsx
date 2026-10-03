import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { Report } from "./pending-report";
import { usePendingPush } from "./pending-push";

const routerPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));

const handle: { go: (href: string) => void } = { go: () => {} };
const ready = (go: (href: string) => void) => {
  handle.go = go;
};
function Starter() {
  const { go } = usePendingPush();
  useEffect(() => ready(go), [go]);
  return null;
}

describe("usePendingPush", () => {
  it("hands the push to the navigation-pending provider, which runs and reports it", () => {
    routerPush.mockClear();
    const providerPush = vi.fn();
    render(
      <Report.Provider value={{ report: () => {}, pathname: "/", push: providerPush, registerContentScope: () => {} }}>
        <Starter />
      </Report.Provider>,
    );
    act(() => handle.go("/collection/replace"));
    expect(providerPush).toHaveBeenCalledWith("/collection/replace");
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("is a plain push outside the provider", () => {
    routerPush.mockClear();
    render(<Starter />);
    act(() => handle.go("/decks/new"));
    expect(routerPush).toHaveBeenCalledWith("/decks/new");
  });
});
