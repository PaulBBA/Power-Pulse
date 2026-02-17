import { readFileSync } from 'fs';
import pg from 'pg';
import { parse } from 'csv-parse/sync';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function parseCSV(filePath: string): Record<string, string>[] {
  const content = readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
}

function toFloat(v: string | undefined): number | null {
  if (!v || v === 'NULL' || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function toInt(v: string | undefined): number | null {
  if (!v || v === 'NULL' || v === '') return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function toText(v: string | undefined): string | null {
  if (!v || v === 'NULL' || v === '') return null;
  return v;
}

function toTimestamp(v: string | undefined): string | null {
  if (!v || v === 'NULL' || v === '') return null;
  return v;
}

async function importElectricity() {
  console.log('Importing electricity records...');
  await pool.query('DELETE FROM data_records WHERE utility_type = $1', ['electricity']);
  const rows = parseCSV('attached_assets/dbo.DataElectricity_1771310515570.csv');
  const validRows = rows.filter(r => r.Point_Id && r.Point_Id !== 'NULL' && r.Date && r.Date !== 'NULL');
  console.log(`  Parsed ${rows.length} rows, ${validRows.length} valid`);

  const BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < validRows.length; i += BATCH) {
    const batch = validRows.slice(i, i + BATCH);
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIdx = 1;

    for (const r of batch) {
      const params = [
        toInt(r.Point_Id), 'electricity', toTimestamp(r.Date), toTimestamp(r.Date_Previous),
        toText(r.Direct), toText(r.Estimate), toFloat(r.Units), toFloat(r.Cost),
        toInt(r.Batch), toFloat(r.Standing_Charge), toFloat(r.Other_Charge), toFloat(r.VAT),
        toFloat(r.Climate_Change_Levy), toFloat(r.Climate_Change_Levy_Rate),
        toText(r.Invoice_Number), toText(r.SupplierName), toText(r.Number),
        toInt(r.Locked), toInt(r.Passed_To_Accounts), toInt(r.Status),
        toTimestamp(r.Date_Paid), toTimestamp(r.Date_TaxPoint),
        toInt(r.Exclude_From_Reports), toTimestamp(r.Last_Update), toText(r.Last_User),
        toText(r.Note),
        toFloat(r.M1_Present), toFloat(r.M1_Previous), toFloat(r.M1_Factor), toFloat(r.M1_Units), toFloat(r.M1_Cost_Rate), toFloat(r.M1_Cost),
        toFloat(r.M2_Present), toFloat(r.M2_Previous), toFloat(r.M2_Factor), toFloat(r.M2_Units), toFloat(r.M2_Cost_Rate), toFloat(r.M2_Cost),
        toFloat(r.M3_Present), toFloat(r.M3_Previous), toFloat(r.M3_Factor), toFloat(r.M3_Units), toFloat(r.M3_Cost_Rate), toFloat(r.M3_Cost),
        toFloat(r.M4_Present), toFloat(r.M4_Previous), toFloat(r.M4_Factor), toFloat(r.M4_Units), toFloat(r.M4_Cost_Rate), toFloat(r.M4_Cost),
        toFloat(r.M5_Present), toFloat(r.M5_Previous), toFloat(r.M5_Factor), toFloat(r.M5_Units), toFloat(r.M5_Cost_Rate), toFloat(r.M5_Cost),
        toFloat(r.M6_Present), toFloat(r.M6_Previous), toFloat(r.M6_Factor), toFloat(r.M6_Units), toFloat(r.M6_Cost_Rate), toFloat(r.M6_Cost),
        toFloat(r.M7_Present), toFloat(r.M7_Previous), toFloat(r.M7_Factor), toFloat(r.M7_Units), toFloat(r.M7_Cost_Rate), toFloat(r.M7_Cost),
        toFloat(r.M8_Present), toFloat(r.M8_Previous), toFloat(r.M8_Factor), toFloat(r.M8_Units), toFloat(r.M8_Cost_Rate), toFloat(r.M8_Cost),
        toFloat(r.M1_Split1), toFloat(r.M1_Split1_Cost_Rate), toFloat(r.M1_Split1_Cost),
        toFloat(r.M1_Split2), toFloat(r.M1_Split2_Cost_Rate), toFloat(r.M1_Split2_Cost),
        toFloat(r.M1_Split3), toFloat(r.M1_Split3_Cost_Rate), toFloat(r.M1_Split3_Cost),
        toFloat(r.M1_Split4), toFloat(r.M1_Split4_Cost_Rate), toFloat(r.M1_Split4_Cost),
        toFloat(r.M1_Split5), toFloat(r.M1_Split5_Cost_Rate), toFloat(r.M1_Split5_Cost),
        toFloat(r.M1_Split6), toFloat(r.M1_Split6_Cost_Rate), toFloat(r.M1_Split6_Cost),
        toFloat(r.VAT_Split), toFloat(r.VAT_1_Percent), toFloat(r.VAT_1),
        toFloat(r.VAT_2_Percent), toFloat(r.VAT_2),
        toFloat(r.Standing_Charge_Rate), toFloat(r.DeMinimis), toFloat(r.DeMinimisThreshold),
        toFloat(r.Non_Vatable_Charges), toFloat(r.Flexible_Purchasing), toFloat(r.Misc_Cost),
        toFloat(r.kV), toFloat(r.kV_Cost_Rate), toFloat(r.kV_Cost),
        toFloat(r.kVA), toFloat(r.kVA_Cost_Rate), toFloat(r.kVA_Cost),
        toFloat(r.kV_Factor), toFloat(r.kVA_Factor),
        toFloat(r.kV_Split1), toFloat(r.kV_Split1_Cost_Rate), toFloat(r.kV_Split1_Cost),
        toFloat(r.kVA_Split1), toFloat(r.kVA_Split1_Cost_Rate), toFloat(r.kVA_Split1_Cost),
        toFloat(r.Fuel_Adjustment_Cost), toFloat(r.Fuel_Adjustment_Percent),
        toFloat(r.Power_Factor), toFloat(r.Reactive_Power),
        toFloat(r.Reactive_Power_Cost_Rate), toFloat(r.Reactive_Power_Cost),
        toFloat(r.Reactive_Power_Factor), toFloat(r.Reactive_Power_2_Factor),
        toFloat(r.Reactive_Power_2_Cost), toFloat(r.Reactive_Power_2_Cost_Rate),
        toFloat(r.Green_Charge), toFloat(r.Green_Charge_Rate), toFloat(r.Green_Percent),
        toFloat(r.Settlements), toFloat(r.Settlements_Rate),
        toFloat(r.TUOS), toFloat(r.DUOS), toFloat(r.TRIAD),
        toFloat(r.ROC), toFloat(r.ROC_Rate),
        toFloat(r.Feed_In_Cost), toFloat(r.Feed_In_Cost_Rate),
        toFloat(r.DUOS_Green_Units), toFloat(r.DUOS_Green_Cost_Rate), toFloat(r.DUOS_Green_Cost),
        toFloat(r.DUOS_Amber_Units), toFloat(r.DUOS_Amber_Cost_Rate), toFloat(r.DUOS_Amber_Cost),
        toFloat(r.DUOS_Red_Units), toFloat(r.DUOS_Red_Cost_Rate), toFloat(r.DUOS_Red_Cost),
      ];
      const ph = params.map(() => `$${paramIdx++}`).join(',');
      placeholders.push(`(${ph})`);
      values.push(...params);
    }

    const sql = `INSERT INTO data_records (
      data_set_id, utility_type, date, previous_date,
      direct, estimate, units, cost,
      batch, standing_charge, other_charge, vat,
      ccl, ccl_rate,
      invoice_number, supplier_name, number,
      locked, passed_to_accounts, status,
      date_paid, date_tax_point,
      exclude_from_reports, last_update, last_user,
      note,
      m1_present, m1_previous, m1_factor, m1_units, m1_cost_rate, m1_cost,
      m2_present, m2_previous, m2_factor, m2_units, m2_cost_rate, m2_cost,
      m3_present, m3_previous, m3_factor, m3_units, m3_cost_rate, m3_cost,
      m4_present, m4_previous, m4_factor, m4_units, m4_cost_rate, m4_cost,
      m5_present, m5_previous, m5_factor, m5_units, m5_cost_rate, m5_cost,
      m6_present, m6_previous, m6_factor, m6_units, m6_cost_rate, m6_cost,
      m7_present, m7_previous, m7_factor, m7_units, m7_cost_rate, m7_cost,
      m8_present, m8_previous, m8_factor, m8_units, m8_cost_rate, m8_cost,
      m1_split1, m1_split1_cost_rate, m1_split1_cost,
      m1_split2, m1_split2_cost_rate, m1_split2_cost,
      m1_split3, m1_split3_cost_rate, m1_split3_cost,
      m1_split4, m1_split4_cost_rate, m1_split4_cost,
      m1_split5, m1_split5_cost_rate, m1_split5_cost,
      m1_split6, m1_split6_cost_rate, m1_split6_cost,
      vat_split, vat_1_percent, vat_1,
      vat_2_percent, vat_2,
      standing_charge_rate, de_minimis, de_minimis_threshold,
      non_vatable_charges, flexible_purchasing, misc_cost,
      kv, kv_cost_rate, kv_cost,
      kva, kva_cost_rate, kva_cost,
      kv_factor, kva_factor,
      kv_split1, kv_split1_cost_rate, kv_split1_cost,
      kva_split1, kva_split1_cost_rate, kva_split1_cost,
      fuel_adjustment_cost, fuel_adjustment_percent,
      power_factor, reactive_power,
      reactive_power_cost_rate, reactive_power_cost,
      reactive_power_factor, reactive_power_2_factor,
      reactive_power_2_cost, reactive_power_2_cost_rate,
      green_charge, green_charge_rate, green_percent,
      settlements, settlements_rate,
      tuos, duos, triad,
      roc, roc_rate,
      feed_in_cost, feed_in_cost_rate,
      duos_green_units, duos_green_cost_rate, duos_green_cost,
      duos_amber_units, duos_amber_cost_rate, duos_amber_cost,
      duos_red_units, duos_red_cost_rate, duos_red_cost
    ) VALUES ${placeholders.join(',')}`;

    await pool.query(sql, values);
    inserted += batch.length;
    if (inserted % 5000 === 0 || inserted === validRows.length) {
      console.log(`  Inserted ${inserted}/${validRows.length}`);
    }
  }
  console.log(`  Electricity done: ${inserted} records`);
}

async function importGasGeneral() {
  console.log('Importing gas/general records...');
  await pool.query('DELETE FROM data_records WHERE utility_type = $1', ['gas']);
  const rows = parseCSV('attached_assets/dbo.DataGeneral_1771310515570.csv');
  const validRows = rows.filter(r => r.Point_Id && r.Point_Id !== 'NULL' && r.Date && r.Date !== 'NULL');
  console.log(`  Parsed ${rows.length} rows, ${validRows.length} valid`);

  const BATCH = 100;
  let inserted = 0;

  for (let i = 0; i < validRows.length; i += BATCH) {
    const batch = validRows.slice(i, i + BATCH);
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIdx = 1;

    for (const r of batch) {
      const params = [
        toInt(r.Point_Id), 'gas', toTimestamp(r.Date), toTimestamp(r.Date_Previous),
        toText(r.Direct), toText(r.Estimate), toFloat(r.Units), toFloat(r.Cost),
        toInt(r.Batch), toFloat(r.Standing_Charge), toFloat(r.Other_Charge), toFloat(r.VAT),
        toFloat(r.Climate_Change_Levy), toFloat(r.Climate_Change_Levy_Rate),
        toText(r.Invoice_Number), toText(r.SupplierName), toText(r.Number),
        toInt(r.Locked), toInt(r.Passed_To_Accounts), toInt(r.Status),
        toTimestamp(r.Date_Paid), toTimestamp(r.Date_TaxPoint),
        toInt(r.Exclude_From_Reports), toTimestamp(r.Last_Update), toText(r.Last_User),
        toText(r.Note),
        toFloat(r.M1_Present), toFloat(r.M1_Previous), toFloat(r.M1_Factor_1), toFloat(r.M1_Units), toFloat(r.M1_Cost_Rate), toFloat(r.M1_Cost),
        toFloat(r.M2_Present), toFloat(r.M2_Previous), toFloat(r.M2_Factor_1), toFloat(r.M2_Units), toFloat(r.M2_Cost_Rate), toFloat(r.M2_Cost),
        toFloat(r.M3_Present), toFloat(r.M3_Previous), toFloat(r.M3_Factor_1), toFloat(r.M3_Units), toFloat(r.M3_Cost_Rate), toFloat(r.M3_Cost),
        toFloat(r.M4_Present), toFloat(r.M4_Previous), toFloat(r.M4_Factor_1), toFloat(r.M4_Units), toFloat(r.M4_Cost_Rate), toFloat(r.M4_Cost),
        toFloat(r.M1_Split1), toFloat(r.M1_Split1_Cost_Rate), toFloat(r.M1_Split1_Cost),
        toFloat(r.M1_Split2), toFloat(r.M1_Split2_Cost_Rate), toFloat(r.M1_Split2_Cost),
        toFloat(r.M1_Split3), toFloat(r.M1_Split3_Cost_Rate), toFloat(r.M1_Split3_Cost),
        toFloat(r.VAT_Split), toFloat(r.VAT_1_Percent), toFloat(r.VAT_1),
        toFloat(r.VAT_2_Percent), toFloat(r.VAT_2),
        toFloat(r.Standing_Charge_Rate), toFloat(r.DeMinimis), toFloat(r.DeMinimisThreshold),
        toFloat(r.Non_Vatable_Charges), toFloat(r.Flexible_Purchasing), toFloat(r.Misc_Cost),
        toFloat(r.kWh_Factor), toFloat(r.Transportation), toFloat(r.Metering),
      ];
      const ph = params.map(() => `$${paramIdx++}`).join(',');
      placeholders.push(`(${ph})`);
      values.push(...params);
    }

    const sql = `INSERT INTO data_records (
      data_set_id, utility_type, date, previous_date,
      direct, estimate, units, cost,
      batch, standing_charge, other_charge, vat,
      ccl, ccl_rate,
      invoice_number, supplier_name, number,
      locked, passed_to_accounts, status,
      date_paid, date_tax_point,
      exclude_from_reports, last_update, last_user,
      note,
      m1_present, m1_previous, m1_factor, m1_units, m1_cost_rate, m1_cost,
      m2_present, m2_previous, m2_factor, m2_units, m2_cost_rate, m2_cost,
      m3_present, m3_previous, m3_factor, m3_units, m3_cost_rate, m3_cost,
      m4_present, m4_previous, m4_factor, m4_units, m4_cost_rate, m4_cost,
      m1_split1, m1_split1_cost_rate, m1_split1_cost,
      m1_split2, m1_split2_cost_rate, m1_split2_cost,
      m1_split3, m1_split3_cost_rate, m1_split3_cost,
      vat_split, vat_1_percent, vat_1,
      vat_2_percent, vat_2,
      standing_charge_rate, de_minimis, de_minimis_threshold,
      non_vatable_charges, flexible_purchasing, misc_cost,
      kwh_factor, transportation, metering
    ) VALUES ${placeholders.join(',')}`;

    await pool.query(sql, values);
    inserted += batch.length;
    if (inserted % 2000 === 0 || inserted === validRows.length) {
      console.log(`  Inserted ${inserted}/${validRows.length}`);
    }
  }
  console.log(`  Gas done: ${inserted} records`);
}

async function importWater() {
  console.log('Importing water records...');
  await pool.query('DELETE FROM data_records WHERE utility_type = $1', ['water']);
  const rows = parseCSV('attached_assets/dbo.DataWater_1771310515567.csv');
  const validRows = rows.filter(r => r.Point_Id && r.Point_Id !== 'NULL' && r.Date && r.Date !== 'NULL');
  console.log(`  Parsed ${rows.length} rows, ${validRows.length} valid`);

  const BATCH = 100;
  let inserted = 0;

  for (let i = 0; i < validRows.length; i += BATCH) {
    const batch = validRows.slice(i, i + BATCH);
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIdx = 1;

    for (const r of batch) {
      const params = [
        toInt(r.Point_Id), 'water', toTimestamp(r.Date), toTimestamp(r.Date_Previous),
        toText(r.Direct), toText(r.Estimate), toFloat(r.Units), toFloat(r.Cost),
        toInt(r.Batch), toFloat(r.Standing_Charge), toFloat(r.Other_Charge), toFloat(r.VAT),
        toFloat(r.Climate_Change_Levy), toFloat(r.Climate_Change_Levy_Rate),
        toText(r.Invoice_Number), toText(r.SupplierName), toText(r.Number),
        toInt(r.Locked), toInt(r.Passed_To_Accounts), toInt(r.Status),
        toTimestamp(r.Date_Paid), toTimestamp(r.Date_TaxPoint),
        toInt(r.Exclude_From_Reports), toTimestamp(r.Last_Update), toText(r.Last_User),
        toText(r.Note),
        toFloat(r.M1_Present), toFloat(r.M1_Previous), toFloat(r.M1_Factor), toFloat(r.M1_Units),
        toFloat(r.M2_Present), toFloat(r.M2_Previous), toFloat(r.M2_Factor), toFloat(r.M2_Units),
        toFloat(r.M3_Present), toFloat(r.M3_Previous), toFloat(r.M3_Factor), toFloat(r.M3_Units),
        toFloat(r.M4_Present), toFloat(r.M4_Previous), toFloat(r.M4_Factor), toFloat(r.M4_Units),
        toFloat(r.Standing_Charge_2), toFloat(r.Standing_Charge_Rate), toFloat(r.Standing_Charge_Rate_2),
        toFloat(r.Water_Factor), toFloat(r.Water_Units), toFloat(r.Water_Cost_Rate), toFloat(r.Water_Cost),
        toFloat(r.Sewerage_Factor), toFloat(r.Sewerage_Units), toFloat(r.Sewerage_Cost_Rate), toFloat(r.Sewerage_Cost),
        toFloat(r.Rates), toFloat(r.Rates_Cost_Rate), toFloat(r.Rates_Cost),
        toFloat(r.Trade_Effluent_Cost), toFloat(r.Surface_Water_Cost),
        toFloat(r.Environmental_Cost), toFloat(r.Highway_Cost), toFloat(r.Volume_Cost),
        toFloat(r.Tariff_Cost),
        toFloat(r.Non_Vatable_Charges),
      ];
      const ph = params.map(() => `$${paramIdx++}`).join(',');
      placeholders.push(`(${ph})`);
      values.push(...params);
    }

    const sql = `INSERT INTO data_records (
      data_set_id, utility_type, date, previous_date,
      direct, estimate, units, cost,
      batch, standing_charge, other_charge, vat,
      ccl, ccl_rate,
      invoice_number, supplier_name, number,
      locked, passed_to_accounts, status,
      date_paid, date_tax_point,
      exclude_from_reports, last_update, last_user,
      note,
      m1_present, m1_previous, m1_factor, m1_units,
      m2_present, m2_previous, m2_factor, m2_units,
      m3_present, m3_previous, m3_factor, m3_units,
      m4_present, m4_previous, m4_factor, m4_units,
      standing_charge_2, standing_charge_rate, standing_charge_rate_2,
      water_factor, water_units, water_cost_rate, water_cost,
      sewerage_factor, sewerage_units, sewerage_cost_rate, sewerage_cost,
      rates, rates_cost_rate, rates_cost,
      trade_effluent_cost, surface_water_cost,
      environmental_cost, highway_cost, volume_cost,
      tariff_cost,
      non_vatable_charges
    ) VALUES ${placeholders.join(',')}`;

    await pool.query(sql, values);
    inserted += batch.length;
    if (inserted % 500 === 0 || inserted === validRows.length) {
      console.log(`  Inserted ${inserted}/${validRows.length}`);
    }
  }
  console.log(`  Water done: ${inserted} records`);
}

async function importProfiles() {
  console.log('Importing profile records...');
  await pool.query('DELETE FROM data_profiles');
  const rows = parseCSV('attached_assets/dbo.DataProfile_1771310515569.csv');
  const validRows = rows.filter(r => r.Point_Id && r.Point_Id !== 'NULL' && r.Date && r.Date !== 'NULL');
  console.log(`  Parsed ${rows.length} rows, ${validRows.length} valid`);

  const BATCH = 300;
  let inserted = 0;

  for (let i = 0; i < validRows.length; i += BATCH) {
    const batch = validRows.slice(i, i + BATCH);
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIdx = 1;

    for (const r of batch) {
      const params = [
        toInt(r.Point_Id), toInt(r.Type), toTimestamp(r.Date), toFloat(r.TotalUnits),
        toFloat(r['00:30']), toFloat(r['01:00']), toFloat(r['01:30']), toFloat(r['02:00']),
        toFloat(r['02:30']), toFloat(r['03:00']), toFloat(r['03:30']), toFloat(r['04:00']),
        toFloat(r['04:30']), toFloat(r['05:00']), toFloat(r['05:30']), toFloat(r['06:00']),
        toFloat(r['06:30']), toFloat(r['07:00']), toFloat(r['07:30']), toFloat(r['08:00']),
        toFloat(r['08:30']), toFloat(r['09:00']), toFloat(r['09:30']), toFloat(r['10:00']),
        toFloat(r['10:30']), toFloat(r['11:00']), toFloat(r['11:30']), toFloat(r['12:00']),
        toFloat(r['12:30']), toFloat(r['13:00']), toFloat(r['13:30']), toFloat(r['14:00']),
        toFloat(r['14:30']), toFloat(r['15:00']), toFloat(r['15:30']), toFloat(r['16:00']),
        toFloat(r['16:30']), toFloat(r['17:00']), toFloat(r['17:30']), toFloat(r['18:00']),
        toFloat(r['18:30']), toFloat(r['19:00']), toFloat(r['19:30']), toFloat(r['20:00']),
        toFloat(r['20:30']), toFloat(r['21:00']), toFloat(r['21:30']), toFloat(r['22:00']),
        toFloat(r['22:30']), toFloat(r['23:00']), toFloat(r['23:30']), toFloat(r['24:00']),
      ];
      const ph = params.map(() => `$${paramIdx++}`).join(',');
      placeholders.push(`(${ph})`);
      values.push(...params);
    }

    const sql = `INSERT INTO data_profiles (
      data_set_id, type, date, day_total,
      i0030, i0100, i0130, i0200,
      i0230, i0300, i0330, i0400,
      i0430, i0500, i0530, i0600,
      i0630, i0700, i0730, i0800,
      i0830, i0900, i0930, i1000,
      i1030, i1100, i1130, i1200,
      i1230, i1300, i1330, i1400,
      i1430, i1500, i1530, i1600,
      i1630, i1700, i1730, i1800,
      i1830, i1900, i1930, i2000,
      i2030, i2100, i2130, i2200,
      i2230, i2300, i2330, i2400
    ) VALUES ${placeholders.join(',')}`;

    await pool.query(sql, values);
    inserted += batch.length;
    if (inserted % 10000 === 0 || inserted === validRows.length) {
      console.log(`  Inserted ${inserted}/${validRows.length}`);
    }
  }
  console.log(`  Profiles done: ${inserted} records`);
}

async function main() {
  try {
    console.log('Starting data import...');
    await importElectricity();
    await importGasGeneral();
    await importWater();
    await importProfiles();

    const res1 = await pool.query("SELECT utility_type, COUNT(*) as cnt FROM data_records GROUP BY utility_type ORDER BY utility_type");
    console.log('\nData records by type:', res1.rows);
    const res2 = await pool.query("SELECT COUNT(*) as cnt FROM data_profiles");
    console.log('Profile records:', res2.rows[0].cnt);

    console.log('\nImport complete!');
  } catch (err) {
    console.error('Import error:', err);
  } finally {
    await pool.end();
  }
}

main();
