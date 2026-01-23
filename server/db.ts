import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "@shared/schema.js";

// Disable fetch connection cache as it's known to cause "Cannot read properties of null (reading 'map')"
// errors with the Neon HTTP driver in some environments.
neonConfig.fetchConnectionCache = false;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
