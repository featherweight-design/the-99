const F = () => (globalThis as any).FIX;
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 30));
const hit = (oracleId: string, name: string, imageUri: string | null, colorIdentity: string[], kind: string | null) =>
  ({ oracleId, name, typeLine: "Legendary Creature", manaCost: null, colorIdentity, partner: kind ? { kind } : null, flavorName: null, imageUri });
const COMMANDERS = [
  hit("o-laezel", "Lae’zel, Vlaakith’s Champion", "art/laezel-stand-in.png", ["W"], "chooseBackground"),
  hit("o-lathliss", "Lathliss, Dragon Queen", "art/lathliss.jpg", ["R"], null),
  hit("o-gisa", "Ghoulcaller Gisa", "art/gisa.jpg", ["B"], null),
];
const BACKGROUNDS = [
  hit("o-raised", "Raised by Giants", "art/raised-by-giants.png", ["G"], null),
  hit("o-noble", "Noble Heritage", "art/noble-heritage.png", ["W"], null),
];
const match = (list: any[], q: string) => list.filter((h) => h.name.toLowerCase().replace(/’/g, "'").includes(q.toLowerCase()));
export const searchOpponentCommandersAction = async (q: string) => delay(match(COMMANDERS, q));
export const searchOpponentBackgroundsAction = async (q: string) => delay(match(BACKGROUNDS, q));
export const listFriendDecksAction = async () => delay([]);
export const listPickerFriendsAction = async () => delay(F()?.friends ?? []);
export const listPickerPodsAction = async () => delay([]);
export const listPodSeatsAction = async () => delay([]);
