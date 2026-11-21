/**
 * Who goes first, by the d20 (README "Random rolls the d20 on screen for each seat"). Every seat rolls; the highest goes
 * first, and a tie for the highest rerolls among the tied seats only, as often as it takes. All the rounds are decided
 * here before anything is thrown, so the game starts on the winner and the dice on screen only show the rounds.
 */
export type FirstRoll = { rounds: { seat: number; value: number }[][]; first: number };

export function rollForFirst(seats: readonly number[], d20: () => number): FirstRoll {
  if (seats.length === 0) throw new Error("rollForFirst: no seats");
  const rounds: FirstRoll["rounds"] = [];
  let left = [...seats];
  for (;;) {
    const round = left.map((seat) => ({ seat, value: d20() }));
    rounds.push(round);
    const top = Math.max(...round.map((r) => r.value));
    left = round.filter((r) => r.value === top).map((r) => r.seat);
    if (left.length === 1) return { rounds, first: left[0] };
  }
}
