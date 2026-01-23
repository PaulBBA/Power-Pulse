import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user").notNull(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  address: text("address"),
  town: text("town"),
  telephone: text("telephone"),
  email: text("email"),
  groupId: integer("group_id").references(() => groups.id),
});

export const meters = pgTable("meters", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  siteId: integer("site_id").references(() => sites.id),
  mpan: text("mpan"),
  serial: text("serial"),
  location: text("location"),
  supplier: text("supplier"),
  utility: text("utility").notNull(), // e.g. 'Electricity', 'Gas'
});

export const readings = pgTable("readings", {
  id: serial("id").primaryKey(),
  meterId: integer("meter_id").references(() => meters.id),
  date: timestamp("date").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  isEstimated: boolean("is_estimated").default(false),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true });
export const insertSiteSchema = createInsertSchema(sites).omit({ id: true });
export const insertMeterSchema = createInsertSchema(meters).omit({ id: true });
export const insertReadingSchema = createInsertSchema(readings).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Meter = typeof meters.$inferSelect;
export type InsertMeter = z.infer<typeof insertMeterSchema>;
export type Reading = typeof readings.$inferSelect;
export type InsertReading = z.infer<typeof insertReadingSchema>;
