/**
 * Characters as the database counts them.
 *
 * `String.prototype.length` counts UTF-16 code units, so an emoji is two and a
 * flag is four; Postgres `char_length` — which is what `deck_games`'s check
 * uses — counts code points. Counting the JavaScript way would let the form
 * report "142 / 140" for 71 emoji the column would have stored happily, and
 * would make the action refuse them. One definition, and it is the column's.
 *
 * It is not grapheme clusters, which is a third answer again: a family emoji is
 * several code points and one grapheme. The column is the contract, so the
 * column's counting wins.
 */
export function countCharacters(value: string): number {
  return [...value].length;
}
