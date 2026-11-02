import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Sheet } from "../../components/ui/sheet";
import { inertExemptProps } from "./inert-page";

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

/** A shell the way the app draws it: a rail and a <main> beside each other under <body>. */
function shell() {
  document.body.innerHTML = `<nav id="rail"><button>rail</button></nav><main id="main"><section id="page"><button>page</button></section></main>`;
}
const el = (id: string) => document.getElementById(id)!;
const mountSheet = (open = true) =>
  render(
    <Sheet open={open} onDismiss={() => {}} ariaLabel="Filters" portal>
      <button type="button">inside</button>
    </Sheet>,
    { container: el("page") },
  );

afterEach(() => {
  document.body.innerHTML = "";
});

describe("a modal sheet holds the page behind it", () => {
  it("makes everything beside the sheet's path inert, never the path, and gives it back on close", () => {
    shell();
    const { rerender } = mountSheet();
    expect(el("rail")).toHaveAttribute("inert");
    expect(el("page")).toHaveAttribute("inert");
    expect(el("main")).not.toHaveAttribute("inert");
    expect(document.querySelector('[role="dialog"]')!.closest("[inert]")).toBeNull();
    // Its own scrim is a sibling of the panel and still takes the press that dismisses it.
    expect(document.querySelector('[role="presentation"]')!.closest("[inert]")).toBeNull();
    rerender(
      <Sheet open={false} onDismiss={() => {}} ariaLabel="Filters" portal>
        <button type="button">inside</button>
      </Sheet>,
    );
    expect(el("rail")).not.toHaveAttribute("inert");
    expect(el("page")).not.toHaveAttribute("inert");
  });

  it("covers a node that mounts after it opened, except a modal of its own and an exempt portal", async () => {
    shell();
    mountSheet();
    const toast = document.createElement("div");
    const later = document.createElement("div");
    later.innerHTML = `<div role="dialog" aria-modal="true"><button>card</button></div>`;
    const live = document.createElement("div");
    live.setAttribute("data-inert-exempt", "");
    const region = document.createElement("div");
    region.setAttribute("role", "status");
    const notice = document.createElement("div");
    notice.setAttribute("role", "status");
    notice.innerHTML = `<a href="/x">Open</a>`;
    document.body.append(toast, later, live, region, notice);
    await flush();
    // A live region with a control in it is page chrome, held like the rest.
    expect(notice).toHaveAttribute("inert");
    expect(toast).toHaveAttribute("inert");
    expect(later).not.toHaveAttribute("inert");
    expect(live).not.toHaveAttribute("inert");
    expect(region).not.toHaveAttribute("inert");
  });

  it("leaves what was already inert, and what is exempt, as it found them", () => {
    shell();
    const rail = el("rail");
    rail.setAttribute("inert", "");
    const live = document.createElement("div");
    live.setAttribute("data-inert-exempt", "");
    document.body.append(live);
    const { unmount } = mountSheet();
    expect(live).not.toHaveAttribute("inert");
    unmount();
    expect(rail).toHaveAttribute("inert");
  });

  it("a second sheet over the first holds the first too", () => {
    shell();
    mountSheet();
    const second = document.createElement("div");
    document.body.append(second);
    render(
      <Sheet open onDismiss={() => {}} ariaLabel="More" portal>
        <button type="button">more</button>
      </Sheet>,
      { container: second },
    );
    const dialogs = document.querySelectorAll('[role="dialog"]');
    expect(dialogs).toHaveLength(2);
    expect(dialogs[1].closest("[inert]")).toBeNull();
  });
});

describe("the portals documented as live under a sheet carry the exempt marker", () => {
  it("is a direct-child marker (the props spread it)", () => {
    expect(inertExemptProps).toEqual({ "data-inert-exempt": "" });
  });
  it.each([
    "src/components/shell/account-menu.tsx",
    "src/components/help/help-root.tsx",
    "src/components/settings/push-how-sheet.tsx",
    "src/components/pwa/ios-install-sheet.tsx",
  ])("%s spreads inertExemptProps on the root of its createPortal", (file) => {
    expect(readFileSync(file, "utf8")).toMatch(/createPortal\(\s*<div \{\.\.\.inertExemptProps\} className="contents">/);
  });
});
