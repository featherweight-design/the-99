// The idle warm readies every view the modal can open, not only the modal, so no press inside it waits
// on a download of its own (card-detail-provider.tsx, `warmCardModal`). Read through each view's own
// wrapper: the fits view imports the picker's module statically, so counting module loads would pass
// with the picker's warm dropped. In its own file because a module a test file has loaded stays loaded.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../app/collection/actions", () => ({}));

// Unmounted before the stubs go: the provider cancels its idle callback on unmount.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the idle warm", () => {
  it("readies the modal, the fits view and the fits picker, and asks for the italic face", async () => {
    // jsdom has no FontFaceSet; the warm asks for the face the modal draws in, which no first screen
    // preloads.
    const load = vi.fn(async () => []);
    Object.defineProperty(document, "fonts", { configurable: true, value: { load } });
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal("cancelIdleCallback", (id: number) => clearTimeout(id));
    const { CardDetailProvider, cardModalViewsReady } = await import("./card-detail-provider");
    expect(cardModalViewsReady()).toEqual({ modal: false, fitsView: false, fitsPicker: false });
    render(<CardDetailProvider fetchCard={async () => null}><p>page</p></CardDetailProvider>);
    await vi.waitFor(() => expect(cardModalViewsReady()).toEqual({ modal: true, fitsView: true, fitsPicker: true }));
    expect(load).toHaveBeenCalledWith("italic 400 1em plexSans");
  });
});
