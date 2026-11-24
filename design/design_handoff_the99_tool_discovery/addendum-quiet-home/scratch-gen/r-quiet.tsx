import { writeFileSync } from "node:fs";
import { home } from "./fix";
const G = globalThis as any;
const out = (n: string, h: string) => writeFileSync(`dz/frames/${n}.html`, h);
for (const vw of [1300, 1180]) {
  G.__SHIPPED = true;
  out(`q-ship-${vw}`, home({ vw, busy: false }));
  out(`b-ship-${vw}`, home({ vw, busy: true }));
  G.__SHIPPED = false;
  out(`q-prop-${vw}`, home({ vw, busy: false }));
  out(`b-prop-${vw}`, home({ vw, busy: true }));
  out(`l-prop-${vw}`, home({ vw, busy: false, lead: true }));
  out(`t-prop-${vw}`, home({ vw, busy: false, table: true }));
  out(`n-prop-${vw}`, home({ vw, busy: false, friends: false }));
  out(`tl-prop-${vw}`, home({ vw, busy: false, table: true, lead: true }));
  G.__WNPOS = "above"; out(`qa-prop-${vw}`, home({ vw, busy: false })); G.__WNPOS = undefined;
}
G.__SHIPPED = false;
out(`q-prop-1024`, home({ vw: 1024, busy: false }));
console.log("ok");
