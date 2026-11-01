import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";
import { commandersCopy, discoverCopy } from "../../lib/copy/lanes";
import { hiddenListCopy } from "../../lib/copy/commanders-hidden";

// One subtree, so every string appears exactly once: the header used to ship a
// mobile branch beside a desktop one and matched twice.
describe("PageHeader", () => {
  it("names the owned lane and glosses it", () => {
    render(<PageHeader lane="owned" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(commandersCopy.title);
    screen.getByText(commandersCopy.subtitle);
  });

  it("names the discover lane and glosses it", () => {
    render(<PageHeader lane="discover" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(discoverCopy.title);
    screen.getByText(discoverCopy.subtitle);
  });

  it("names the Hidden tab's page and glosses it", () => {
    render(<PageHeader lane="hidden" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(hiddenListCopy.title);
    screen.getByText(hiddenListCopy.subtitle);
  });

  // The scope is the route now. A control here would be a second switch beside
  // the nav's, and the two could disagree about which lane the reader is on.
  it("carries no control at all", () => {
    render(<PageHeader lane="owned" />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  // The header states what the lane is, never how much of it survived a filter
  // — that sentence is the rack's result line, and it is the page's live region.
  it("prints no count", () => {
    const { container } = render(<PageHeader lane="discover" />);
    expect(container.textContent).not.toMatch(/\d/);
  });
});
