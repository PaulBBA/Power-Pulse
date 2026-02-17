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
  utility: text("utility"),
  address1: text("address_1"),
  address2: text("address_2"),
  town: text("town"),
  county: text("county"),
  postCode: text("post_code"),
  telephone: text("telephone"),
  fax: text("fax"),
  emergencyTelephone: text("emergency_telephone"),
  notes: text("notes"),
  code: text("code"),
  email1: text("email_1"),
  email2: text("email_2"),
  isActive: boolean("is_active").default(true),
});

// --- Core Entities ---

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"), // UPRN
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
  mpanCoreMprn2: text("mpan_core_mprn_2"),
  mpanCoreMprn3: text("mpan_core_mprn_3"),
  mpanCoreMprn4: text("mpan_core_mprn_4"),
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

// --- Contracts ---

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  dataSetId: integer("data_set_id").references(() => dataSets.id).notNull(),
  groupId: integer("group_id").references(() => groups.id),
  supplier: text("supplier"),
  referenceNumber: text("reference_number"),
  type: text("type"),
  dateStart: timestamp("date_start"),
  dateEnd: timestamp("date_end"),
  kva: real("kva"),
  maximumInputCapacity: real("maximum_input_capacity"),
  climateChangeLevy: real("climate_change_levy"),
  fossilFuelLevy: real("fossil_fuel_levy"),
  rateUnits: real("rate_units"),
  rateUnits1Split: real("rate_units_1_split"),
  rateFixed: real("rate_fixed"),
  rateFixedPerDay: boolean("rate_fixed_per_day").default(false),
  rateKva: real("rate_kva"),
  rateKva2: real("rate_kva_2"),
  rateKvaPerDay: boolean("rate_kva_per_day").default(false),
  rateKvaSplit: real("rate_kva_split"),
  rateMd: real("rate_md"),
  rateMd2: real("rate_md_2"),
  rateMdSplit: real("rate_md_split"),
  rateTransportation: real("rate_transportation"),
  rateTransportationPerKwh: boolean("rate_transportation_per_kwh").default(false),
  rateMetering: real("rate_metering"),
  rateMeteringPerDay: boolean("rate_metering_per_day").default(false),
  rateSettlements: real("rate_settlements"),
  rateSettlementsPerDay: boolean("rate_settlements_per_day").default(false),
  rateTriad: real("rate_triad"),
  rateGreen: real("rate_green"),
  rateGreenPercent: real("rate_green_percent"),
  rateFit: real("rate_fit"),
  rateRoc: real("rate_roc"),
  kwhSplit1: real("kwh_split_1"),
  kwhSplit1CostRate: real("kwh_split_1_cost_rate"),
  kwhSplit2: real("kwh_split_2"),
  kwhSplit2CostRate: real("kwh_split_2_cost_rate"),
  kwhSplit3: real("kwh_split_3"),
  kwhSplit3CostRate: real("kwh_split_3_cost_rate"),
  kwhSplit4: real("kwh_split_4"),
  kwhSplit4CostRate: real("kwh_split_4_cost_rate"),
  kwhSplit5: real("kwh_split_5"),
  kwhSplit5CostRate: real("kwh_split_5_cost_rate"),
  kwhSplit6: real("kwh_split_6"),
  kwhSplit6CostRate: real("kwh_split_6_cost_rate"),
  reactivePower1Rate: real("reactive_power_1_rate"),
  reactivePower1Split: real("reactive_power_1_split"),
  reactivePower2Rate: real("reactive_power_2_rate"),
  reactivePower2Split: real("reactive_power_2_split"),
  kvarhDefault: real("kvarh_default"),
  vat1Rate: real("vat_1_rate"),
  vat2Rate: real("vat_2_rate"),
  vatSplit: real("vat_split"),
  lossAdjustment: boolean("loss_adjustment").default(false),
  tuos: boolean("tuos").default(false),
  useOfSystem: boolean("use_of_system").default(false),
  useDistributorCapacity: boolean("use_distributor_capacity").default(false),
  useDistributorReactivePower: boolean("use_distributor_reactive_power").default(false),
  bankHolidays: integer("bank_holidays"),
  billingPoint: integer("billing_point"),
  clock: boolean("clock").default(false),
  batch: integer("batch"),
});

export const chargeTypes = pgTable("config_charge_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const contractCharges = pgTable("contract_charges", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  chargeTypeId: integer("charge_type_id").references(() => chargeTypes.id),
  rate: real("rate"),
  tolerance: real("tolerance"),
  toleranceRate: real("tolerance_rate"),
  toleranceUnits: real("tolerance_units"),
});

export const contractData = pgTable("contract_data", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  type: text("type"),
  costRate: real("cost_rate"),
  timeStart: text("time_start"),
  timeFinish: text("time_finish"),
  meter: integer("meter"),
  description: text("description"),
  sunday: boolean("sunday").default(true),
  monday: boolean("monday").default(true),
  tuesday: boolean("tuesday").default(true),
  wednesday: boolean("wednesday").default(true),
  thursday: boolean("thursday").default(true),
  friday: boolean("friday").default(true),
  saturday: boolean("saturday").default(true),
  january: boolean("january").default(true),
  february: boolean("february").default(true),
  march: boolean("march").default(true),
  april: boolean("april").default(true),
  may: boolean("may").default(true),
  june: boolean("june").default(true),
  july: boolean("july").default(true),
  august: boolean("august").default(true),
  september: boolean("september").default(true),
  october: boolean("october").default(true),
  november: boolean("november").default(true),
  december: boolean("december").default(true),
  validFrom: timestamp("valid_from"),
});

export const chargeItems = pgTable("charge_items", {
  id: serial("id").primaryKey(),
  dataSetId: integer("data_set_id").references(() => dataSets.id).notNull(),
  dataRecordId: integer("data_record_id"),
  chargeTypeId: integer("charge_type_id").references(() => chargeTypes.id),
  cost: real("cost"),
  units: real("units"),
  rate: real("rate"),
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
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true });
export const insertContractChargeSchema = createInsertSchema(contractCharges).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

export const insertTodoSchema = createInsertSchema(todoItems).omit({ id: true, createdAt: true });

// --- Types ---

export type Site = typeof sites.$inferSelect;
export type DataSet = typeof dataSets.$inferSelect;
export type Invoice = typeof dataInvoices.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type ContractCharge = typeof contractCharges.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type InsertContractCharge = z.infer<typeof insertContractChargeSchema>;
export type ChargeType = typeof chargeTypes.$inferSelect;
export type TodoItem = typeof todoItems.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;
