import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import * as schema from "./schema";
import { databaseUrl } from "./url";

const globalForDb = globalThis as unknown as { pool?: Pool; runOutsideRequest?: <R>(fn: () => R) => R };

// pg's login handshake uses crypto.getRandomValues, which Next rejects while prerendering.
// Opening connections in the server-start context (src/instrumentation.ts) keeps it out of renders.
type ConnectCallback = Parameters<Client["connect"]>[0] & {};

class OutsideRequestClient extends Client {
  connect(): Promise<Client>;
  connect(callback: ConnectCallback): void;
  connect(callback?: ConnectCallback) {
    const run = globalForDb.runOutsideRequest ?? (<R>(fn: () => R) => fn());
    return run(() => (callback ? super.connect(callback) : super.connect()));
  }
}

// Reuse the pool across dev hot reloads.
const pool = globalForDb.pool ?? new Pool({ connectionString: databaseUrl(), max: 10, Client: OutsideRequestClient });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
