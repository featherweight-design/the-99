import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ServiceWorker } from "./service-worker";

function stubWorkers(registrations: { unregister: () => Promise<boolean> }[], controlled: boolean) {
  const register = vi.fn(async () => ({}));
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistrations: async () => registrations, register, controller: controlled ? {} : null },
  });
  return register;
}
const reload = vi.fn();
Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, reload } });

afterEach(() => {
  vi.unstubAllEnvs();
  reload.mockClear();
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe("ServiceWorker", () => {
  it("in development, removes a leftover worker and reloads once so the page is released", async () => {
    const unregister = vi.fn(async () => true);
    stubWorkers([{ unregister }], true);
    render(<ServiceWorker />);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(unregister).toHaveBeenCalled();
  });

  it("in development, does not reload when there was nothing to remove", async () => {
    const register = stubWorkers([], false);
    render(<ServiceWorker />);
    await new Promise((r) => setTimeout(r, 0));
    expect(reload).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it("in production, registers /sw.js once the page has loaded", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const register = stubWorkers([], false);
    render(<ServiceWorker />);
    await waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js"));
  });
});
