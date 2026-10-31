// The launch list's CSV builder: header always, CRLF, RFC 4180 quoting, the formula guard on = + - @, blank store and code
// for an unknown code, ISO UTC timestamps without milliseconds, and the dated filename.
import { describe, expect, it } from "vitest";
import { csvCell, csvTimestamp, launchListCsv, launchListFilename, type LaunchCsvRow } from "./launch-csv";

const at = new Date("2026-10-31T18:02:11.482Z");
const row = (over: Partial<LaunchCsvRow> = {}): LaunchCsvRow => ({ email: "ana.r@example.com", store: "Knight Moves Cafe", code: "KNT3HZ", addedAt: at, ...over });

describe("launchListCsv", () => {
  it("is the header and a closing CRLF for zero rows", () => {
    expect(launchListCsv([])).toBe("email,store,code,added_at\r\n");
  });

  it("writes one CRLF-ended line per address in the order given", () => {
    const out = launchListCsv([row(), row({ email: "bmorales@example.net", addedAt: new Date("2026-10-31T19:40:57Z") })]);
    expect(out).toBe(
      "email,store,code,added_at\r\nana.r@example.com,Knight Moves Cafe,KNT3HZ,2026-10-31T18:02:11Z\r\nbmorales@example.net,Knight Moves Cafe,KNT3HZ,2026-10-31T19:40:57Z\r\n",
    );
    expect(out.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("leaves store and code blank for an address left on a code nobody made", () => {
    expect(launchListCsv([row({ email: "jo@example.com", store: null, code: null })])).toBe("email,store,code,added_at\r\njo@example.com,,,2026-10-31T18:02:11Z\r\n");
  });

  it("keeps the rows' order (the read hands them oldest first)", () => {
    const out = launchListCsv([row({ email: "a@x.co" }), row({ email: "b@x.co" })]).split("\r\n");
    expect(out.slice(1, 3).map((l) => l.split(",")[0])).toEqual(["a@x.co", "b@x.co"]);
  });
});

describe("csvCell", () => {
  it("quotes a cell holding a comma, a quote or a line break, doubling quotes", () => {
    expect(csvCell("Mox, Boston")).toBe('"Mox, Boston"');
    expect(csvCell('The "99" Cafe')).toBe('"The ""99"" Cafe"');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
    expect(csvCell("two\r\nlines")).toBe('"two\r\nlines"');
  });

  it("leaves a plain cell bare", () => {
    expect(csvCell("Knight Moves Cafe")).toBe("Knight Moves Cafe");
  });

  it.each(["=SUM(A1)", "+1", "-1", "@cmd"])("prefixes a cell starting with %s with an apostrophe", (value) => {
    expect(csvCell(value)).toBe(`'${value}`);
  });

  it("quotes after guarding, and guards only the first character", () => {
    expect(csvCell("=HYPERLINK(\"x\",\"y\")")).toBe('"\'=HYPERLINK(""x"",""y"")"');
    expect(csvCell("a=b")).toBe("a=b");
  });

  it("writes null and empty as nothing", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell("")).toBe("");
  });

  it("guards an address in the file too", () => {
    expect(launchListCsv([row({ email: "+x@example.com" })]).split("\r\n")[1]).toBe("'+x@example.com,Knight Moves Cafe,KNT3HZ,2026-10-31T18:02:11Z");
  });
});

describe("csvTimestamp", () => {
  it("is ISO 8601 UTC with no milliseconds", () => {
    expect(csvTimestamp(at)).toBe("2026-10-31T18:02:11Z");
    expect(csvTimestamp(new Date("2026-11-01T02:15:30Z"))).toBe("2026-11-01T02:15:30Z");
  });
});

describe("launchListFilename", () => {
  it("is dated with the UTC day of the download", () => {
    expect(launchListFilename(new Date("2026-11-02T23:59:59Z"))).toBe("the-99-launch-list-2026-11-02.csv");
    expect(launchListFilename(new Date("2026-11-03T00:00:01Z"))).toBe("the-99-launch-list-2026-11-03.csv");
  });
});
