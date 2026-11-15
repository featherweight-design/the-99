const Module = require("module"); const path = require("path");
const orig = Module._resolveFilename;
Module._resolveFilename = function (req, ...a) { if (req === "@clerk/nextjs") return path.join(__dirname, "clerkstub/index.js"); return orig.call(this, req, ...a); };
require("./render.tsx");
