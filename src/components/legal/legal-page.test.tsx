// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { LegalPage } from "./legal-page";
import { privacyDoc } from "../../lib/copy/legal/privacy";
import { termsDoc } from "../../lib/copy/legal/terms";
import { legalCopy, LEGAL_EMAIL } from "../../lib/copy/legal/shared";

afterEach(cleanup);

describe.each([["privacy", privacyDoc], ["terms", termsDoc]] as const)("LegalPage · %s", (_name, doc) => {
  it("is one article with one h1 and the dated mono line, and brings no landmark of its own", () => {
    render(<LegalPage doc={doc} />);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(doc.title);
    expect(screen.getByText(legalCopy.lastUpdated(doc.updated))).toBeTruthy();
    expect(document.querySelector("main")).toBeNull();
    expect(document.querySelector("footer[data-fan-content-notice]")).toBeNull();
  });

  it("lists every section in `On this page`, each anchor resolving to a heading of that section", () => {
    render(<LegalPage doc={doc} />);
    const nav = screen.getByRole("navigation", { name: legalCopy.onThisPage });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.querySelector("[data-toc-title]")!.textContent)).toEqual(doc.sections.map((s) => s.title));
    for (const [i, a] of links.entries()) {
      const id = a.getAttribute("href")!.slice(1);
      expect(id).toBe(doc.sections[i].id);
      const target = document.getElementById(id)!;
      expect(target.tagName).toBe("H2");
      expect(target.textContent).toBe(doc.sections[i].title);
    }
    expect(new Set(doc.sections.map((s) => s.id)).size).toBe(doc.sections.length);
  });

  it("draws the support address as one mailto link wherever the text names it", () => {
    render(<LegalPage doc={doc} />);
    const mails = screen.getAllByRole("link", { name: LEGAL_EMAIL });
    expect(mails.length).toBeGreaterThan(0);
    for (const a of mails) expect(a.getAttribute("href")).toBe(`mailto:${LEGAL_EMAIL}`);
    expect(document.body.textContent).not.toContain("{email}");
  });

  it("is never fixed or sticky except the contents column from md", () => {
    render(<LegalPage doc={doc} />);
    const bad = [...document.querySelectorAll("*")].filter((e) => /(^|\s)(fixed|absolute)(\s|$)/.test(e.getAttribute("class") ?? "") && e.tagName !== "SPAN");
    expect(bad).toEqual([]);
  });
});

describe("LegalToc: the section in view", () => {
  it("marks the last heading whose top has passed the reading line, and follows a scroll", () => {
    const tops = new Map<string, number>();
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { top: tops.get(this.id) ?? 5000 } as DOMRect;
    };
    try {
      render(<LegalPage doc={termsDoc} />);
      const current = () => screen.getByRole("navigation", { name: legalCopy.onThisPage }).querySelector("[aria-current]")!.getAttribute("href");
      expect(current()).toBe(`#${termsDoc.sections[0].id}`);
      tops.set(termsDoc.sections[0].id, -400);
      tops.set(termsDoc.sections[1].id, 120);
      act(() => { window.dispatchEvent(new Event("scroll")); });
      expect(current()).toBe(`#${termsDoc.sections[1].id}`);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
    }
  });
});
