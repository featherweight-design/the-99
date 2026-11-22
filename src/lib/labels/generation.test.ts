import { describe, expect, it } from "vitest";

import { db } from "../../db";
import { generationQuery } from "./generation";

describe("generationQuery", () => {
  it("takes the newest of the card labels and the verified judged answers, each subselect on its own table", () => {
    const { sql } = generationQuery(db).toSQL();
    expect(sql).toContain('(select max(cl.labelled_at) from "card_labels" cl)');
    expect(sql).toContain('(select max(jl.verified_at) from "judged_labels" jl)');
  });
});
