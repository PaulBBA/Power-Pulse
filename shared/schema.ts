import { pgTable, text, serial, integer, timestamp, decimal, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Configuration / Lookup Tables ---

export const siteStatus = pgTable("config_site_status", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g., Active, Closed, Inactive
});

export const utilities = pgTable("config_utilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // Electricity, Gas, Water, etc.
  code: text("code"),
  standardUnits: text("standard_units"),
});

export const suppliers = pgTable("config_suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  isActive: boolean("is_active").default(true),
});

// --- Core Entities ---

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(), // UPRN
  address: text("address"),
  address2: text("address2"),
  town: text("town"),
  county: text("county"),
  postcode: text("postcode"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  telephone: text("telephone"),
  email: text("email"),
  statusId: integer("status_id").references(() => siteStatus.id),
  photoUrl: text("photo_url"),
  comments: text("comments"),
  floorArea: decimal("floor_area", { precision: 12, scale: 2 }),
  degreeDayArea: text("degree_day_area"),
  lastUpdate: timestamp("last_update").defaultNow(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const siteGroups = pgTable("site_groups", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id).notNull(),
  groupId: integer("group_id").references(() => groups.id).notNull(),
});

export const dataSets = pgTable("data_sets", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id).notNull(),
  name: text("name"),
  utilityTypeId: integer("utility_type_id").references(() => utilities.id).notNull(),
  mpanProfile: text("mpan_profile"),
  mpanCoreMprn: text("mpan_core_mprn"),
  meterSerial1: text("meter_serial_1"),
  location: text("location"),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  tariffName: text("tariff_name"),
  meterType: text("meter_type"), // Main, Sub-meter
  isVirtual: boolean("is_virtual").default(false),
  dateClosed: timestamp("date_closed"),
  isActive: boolean("is_active").default(true),
  lastUpdate: timestamp("last_update").defaultNow(),
});

// --- Data Tables ---

export const dataInvoices = pgTable("data_invoices", {
  id: serial("id").primaryKey(),
  dataSetId: integer("data_set_id").references(() => dataSets.id).notNull(),
  date: timestamp("date").notNull(),
  previousDate: timestamp("previous_date"),
  supplierReference: text("supplier_reference"),
  invoiceNumber: text("invoice_number"),
  type: text("type"), // E = Estimate
  batchNumber: text("batch_number"),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  totalConsumption: decimal("total_consumption", { precision: 12, scale: 2 }),
  lastUpdate: timestamp("last_update").defaultNow(),
});

export const dataProfiles = pgTable("data_profiles", {
  id: serial("id").primaryKey(),
  dataSetId: integer("data_set_id").references(() => dataSets.id).notNull(),
  date: timestamp("date").notNull(),
  intervals: decimal("intervals", { precision: 10, scale: 3 }).array(), // 48 half-hour values
  dayTotal: decimal("day_total", { precision: 12, scale: 3 }),
});

// --- Admin To Do ---

export const todoItems = pgTable("todo_items", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  isDone: boolean("is_done").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Auth ---

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user").notNull(),
});

// --- Schemas ---

export const insertSiteSchema = createInsertSchema(sites).omit({ id: true, lastUpdate: true });
export const insertDataSetSchema = createInsertSchema(dataSets).omit({ id: true, lastUpdate: true });
export const insertInvoiceSchema = createInsertSchema(dataInvoices).omit({ id: true, lastUpdate: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

export const insertTodoSchema = createInsertSchema(todoItems).omit({ id: true, createdAt: true });

// --- Types ---

export type Site = typeof sites.$inferSelect;
export type DataSet = typeof dataSets.$inferSelect;
export type Invoice = typeof dataInvoices.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Group = typeof groups.$inferSelect;
export type TodoItem = typeof todoItems.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;
