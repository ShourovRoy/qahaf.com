// Promotes an existing, verified account to admin: bun run make-admin you@example.com
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { user } from "../src/db/schema";
import { databaseUrl } from "../src/db/url";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: bun run make-admin <email>");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl() });
const db = drizzle({ client: pool, casing: "snake_case" });

const [updated] = await db.update(user).set({ role: "admin" }).where(eq(user.email, email)).returning({ id: user.id, name: user.name });
if (updated) console.log(`${updated.name} <${email}> is now an admin.`);
else console.error(`No account found for ${email}. Register on the site first.`);
await pool.end();
