import { pgTable, text, serial, integer, timestamp, decimal, boolean, doublePrecision, real } from "drizzle-orm/pg-core";
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
  meterType: text("meter_type"),
  isVirtual: boolean("is_virtual").default(false),
  dateClosed: timestamp("date_closed"),
  isActive: boolean("is_active").default(true),
  lastUpdate: timestamp("last_update").defaultNow(),
  code: text("code"),
  code2: text("code2"),
  hostSupplier: text("host_supplier"),
  billFrequency: text("bill_frequency"),
  annualQuantity: real("annual_quantity"),
  meterDigits: integer("meter_digits"),
  meterNumber: text("meter_number"),
  otherNumber: text("other_number"),
  subMeter: boolean("sub_meter").default(false),
  aggregateMeter: boolean("aggregate_meter").default(false),
  landlordBilled: boolean("landlord_billed").default(false),
  interruptible: boolean("interruptible").default(false),
  vatRate: real("vat_rate"),
  tariffCclRate: real("tariff_ccl_rate"),
  comments: text("comments"),
  units: text("units"),
  kva: real("kva"),
  voltage: text("voltage"),
  powerFactor: real("power_factor"),
  eac: real("eac"),
  profileMeter: boolean("profile_meter").default(false),
  profileFrequency: text("profile_frequency"),
  profileScaleFactor: real("profile_scale_factor"),
  profileKwhFactor: real("profile_kwh_factor"),
  profileCalorificValue: real("profile_calorific_value"),
  profileCorrectionFactor: real("profile_correction_factor"),
  profileCostRate: integer("profile_cost_rate"),
  profileMeterMax: integer("profile_meter_max"),
  profileThreshold1: real("profile_threshold_1"),
  profileThreshold2: real("profile_threshold_2"),
  meterOperator: text("meter_operator"),
  meterAssetManager: text("meter_asset_manager"),
  mhhsApplied: boolean("mhhs_applied").default(false),
  rotaDisconnectionAlphaId: text("rota_disconnection_alpha_id"),
  gasMeterSize: text("gas_meter_size"),
  nominatedSoq: real("nominated_soq"),
  soqPeak: real("soq_peak"),
  soqAlternative: real("soq_alternative"),
  soqMinimum: real("soq_minimum"),
  supplyHourlyQuantity: real("supply_hourly_quantity"),
  kwhFactor: real("kwh_factor"),
  meterSize: real("meter_size"),
  meterSize2: real("meter_size_2"),
  meterTypeCapacity: real("meter_type_capacity"),
  returnToSewer: real("return_to_sewer"),
  highwayDrainage: boolean("highway_drainage").default(false),
  surfaceWater: boolean("surface_water").default(false),
  sewerageSupplier: text("sewerage_supplier"),
  waterSupplier: text("water_supplier"),
  sewerageWholesaleTariff: text("sewerage_wholesale_tariff"),
  waterWholesaleTariff: text("water_wholesale_tariff"),
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
