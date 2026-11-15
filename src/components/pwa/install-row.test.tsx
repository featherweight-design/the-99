import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InstallRow } from "./install-row";
import { INSTALL_ROW_KEY, holdInstallRowForTour, installState, offerInstallAsk, type InstallKind } from "./install-ask";
import { pwaInstallCopy } from "../../lib/copy/pwa-install";
import { DISMISSAL_KEY, dismissalState } from "../../lib/pwa/install-dismissal";
import { removeRaw, writeRaw } from "../ui/local-store";

const c = pwaInstallCopy.row;
const press = vi.fn();
let withdraw: (() => void) | null = null;
const offer = (kind: InstallKind) => act(() => void (withdraw = offerInstallAsk({ kind, press, button: () => null, dismiss: vi.fn(), closeButton: () => null })));

beforeEach(() => {
  removeRaw(INSTALL_ROW_KEY);
  removeRaw(DISMISSAL_KEY);
  press.mockClear();
});
afterEach(() => {
  cleanup();
  act(() => withdraw?.());
  withdraw = null;
});

describe("InstallRow (install onboarding R1c)", () => {
  it("draws nothing while the header slot would not draw", () => {
    render(<InstallRow />);
    expect(screen.queryByText(c.title)).toBeNull();
  });

  it("draws with the browser's line once the slot offers its ask, and the header slot steps aside", () => {
    render(<InstallRow />);
    offer("chrome");
    expect(screen.getByText(c.title)).toBeInTheDocument();
    expect(screen.getByText(c.line.chrome)).toBeInTheDocument();
    expect(installState().row).toBe(true);
    // Phone only, like the header slot it stands for (D1: from md up the checklist is as shipped).
    expect(document.querySelector("[data-install-row]")!.className).toMatch(/(^| )md:hidden( |$)/);
  });

  it("waits while a first-run tour may open or runs, and draws once it ends", () => {
    render(<InstallRow />);
    offer("safari");
    let release = () => {};
    act(() => void (release = holdInstallRowForTour()));
    expect(screen.queryByText(c.title)).toBeNull();
    expect(installState().row).toBe(false);
    act(() => release());
    expect(screen.getByText(c.line.safari)).toBeInTheDocument();
  });

  it("never draws for a player whose tour reached the Install stop", () => {
    writeRaw(INSTALL_ROW_KEY, "seen");
    render(<InstallRow />);
    offer("safari");
    expect(screen.queryByText(c.title)).toBeNull();
  });

  it("selected, it retires for good and runs the slot's own press", () => {
    render(<InstallRow />);
    offer("android");
    fireEvent.click(screen.getByText(c.title));
    expect(press).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(INSTALL_ROW_KEY)).toBe("retired");
    expect(screen.queryByText(c.title)).toBeNull();
    expect(installState().row).toBe(false);
  });

  it("its ✕ retires it for good and counts as one header dismiss", () => {
    render(<InstallRow />);
    offer("safari");
    fireEvent.click(screen.getByRole("button", { name: c.dismissAria }));
    expect(localStorage.getItem(INSTALL_ROW_KEY)).toBe("retired");
    expect(dismissalState()).toBe("quiet");
    expect(press).not.toHaveBeenCalled();
  });
});
