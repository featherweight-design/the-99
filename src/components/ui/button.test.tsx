import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GhostButton, PrimaryButton } from "./button";

describe("PrimaryButton", () => {
  it("renders a button element when href is absent", () => {
    render(<PrimaryButton>Go</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Go" })).toBeTruthy();
  });

  // The spread sits after both literals deliberately, and each for its own
  // reason. type must stay overridable, so the spread has to follow it.
  // className needs no such protection: it is destructured out of props, so a
  // spread can never carry one and can only add to the merge.
  it("merges a spread className rather than letting it replace the contract", () => {
    const props = { className: "px-4" } as Record<string, unknown>;
    render(<PrimaryButton {...props}>Go</PrimaryButton>);
    const el = screen.getByRole("button", { name: "Go" });
    expect(el.className).toContain("px-4");
    expect(el.className).toContain("bg-[color:var(--brass)]");
  });

  it("still honours a spread type so submit buttons keep working", () => {
    const props = { type: "submit" } as Record<string, unknown>;
    render(<PrimaryButton {...props}>Go</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveProperty(
      "type",
      "submit",
    );
  });

  it("drops the pointer cursor when disabled", () => {
    render(<PrimaryButton disabled>Go</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Go" }).className).toContain(
      "disabled:cursor-default",
    );
  });

  it("drops a style smuggled in past the type ban", () => {
    const props = { style: { background: "red" } } as Record<string, unknown>;
    render(<PrimaryButton {...props}>Go</PrimaryButton>);
    expect(
      screen.getByRole("button", { name: "Go" }).getAttribute("style"),
    ).toBeNull();
  });

  it("renders a link when href is present", () => {
    render(<PrimaryButton href="/decks">Go</PrimaryButton>);
    expect(screen.getByRole("link", { name: "Go" }).getAttribute("href")).toBe(
      "/decks",
    );
  });

  it("carries the brass fill and hover in classes, not inline style", () => {
    render(<PrimaryButton>Go</PrimaryButton>);
    const el = screen.getByRole("button", { name: "Go" });
    expect(el.className).toContain("bg-[color:var(--brass)]");
    expect(el.className).toContain("hover:bg-[color:var(--brass-hover)]");
    expect(el.getAttribute("style")).toBeNull();
  });

  it("appends caller classes so per-surface padding wins", () => {
    render(<PrimaryButton className="px-[26px] py-[13px]">Go</PrimaryButton>);
    const cls = screen.getByRole("button", { name: "Go" }).className;
    expect(cls).toContain("px-[26px]");
    expect(cls).toContain("py-[13px]");
  });

  it("lets a caller class override a base utility", () => {
    render(<PrimaryButton className="rounded-none">Go</PrimaryButton>);
    const cls = screen.getByRole("button", { name: "Go" }).className;
    expect(cls).toContain("rounded-none");
    expect(cls).not.toContain("rounded-lg");
  });

  it("defaults to type=button so it cannot submit a surrounding form", () => {
    render(<PrimaryButton>Go</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveProperty(
      "type",
      "button",
    );
  });

  it("lets a caller opt into type=submit", () => {
    render(<PrimaryButton type="submit">Go</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveProperty(
      "type",
      "submit",
    );
  });

  it("forwards button attributes", () => {
    render(<PrimaryButton disabled>Go</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});

describe("GhostButton", () => {
  it("carries the border and hover in classes, not inline style", () => {
    render(<GhostButton>Go</GhostButton>);
    const el = screen.getByRole("button", { name: "Go" });
    expect(el.className).toContain("var(--border-strong)");
    expect(el.className).toContain("hover:[border-color:var(--brass)]");
    expect(el.className).toContain("hover:[color:var(--brass-hover)]");
    expect(el.getAttribute("style")).toBeNull();
  });

  it("renders a link when href is present", () => {
    render(<GhostButton href="/">Home</GhostButton>);
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe(
      "/",
    );
  });
});
