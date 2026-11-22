export const SEATS = {
  you: { seat: 0, you: true, name: "Chris", art: "art/sai.jpg", partnerArt: null, commander: "Sai, Master Thopterist", partner: null, deck: "Sai Thopters" },
  colin: { seat: 1, you: false, name: "Colin", art: "art/ghalta.jpg", partnerArt: null, commander: "Ghalta, Primal Hunger", partner: null, deck: "Ghalta Stompy" },
  peter: { seat: 2, you: false, name: "Peter", art: "art/giada.jpg", partnerArt: null, commander: "Giada, Font of Hope", partner: null, deck: "Giada Angels" },
  max: { seat: 3, you: false, name: "Max", art: "art/gisa.jpg", partnerArt: null, commander: "Ghoulcaller Gisa", partner: null, deck: "Gisa Zombies" },
  max2: { seat: 3, you: false, name: "Max", art: "art/bruse.jpg", partnerArt: "art/ishai.jpg", commander: "Bruse Tarl, Boorish Herder", partner: "Ishai, Ojutai Dragonspeaker", deck: "Bruse Ishai" },
  chris: { seat: 4, you: false, name: "Sam", art: "art/killian.jpg", partnerArt: null, commander: "Killian, Ink Duelist", partner: null, deck: "Killian" },
  sam: { seat: 5, you: false, name: "Alex", art: null, partnerArt: null, commander: "", partner: null, deck: null },
};
const E = { t: "endTurn" };
export const LOG = [
  { t: "life", seat: 2, delta: -4 }, E, { t: "damage", seat: 0, from: 2, cmdr: 0, delta: 3 }, E, { t: "monarch", seat: 3 }, E,
  { t: "counter", seat: 0, key: "poison", delta: 2 }, E,
  { t: "damage", seat: 0, from: 1, cmdr: 0, delta: 6 }, { t: "damage", seat: 2, from: 1, cmdr: 0, delta: 6 }, E,
  { t: "life", seat: 1, delta: -3 }, E, { t: "life", seat: 3, delta: -2 }, E, E,
];
export const LOG6 = [...LOG.slice(0, -2), { t: "damage", seat: 0, from: 3, cmdr: 1, delta: 4 }, E, E, E, E];
export const LOG2 = [{ t: "damage", seat: 0, from: 1, cmdr: 0, delta: 6 }, E, { t: "life", seat: 1, delta: -5 }, E, E];
export const LOGY = [...LOG, E, E];
export const LOGY1 = [...LOG, E];
export const LOGY3 = [...LOG, E, E, E];
export const FRESH = [];
