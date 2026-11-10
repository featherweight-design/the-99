import { describe, expect, it } from "vitest";
import { parseOnSale } from "./on-sale";
import { parsePost } from "./post";
import { fixture, postUrl } from "./__fixtures__/load";

const POSTED = "2026-10-27T17:01:00.000Z";
const p = (text: string) => `<p>${text}</p>`;

describe("parseOnSale", () => {
  it("reads the Star Trek Superdrop post: Nov 9 at 9 a.m. PT is 17:00Z, the pre-queue an hour before", () => {
    const slug = "secret-lair-set-phasers-to-superdrop";
    const parsed = parsePost(fixture(`${slug}.html`), postUrl(slug));
    if (!parsed.ok) throw new Error("fixture must parse");
    expect(parseOnSale(parsed.post.bodyHtml, parsed.post.publishedDate)).toEqual({
      date: "2026-11-09",
      at: "2026-11-09T17:00:00.000Z",
      zone: "America/Los_Angeles",
      preQueueAt: "2026-11-09T16:00:00.000Z",
    });
  });

  it("uses the zone's rules for that day: PT in August is UTC-7", () => {
    expect(parseOnSale(p("The drop arrives on August 12, 2026. The sale goes live at 9 a.m. PT."), "2026-07-30T17:00:00.000Z"))
      .toMatchObject({ date: "2026-08-12", at: "2026-08-12T16:00:00.000Z" });
  });

  it("converts Eastern, minutes and p.m.", () => {
    expect(parseOnSale(p("Launching on December 3, 2026, the sale begins at 1:30 p.m. ET."), "2026-11-20T17:00:00.000Z"))
      .toMatchObject({ at: "2026-12-03T18:30:00.000Z", zone: "America/New_York" });
  });

  it("keeps the date and leaves the time null when the post names no hour", () => {
    expect(parseOnSale(p("Doomsdrop arrives on December 6, 2026."), "2026-11-20T17:00:00.000Z"))
      .toEqual({ date: "2026-12-06", at: null, zone: null, preQueueAt: null });
  });

  it("never places a clock time in a zone by guess", () => {
    expect(parseOnSale(p("The drop arrives on December 6, 2026 and the sale goes live at 9 a.m."), "2026-11-20T17:00:00.000Z"))
      .toEqual({ date: "2026-12-06", at: null, zone: null, preQueueAt: null });
  });

  it("is null when the post states no sale date", () => {
    expect(parseOnSale(p("A look back at last year's drops."), POSTED)).toBeNull();
  });

  it("ignores a date that is not about the sale", () => {
    expect(parseOnSale(p("Orders placed before October 20 ship in two weeks."), POSTED)).toBeNull();
  });

  it("puts a date with no year in the next year when it is already past", () => {
    expect(parseOnSale(p("The drop arrives on January 8. The sale goes live at 9 a.m. PT."), "2026-12-20T17:00:00.000Z"))
      .toMatchObject({ date: "2027-01-08", at: "2027-01-08T17:00:00.000Z" });
  });

  it("rejects an impossible clock or day", () => {
    expect(parseOnSale(p("The drop arrives on November 9, 2026. The sale goes live at 14 a.m. PT."), POSTED))
      .toMatchObject({ date: "2026-11-09", at: null });
    expect(parseOnSale(p("The drop arrives on February 30, 2026."), POSTED)).toBeNull();
  });
});
