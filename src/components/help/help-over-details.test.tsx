import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { HELP_STOP_ID, helpStop, useCardDetailsOpen, useCardDetailsUp } from "../../lib/a11y/help-over-dialog";
import { helpPanelCopy } from "../../lib/copy/discovery";
import { stubViewport } from "../../test-utils/stub-viewport";
import { TargetsProvider } from "../discovery/targets-provider";
import { useIsDesktop } from "../ui/use-is-desktop";
import { HelpButton, HelpRoot } from "./help-root";

// The ? over card details at 1280 (discovery R2·9, readiness gap 5): lifted over the backdrop, so the ? still answers
// while card details is up. Pressed there, it lands on Collection › Cards with the key lit (About visual PR 6a, A1).

const push = vi.fn();
vi.mock("../../app/moments-actions", () => ({ spendMomentAction: vi.fn(async () => {}) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/collection", useRouter: () => ({ push, prefetch: vi.fn() }) }));

beforeEach(() => {
  push.mockClear();
  window.history.replaceState(null, "", "/collection?card=x");
  // jsdom draws nothing; the traps only step through controls that have a box.
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Card details as it wires the hooks: modal, trapping, with the lifted ? as its extra stop. `back`: holding the
 *  page and a history entry, as the card modal does (the hook's default). `covered`: a picker it opened is over it, so
 *  it is open but not in front, as the card modal under Fits your decks is. */
function Details({ onClose, back = false, covered = false }: { onClose: () => void; back?: boolean; covered?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(ref, onClose, { lockScroll: back, extraStop: covered ? undefined : helpStop });
  useCardDetailsUp(!covered);
  useCardDetailsOpen(true);
  return (
    <div data-backdrop style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="card" aria-owns={HELP_STOP_ID}>
        <button type="button">first</button>
        <button type="button">last</button>
      </div>
    </div>
  );
}

/** Drawn only from `md` (`desk`) or only below it, as the shell's rail and phone header are. */
function At({ desk, children }: { desk: boolean; children: ReactNode }) {
  const d = useIsDesktop();
  return <div style={d === desk ? undefined : { display: "none" }}>{children}</div>;
}

/** A sheet card details opened over itself (Fits your decks): modal, holding the page and its own history entry. */
function Picker({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(ref, onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="picker" style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <button type="button">pick</button>
    </div>
  );
}

function Page({
  details,
  onClose = () => {},
  back = false,
  header = false,
  picker,
}: {
  details: boolean;
  onClose?: () => void;
  back?: boolean;
  /** Fits your decks open over the card: the card stays mounted, covered. */
  picker?: () => void;
  /** The shell's two ?s, each drawn at its own width; without it, the rail's alone, drawn at every width. */
  header?: boolean;
}) {
  const rail = (
    <nav data-rail>
      <HelpButton place="rail" />
    </nav>
  );
  return (
    <TargetsProvider>
      <HelpRoot on>
        {header ? (
          <>
            <At desk>{rail}</At>
            <At desk={false}>
              <header>
                <HelpButton place="header" />
              </header>
            </At>
          </>
        ) : (
          rail
        )}
        {details && <Details onClose={onClose} back={back} covered={picker !== undefined} />}
        {details && picker && <Picker onClose={picker} />}
      </HelpRoot>
    </TargetsProvider>
  );
}

const q = () => screen.getByRole("button", { name: helpPanelCopy.button });
const named = (name: string) => screen.getByRole("button", { name });
const tab = (shiftKey = false) => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab", shiftKey });

describe("the ? over card details at 1280", () => {
  it("leaves the rail for a layer above the backdrop, keeping its slot", () => {
    stubViewport(1300);
    const { container, rerender } = render(<Page details={false} />);
    expect(q().closest("[data-rail]")).not.toBeNull();
    rerender(<Page details />);
    expect(q().closest("[data-rail]")).toBeNull();
    expect(q().parentElement).toBe(document.body);
    expect(q().style.position).toBe("fixed");
    expect(q().style.zIndex).toBe("51");
    // Named by card details' aria-owns: inside the modal's accessibility tree.
    expect(q().id).toBe(HELP_STOP_ID);
    expect(container.querySelector("[data-rail] > span[aria-hidden]")).not.toBeNull();
    rerender(<Page details={false} />);
    expect(q().closest("[data-rail]")).not.toBeNull();
  });

  it("is one extra Tab stop after card details' last control", () => {
    stubViewport(1300);
    render(<Page details />);
    named("last").focus();
    tab();
    expect(document.activeElement).toBe(q());
    tab();
    expect(document.activeElement).toBe(named("first"));
    tab(true);
    expect(document.activeElement).toBe(q());
  });

  it("pressed over card details, lands on Collection › Cards with the key lit, back to the card", () => {
    stubViewport(1300);
    render(<Page details />);
    fireEvent.click(q());
    expect(push).toHaveBeenCalledWith(
      `/about/collection?from=${encodeURIComponent("/collection?card=x")}&lit=${encodeURIComponent("collection/cards/key")}#cards`,
    );
  });

  it("adds nothing at 390: the ? is not lifted and card details takes no stop", () => {
    stubViewport(390);
    render(<Page details />);
    expect(q().closest("[data-rail]")).not.toBeNull();
    expect(helpStop()).toBeNull();
    named("last").focus();
    tab();
    expect(document.activeElement).toBe(named("first"));
  });
});
