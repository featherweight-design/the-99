import sys, re
root = sys.argv[1]
def sub(path, old, new, count=1):
    p = f"{root}/{path}"; s = open(p).read()
    assert s.count(old) == count, (path, old[:70], s.count(old))
    open(p, "w").write(s.replace(old, new))

S = "components/tracker/sheet.tsx"
# 1. The tablet flag reaches the sheet.
sub(S, """  rot,
  onView,""", """  rot,
  tablet = false,
  onView,""")
sub(S, """  rot: Cell["rot"];
  onView: (view: SheetView) => void;""", """  rot: Cell["rot"];
  /** A tablet (and a desktop window, which the tracker draws as one): the sheet takes the half of the table nearest its seat (tablet addendum). */
  tablet?: boolean;
  onView: (view: SheetView) => void;""")
sub(S, "damage: <DamageTab seat={mine} seats={seats} state={state} onCommit={onCommit} />,", "damage: <DamageTab seat={mine} seats={seats} state={state} tablet={tablet} onCommit={onCommit} />,")
# 2. Half the table, from the seat's own edge, the table dimmed (not hidden) behind it; a tap on the table closes it.
sub(S, """    <div className="absolute inset-0 z-30" style={{ containerType: "size" }}>
      {/* The seat's""", """    <div className="absolute inset-0 z-30" style={{ containerType: "size" }}>
      {tablet ? <button type="button" tabIndex={-1} aria-label={copy.sheet.close} onClick={onClose} className="absolute inset-0 cursor-default bg-[rgba(0,0,0,.42)] motion-safe:animate-[sheet-veil_.26s_ease-out_both]" data-testid="sheet-veil" /> : null}
      {/* The seat's""")
sub(S, """          className="flex h-full w-full flex-col gap-2 bg-[color:var(--surface-raised)] px-4 pb-3 pt-2 text-[color:var(--fg)] motion-safe:animate-[sheet-in_.26s_cubic-bezier(.2,.8,.2,1)]\"""",
"""          className={
            tablet
              ? "absolute inset-x-0 bottom-0 flex h-1/2 min-h-[380px] flex-col gap-2 rounded-t-[20px] bg-[color:var(--surface-raised)] px-5 pb-4 pt-2 text-[color:var(--fg)] shadow-[0_-12px_40px_rgba(0,0,0,.45),inset_0_1px_0_var(--border-strong)] motion-safe:animate-[sheet-up_.26s_cubic-bezier(.2,.8,.2,1)_both]"
              : "flex h-full w-full flex-col gap-2 bg-[color:var(--surface-raised)] px-4 pb-3 pt-2 text-[color:var(--fg)] motion-safe:animate-[sheet-in_.26s_cubic-bezier(.2,.8,.2,1)]"
          }""")
# 3. Table joins the row.
sub(S, """(t === "table" ? "ml-auto " : "") + """, "")
# 4. Damage on a tablet: the art fills the card.
sub(S, """function DamageTab({ seat, seats, state, onCommit }: { seat: SeatState; seats: readonly PlaySeat[]; state: GameState; onCommit: (a: Action) => void }) {
  const foes = state.seats.filter((s) => s.seat !== seat.seat);
  return (""", """function DamageTab({ seat, seats, state, tablet, onCommit }: { seat: SeatState; seats: readonly PlaySeat[]; state: GameState; tablet?: boolean; onCommit: (a: Action) => void }) {
  const foes = state.seats.filter((s) => s.seat !== seat.seat);
  if (tablet) return <DamageArt seat={seat} foes={foes} seats={seats} onCommit={onCommit} />;
  return (""")
sub(S, """function CountersTab(""", """/**
 * Commander damage on a tablet (tablet addendum, D1 to D4): one card per opponent across the sheet, the commander's art
 * filling the card the way it fills their panel, the count over the art's foot. A partner pair splits the art and each
 * half carries its own name and stepper, so each commander's count sits under its own art.
 */
function DamageArt({ seat, foes, seats, onCommit }: { seat: SeatState; foes: readonly SeatState[]; seats: readonly PlaySeat[]; onCommit: (a: Action) => void }) {
  return (
    <div className="flex h-full min-h-[236px] flex-col gap-2">
      {foes.length === 0 ? <p className="text-[13px] text-[color:var(--fg-muted)]">{copy.sheet.noOpponents}</p> : null}
      <div className="grid min-h-0 flex-1 gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, foes.length)}, minmax(0, 1fr))` }}>
        {foes.map((foe) => {
          const p = seats.find((x) => x.seat === foe.seat)!;
          const taken = Array.from({ length: foe.commanders }, (_, cmdr) => seat.damage[`${foe.seat}:${cmdr}`] ?? 0);
          return (
            <div key={foe.seat} className={CARD_BOX} data-testid="damage-card">
              <ArtStrip arts={artsOf(p, foe.commanders)} className="absolute inset-0" />
              <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.55)_0%,rgba(0,0,0,0)_26%,rgba(0,0,0,0)_40%,rgba(0,0,0,.86)_100%)]" />
              <b className="relative px-3 pt-2.5 text-[15px] font-semibold [text-shadow:0_1px_6px_rgba(0,0,0,.9)]">{p.you ? copy.history.you : <PersonName n={p.name} />}</b>
              <div className="relative mt-auto flex">
                {taken.map((n, cmdr) => (
                  <div key={cmdr} className="flex min-w-0 flex-1 flex-col items-center gap-1 px-2 pb-3">
                    <span className="max-w-full truncate text-[12.5px] text-[color:var(--fg)] [text-shadow:0_1px_6px_rgba(0,0,0,.9)]">{cmdrName(p, cmdr)}</span>
                    <Stepper size="damageOne" count={n} tone={n > 0 ? "set" : undefined} what={cmdrName(p, cmdr)} onStep={(d) => onCommit({ t: "damage", seat: seat.seat, from: foe.seat, cmdr, delta: d })} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-[color:var(--fg-muted)]">{copy.sheet.damageHint}</p>
    </div>
  );
}

function CountersTab(""")

P = "components/tracker/play-surface.tsx"
sub(P, """          rot={layout.cells[seatsInPlay.findIndex((s) => s.seat === sheet.seat)].rot}
          onView""", """          rot={layout.cells[seatsInPlay.findIndex((s) => s.seat === sheet.seat)].rot}
          tablet={device === "tablet"}
          onView""")
# Coin: the size follows the device.
sub(P, """          onAgain={() => rollDie(roll.kind)}
          onClose={() => setRoll(null)}""", """          onAgain={() => rollDie(roll.kind)}
          onClose={() => setRoll(null)}
          tablet={device === "tablet"}""")

D = "components/tracker/dice-roll.tsx"
sub(D, "export function DiceRoll({ roll, label, onAgain, onClose, children }: { roll: Roll; label: string; onAgain: () => void; onClose: () => void; children: React.ReactNode }) {",
"export function DiceRoll({ roll, label, onAgain, onClose, tablet = false, children }: { roll: Roll; label: string; onAgain: () => void; onClose: () => void; tablet?: boolean; children: React.ReactNode }) {")
old_coin = re.search(r'      \{roll\.kind === "coin" \? \(\n        <div className="pointer-events-none fixed left-1/2 top-\[38%\].*?\n      \) : done', open(f"{root}/{D}").read(), re.S).group(0)
new_coin = '''      {roll.kind === "coin" ? (
        // The coin toss (tablet addendum, K1 to K9): a coin with an edge, thrown up off the table and caught by it. It rises
        // toward you (scale) as it turns end over end about its width (rotateX), falls back, rattles flat and a ring lands
        // under it, matching the dice's throw, settle and land. Its shadow stays on the table and shrinks while it is up.
        <div className="pointer-events-none fixed left-1/2 top-[38%] z-[60] -translate-x-1/2 -translate-y-1/2 [perspective:900px]" style={{ width: tablet ? 120 : 72, height: tablet ? 120 : 72 }}>
          <span key={`shadow-${roll.k}`} aria-hidden className="coin-shadow motion-safe:animate-[coin-shadow_.9s_linear_both]" />
          <span key={`land-${roll.k}`} aria-hidden className="absolute left-1/2 top-1/2 size-[166%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 shadow-[0_0_0_2px_var(--accent)] motion-safe:animate-[coin-land_.5s_ease-out_.9s_forwards]" />
          <span key={`arc-${roll.k}`} className="absolute inset-0 [transform-style:preserve-3d] motion-safe:animate-[coin-arc_.9s_linear_both]">
            <button
              key={roll.k}
              type="button"
              aria-label={label}
              onClick={onAgain}
              className="coin pointer-events-auto absolute inset-0 rounded-full motion-safe:animate-[coin-spin_.9s_cubic-bezier(.12,.6,.3,1)_both,coin-settle_.25s_ease-out_.9s_forwards]"
              style={{ "--rx": roll.values[0] === 1 ? "0deg" : "180deg", "--rz": `${tilt}deg`, "--t": tablet ? "8px" : "5px", transform: `rotateZ(${tilt}deg) rotateX(${roll.values[0] === 1 ? 0 : 180}deg)` } as React.CSSProperties}
              data-testid="dice-coin"
            >
              {[-3, -2, -1, 0, 1, 2, 3].map((i) => <span key={i} aria-hidden className="coin-rim" style={{ "--z": i / 7 } as React.CSSProperties} />)}
              <span aria-hidden className="coin-face coin-face-front" style={{ fontSize: tablet ? 20 : 14 }}>{trackerCopy.dice.heads}</span>
              <span aria-hidden className="coin-face coin-face-back" style={{ fontSize: tablet ? 20 : 14 }}>{trackerCopy.dice.tails}</span>
            </button>
          </span>
        </div>
      ) : done'''
sub(D, old_coin, new_coin)
