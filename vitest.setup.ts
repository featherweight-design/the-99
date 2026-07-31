import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-registers its cleanup hook when Vitest runs with
// `globals: true`. This project keeps globals off and imports explicitly, so
// the hook has to be registered here — without it, rendered DOM accumulates
// across tests and role queries fail with "multiple elements found".
afterEach(cleanup);

// Client components import server actions directly (the pattern throughout src/components),
// and `src/db` throws at module load without a connection string. No test opens a connection;
// this is the same stub the production build uses to typecheck without a database.
process.env.DATABASE_URL ??= "postgres://stub:stub@localhost/stub";
