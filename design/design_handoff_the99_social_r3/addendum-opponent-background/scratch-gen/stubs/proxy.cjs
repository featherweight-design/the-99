const fn = function () { return Promise.resolve(null); };
const h = { get: (_t, k) => (k === "__esModule" ? true : k === "default" ? P : k === "then" ? undefined : P), apply: () => Promise.resolve(null), construct: () => P };
const P = new Proxy(fn, h);
module.exports = P;
