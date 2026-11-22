export const SEATS = {
  clavYou: { seat: 0, you: true, name: "Chris", art: "art/clav-show.jpg", partnerArt: null, commander: "Clavileño, First of the Blessed", partner: null, deck: "Blood Rites" },
  saiDee: { seat: 3, you: false, name: "Dee", art: "art/sai.jpg", partnerArt: null, commander: "Sai, Master Thopterist", partner: null, deck: "Sai Thopters" },
  whiteYou: { seat: 0, you: true, name: "Chris", art: "art/white.png", partnerArt: null, commander: "White plate", partner: null, deck: "Worst case" },
  you: { seat: 0, you: true, name: "Chris", art: "art/sai.jpg", partnerArt: null, commander: "Sai, Master Thopterist", partner: null, deck: "Sai Thopters" },
  colin: { seat: 1, you: false, name: "Colin", art: "art/ghalta.jpg", partnerArt: null, commander: "Ghalta, Primal Hunger", partner: null, deck: "Ghalta Stompy" },
  peter: { seat: 2, you: false, name: "Peter", art: "art/gisa.jpg", partnerArt: null, commander: "Ghoulcaller Gisa", partner: null, deck: "Gisa Zombies" },
  dee: { seat: 3, you: false, name: "Dee", art: "art/clav-ext.jpg", partnerArt: null, commander: "Clavileño, First of the Blessed", partner: null, deck: "Blood Rites" },
  white: { seat: 3, you: false, name: "Dee", art: "art/white.png", partnerArt: null, commander: "White plate", partner: null, deck: "Worst case" },
};
const E = { t: "endTurn" };
export const LOG = [{ t: "life", seat: 2, delta: -4 }, E, { t: "life", seat: 1, delta: -3 }, E, E];
