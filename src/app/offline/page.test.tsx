import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import OfflinePage from "./page";
import { pwaCopy } from "../../lib/copy/pwa";

afterEach(cleanup);

describe("/offline", () => {
  it("says the reader is offline and offers to try again, which reloads the address asked for", () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, reload }, configurable: true });
    render(<OfflinePage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(pwaCopy.offline.page.title);
    screen.getByRole("button", { name: pwaCopy.offline.page.retry }).click();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
