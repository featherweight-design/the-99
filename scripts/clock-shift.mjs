// Move the clock forward for one test run, so date-rotting tests fail now
// instead of on the day they rot.
//
// A test that pins "today" — a fixture dated 2026-09-01, an assertion that a
// deck was played "3 days ago", a cutoff computed from `new Date()` — passes
// until the calendar walks past it, and then fails in someone else's PR with no
// relation to their change. b1 found two that way (#996). This makes the walk
// happen on demand.
//
//   CLOCK_SHIFT_DAYS=400 pnpm test
//
// It is a vitest setup file rather than a `--require` preload because jsdom
// installs its own `Date` into the test environment: patching Node's global
// before the environment exists is overwritten by it, which looks exactly like
// the shift working and testing nothing.
//
// WHAT IT SHIFTS: `Date.now()`, `new Date()` with no arguments, and
// `Date.prototype.getTime`-derived "now" readings that go through those two.
// Explicit dates (`new Date("2026-01-01")`) are left alone, because a fixture's
// stated date is the thing being tested against, not a clock reading.
const DAYS = Number(process.env.CLOCK_SHIFT_DAYS ?? "0");

if (Number.isFinite(DAYS) && DAYS !== 0) {
  const OFFSET_MS = DAYS * 24 * 60 * 60 * 1000;
  const RealDate = globalThis.Date;

  class ShiftedDate extends RealDate {
    constructor(...args) {
      // ONLY the no-argument form is a clock reading. `new Date(iso)` and
      // `new Date(ms)` are stated values — shifting those would move fixtures
      // as well as the clock, and every relative assertion would still pass
      // because both sides moved together. That is the failure mode where a
      // shifted run proves nothing.
      if (args.length === 0) {
        super(RealDate.now() + OFFSET_MS);
        return;
      }
      super(...args);
    }

    static now() {
      return RealDate.now() + OFFSET_MS;
    }
  }
  // `Date.parse`, `Date.UTC` and the rest come across by extension. The rename
  // is cosmetic -- it only makes `Date.name` and stack frames read normally.
  //
  // TWO THINGS THE SUBCLASS CHANGES, neither of which any caller in `src/` or
  // `scripts/` reaches today, both recorded so a future reader is not surprised:
  //   - `Date()` without `new` is legal on the real constructor and returns a
  //     string; a class constructor cannot be called that way, so it throws
  //     `TypeError: Class constructor ShiftedDate cannot be invoked without
  //     'new'`. `Date.length` also drops from 7 to 0.
  Object.defineProperty(ShiftedDate, "name", { value: "Date" });

  // A Date built by NATIVE or HOST code comes from the REAL constructor, so
  // plain subclassing leaves it failing `instanceof Date` -- a silent wrong
  // branch in any code guarded by `value instanceof Date`, CAUSED by the shim
  // rather than found by it.
  //
  // Widened on the internal slot rather than on `instanceof RealDate`. The
  // brand check is what `instanceof` cannot do: a Date from another realm has
  // a different constructor and would read false, while `getTime` throws a
  // TypeError on anything that is not a Date whatever realm made it. Measured
  // under this suite's jsdom, `structuredClone` and `fs.statSync().mtime` are
  // BOTH same-realm today, so this is hardening against a realm boundary that
  // does not exist here yet -- not a fix for a live failure.
  const hasDateSlot = (value) => {
    try {
      RealDate.prototype.getTime.call(value);
      return true;
    } catch {
      return false;
    }
  };
  Object.defineProperty(ShiftedDate, Symbol.hasInstance, { value: hasDateSlot });

  globalThis.Date = ShiftedDate;
  // Stashed so a test can prove the shift ACTUALLY APPLIED. Without this the CI
  // step is unfalsifiable: a preload that silently failed to patch `Date` runs
  // the suite against today's clock and reports a confident green, which is
  // indistinguishable from a suite with no date rot.
  globalThis.__REAL_DATE__ = RealDate;
  globalThis.__CLOCK_SHIFT_DAYS__ = DAYS;

  // Announced for a human reading the run locally. This is NOT what makes a
  // failed shift detectable: vitest captures a setup file's stdout and the
  // default reporter does not print it, so this line is invisible under
  // `pnpm test` -- which is how CI runs. Only `--reporter=verbose` shows it.
  // `scripts/clock-shift.test.mts` is what actually fails when the shift did
  // not apply, and ci.yml echoes the offset so the log names it either way.
  const when = new ShiftedDate().toISOString().slice(0, 10);
  console.log(`[clock-shift] +${DAYS} days — the suite believes today is ${when}`);
}
