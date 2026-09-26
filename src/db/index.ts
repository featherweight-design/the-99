import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

// ONE pool per process, kept on `globalThis`. A route handler and a page are separate server
// bundles, each with its own copy of this module, so a module-level pool gave each its own
// connections: `GET /api/card-detail` opened fresh websockets on its first request (measured at
// ~900ms against ~220ms through the page's already-warm pool) while the page's sat idle beside it.
// Where the platform runs the two as separate functions this shares nothing, and costs nothing.
const shared = globalThis as typeof globalThis & { __the99Pool?: Pool };
shared.__the99Pool ??= new Pool({ connectionString });

export const db = drizzle(shared.__the99Pool, { schema });
