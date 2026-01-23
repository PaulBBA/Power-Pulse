import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "@shared/schema.js";

// The neon http driver has issues with the fetch connection cache in some environments
// leading to "Cannot read properties of null (reading 'map')" errors.
// Setting this to false can help stabilize the driver.
neonConfig.fetchConnectionCache = false;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
