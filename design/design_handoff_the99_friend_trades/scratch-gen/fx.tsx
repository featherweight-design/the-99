// Friend trades R1 fixtures: friends Colin, Peter, Max, Chris; real card art (account-2 friend_decks art).
import { named } from "../src/lib/person-name/mint";
export const NOW = new Date("2026-11-27T09:00:00Z");
let seq = 0;
const id = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
export const card = (name: string, f: string, cents: number | null, spare = 1) => ({ oracleId: id(), name, imageUri: `art/${f}.jpg`, spare, cents });
export const K = {
  ghalta: card("Ghalta, Primal Hunger", "ghalta", 1450), sai: card("Sai, Master Thopterist", "sai", 249, 2),
  lath: card("Lathliss, Dragon Queen", "lathliss", 1299), dina: card("Dina, Essence Brewer", "dina", 59),
  zada: card("Zada, Hedron Grinder", "zada", 99, 3), miku: card("Miku, Song of the People", "miku", 349),
  jace: card("Jace, Multiverse Architect", "jace", 199), zim: card("Zimone, Infinite Analyst", "zimone", 499),
  giada: card("Giada, Font of Hope", "giada", 350, 2), doom: card("Doctor Doom, King of Latveria", "doom", 1899),
  gisa: card("Ghoulcaller Gisa", "gisa", 299), quin: card("Quintorius, History Chaser", "quintorius", 189),
  kil: card("Killian, Decisive Mentor", "killian", 129), rootha: card("Rootha, Mastering the Moment", "rootha", 79),
  ash: card("Ashling, the Limitless", "ashling", 649), tch: card("T'Challa, Wakanda's King", "tchalla", 279),
  ool: card("Auntie Ool, Cursewretch", "auntie-ool", null),
};
const FN: any = { giada: "Giada, Font of Hope", sai: "Sai, Master Thopterist", rootha: "Rootha, Mastering the Moment", ghalta: "Ghalta, Primal Hunger" };
export const face = (f: string) => ({ oracleId: "c-" + f, name: FN[f], artCropUri: `art/face-${f}.jpg` });
export const FR = {
  colin: { publicId: "colin", displayName: named("Colin"), since: new Date("2026-08-02"), commander: face("giada") },
  peter: { publicId: "peter", displayName: named("Peter"), since: new Date("2026-07-14"), commander: face("sai") },
  max: { publicId: "max", displayName: named("Max"), since: new Date("2026-09-20"), commander: face("rootha") },
  chris: { publicId: "chris", displayName: named("Chris"), since: new Date("2026-06-30"), commander: face("ghalta") },
} as any;
export const line = (c: any, extra: any = {}) => ({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri, spare: c.spare, onWishlist: false, typeLine: "Legendary Creature", colorIdentity: [], deckNeed: 0, ...extra });
