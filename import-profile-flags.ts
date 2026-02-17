import { db } from "./server/db";
import { dataProfiles } from "./shared/schema";
import { parse } from "csv-parse/sync";
import { sql } from "drizzle-orm";
import fs from "fs";

const FLAG_COLS = [
  "Flag0030","Flag0100","Flag0130","Flag0200","Flag0230","Flag0300","Flag0330","Flag0400",
  "Flag0430","Flag0500","Flag0530","Flag0600","Flag0630","Flag0700","Flag0730","Flag0800",
  "Flag0830","Flag0900","Flag0930","Flag1000","Flag1030","Flag1100","Flag1130","Flag1200",
  "Flag1230","Flag1300","Flag1330","Flag1400","Flag1430","Flag1500","Flag1530","Flag1600",
  "Flag1630","Flag1700","Flag1730","Flag1800","Flag1830","Flag1900","Flag1930","Flag2000",
  "Flag2030","Flag2100","Flag2130","Flag2200","Flag2230","Flag2300","Flag2330","Flag2400"
];

const DB_FLAG_COLS = [
  "f0030","f0100","f0130","f0200","f0230","f0300","f0330","f0400",
  "f0430","f0500","f0530","f0600","f0630","f0700","f0730","f0800",
  "f0830","f0900","f0930","f1000","f1030","f1100","f1130","f1200",
  "f1230","f1300","f1330","f1400","f1430","f1500","f1530","f1600",
  "f1630","f1700","f1730","f1800","f1830","f1900","f1930","f2000",
  "f2030","f2100","f2130","f2200","f2230","f2300","f2330","f2400"
];

async function importFlags() {
  console.log("Step 1: Building old DataProfile ID -> (Point_Id, Date) mapping...");

  const profileCsv = fs.readFileSync("attached_assets/dbo.DataProfile_1771310515569.csv", "utf-8");
  const profileRows = parse(profileCsv, { columns: true, skip_empty_lines: true, bom: true });

  const oldIdToKey: Map<string, { pointId: number; dateStr: string }> = new Map();
  for (const row of profileRows) {
    const oldId = row["Id"]?.trim();
    const pointId = parseInt(row["Point_Id"]?.trim());
    const dateStr = row["Date"]?.trim()?.split(" ")[0];
    if (oldId && !isNaN(pointId) && dateStr) {
      oldIdToKey.set(oldId, { pointId, dateStr });
    }
  }
  console.log(`  Mapped ${oldIdToKey.size} old profile IDs`);

  console.log("Step 2: Loading new profile index from database...");

  const allProfiles = await db.select({
    id: dataProfiles.id,
    dataSetId: dataProfiles.dataSetId,
    date: dataProfiles.date
  }).from(dataProfiles);

  const keyToNewId: Map<string, number> = new Map();
  for (const p of allProfiles) {
    const dateKey = p.date.toISOString().split("T")[0];
    keyToNewId.set(`${p.dataSetId}|${dateKey}`, p.id);
  }
  console.log(`  Indexed ${keyToNewId.size} profiles`);

  console.log("Step 3: Reading and importing profile flags (starting from row 10501)...");

  const flagsCsv = fs.readFileSync("attached_assets/dbo.DataProfileFlags_1771310515568.csv", "utf-8");
  const flagRows = parse(flagsCsv, { columns: true, skip_empty_lines: true, bom: true });

  let matched = 0;
  let unmatched = 0;
  const BATCH_SIZE = 200;

  for (let i = 0; i < flagRows.length; i += BATCH_SIZE) {
    const batch = flagRows.slice(i, i + BATCH_SIZE);
    const updates: { newId: number; flags: number[] }[] = [];

    for (const row of batch) {
      const oldProfileId = row["DataProfile_Id"]?.trim();
      if (!oldProfileId) { unmatched++; continue; }

      const mapping = oldIdToKey.get(oldProfileId);
      if (!mapping) { unmatched++; continue; }

      const newId = keyToNewId.get(`${mapping.pointId}|${mapping.dateStr}`);
      if (newId === undefined) { unmatched++; continue; }

      const flags: number[] = [];
      for (let j = 0; j < FLAG_COLS.length; j++) {
        const val = row[FLAG_COLS[j]]?.trim();
        flags.push(val !== "" && val !== undefined ? parseInt(val) : 0);
      }

      updates.push({ newId, flags });
      matched++;
    }

    if (updates.length > 0) {
      const setClauses = DB_FLAG_COLS.map((col, idx) =>
        `${col} = v.f${idx}::integer`
      ).join(", ");

      const colDefs = DB_FLAG_COLS.map((_, idx) => `f${idx}`).join(", ");

      const values = updates.map(u =>
        `(${u.newId}, ${u.flags.join(", ")})`
      ).join(", ");

      const query = `
        UPDATE data_profiles AS dp SET ${setClauses}
        FROM (VALUES ${values}) AS v(id, ${colDefs})
        WHERE dp.id = v.id::integer
      `;

      await db.execute(sql.raw(query));
    }

    if (i % 5000 === 0) {
      console.log(`  ${i}/${flagRows.length} (${matched} matched, ${unmatched} unmatched)`);
    }
  }

  console.log(`\nDone! Matched: ${matched}, Unmatched: ${unmatched}`);
  process.exit(0);
}

importFlags().catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
});
