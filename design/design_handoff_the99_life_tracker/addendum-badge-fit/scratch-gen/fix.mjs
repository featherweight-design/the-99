export const SEATS = {
  you:   { seat: 0, you: true,  name: "Chris", art: "art/sai.jpg",    partnerArt: null, commander: "Sai, Master Thopterist", partner: null, deck: "Sai Thopters" },
  colin: { seat: 1, you: false, name: "Colin", art: "art/ghalta.jpg", partnerArt: null, commander: "Ghalta, Primal Hunger", partner: null, deck: "Ghalta Stompy" },
  peter: { seat: 2, you: false, name: "Peter", art: "art/zimone.jpg", partnerArt: null, commander: "Zimone, Quandrix Prodigy", partner: null, deck: "Zimone Lands" },
  max:   { seat: 3, you: false, name: "Max",   art: "art/giada.jpg",  partnerArt: null, commander: "Giada, Font of Hope", partner: null, deck: "Giada Angels" },
  dee:   { seat: 4, you: false, name: "Dee",   art: "art/dina.jpg",   partnerArt: null, commander: "Dina, Soul Steeper", partner: null, deck: "Dina Drain" },
  sam:   { seat: 5, you: false, name: "Sam",   art: "art/rootha.jpg", partnerArt: null, commander: "Rootha, Mercurial Artist", partner: null, deck: "Rootha Spells" },
};
const E = { t: "endTurn" };
// Seat 0 carries the load: damage from every other seat, four counters, tax and the crown.
export const heavy = (others, ends = 2) => [
  ...others.map((s, i) => ({ t: "damage", seat: 0, from: s, cmdr: 0, delta: [8, 6, 5, 3, 2][i] })),
  { t: "counter", seat: 0, key: "poison", delta: 3 },
  { t: "counter", seat: 0, key: "energy", delta: 4 },
  { t: "counter", seat: 0, key: "experience", delta: 2 },
  { t: "counter", seat: 0, key: "rad", delta: 1 },
  { t: "tax", seat: 0, cmdr: 0, delta: 2 },
  { t: "monarch", seat: 0 },
  { t: "life", seat: 0, delta: -6 },
  { t: "damage", seat: 1, from: 0, cmdr: 0, delta: 4 },
  { t: "counter", seat: 2, key: "poison", delta: 2 },
  ...Array(ends).fill(E),
];
