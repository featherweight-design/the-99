// For you's hidden-name lookup reports only its own lane's hides. Only the emitted SQL can show the
// boundary is there: an unowned commander hidden on Discover must not read "you hid it" on For you.
import { describe, expect, it } from "vitest";
import { ownedHiddenNameQuery } from "./hidden-matches";

describe("ownedHiddenNameQuery", () => {
  const q = ownedHiddenNameQuery("user_1", "ghal").toSQL();

  it("joins the reader's own collection, so an unowned hide is never reported", () => {
    expect(q.sql).toMatch(/inner join "collection_items" on/);
    expect(q.sql).toContain('"collection_items"."oracle_id" = "hidden_commanders"."oracle_id"');
    expect(q.sql).toContain('"collection_items"."user_id" = $');
  });

  // A commander held in several printings has a collection row for each.
  it("reads each commander once", () => {
    expect(q.sql).toMatch(/^select distinct /);
  });

  it("keeps to For you's population: commander-legal and unbuilt", () => {
    expect(q.sql).toContain('"cards"."commander_legal" = $');
    expect(q.sql).toContain("not exists");
  });

  it("binds the user and the pattern rather than interpolating them", () => {
    expect(q.params).toContain("user_1");
    expect(q.params).toContain("%ghal%");
    expect(q.sql).not.toContain("user_1");
  });
});
