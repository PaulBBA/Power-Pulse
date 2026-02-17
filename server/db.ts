import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "@shared/schema.js";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function runMigrations() {
  console.log("Running database migrations...");
  try {
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("Database migrations complete.");
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("Tables already exist, skipping migration.");
    } else {
      throw error;
    }
  }
}
