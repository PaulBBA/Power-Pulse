import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { users, dataSets, dataRecords, dataProfiles, importLogs, sftpConfigs, sftpDownloadLogs } from "@shared/schema.js";
import { eq, and, sql, desc } from "drizzle-orm";
import multer from "multer";
import SftpClient from "ssh2-sftp-client";
import { parseMMFile, mmInvoiceToDataRecord } from "./mm-parser.js";
import { parseCrownEDI, crownEDIToDataRecord } from "./crown-edi-parser.js";
import { parseNpowerPDF, npowerInvoiceToDataRecord } from "./npower-pdf-parser.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const INTERVAL_KEYS = [
  "i0030","i0100","i0130","i0200","i0230","i0300","i0330","i0400",
  "i0430","i0500","i0530","i0600","i0630","i0700","i0730","i0800",
  "i0830","i0900","i0930","i1000","i1030","i1100","i1130","i1200",
  "i1230","i1300","i1330","i1400","i1430","i1500","i1530","i1600",
  "i1630","i1700","i1730","i1800","i1830","i1900","i1930","i2000",
  "i2030","i2100","i2130","i2200","i2230","i2300","i2330","i2400"
];

const FLAG_KEYS = [
  "f0030","f0100","f0130","f0200","f0230","f0300","f0330","f0400",
  "f0430","f0500","f0530","f0600","f0630","f0700","f0730","f0800",
  "f0830","f0900","f0930","f1000","f1030","f1100","f1130","f1200",
  "f1230","f1300","f1330","f1400","f1430","f1500","f1530","f1600",
  "f1630","f1700","f1730","f1800","f1830","f1900","f1930","f2000",
  "f2030","f2100","f2130","f2200","f2230","f2300","f2330","f2400"
];

const FLAG_LETTER_MAP: Record<string, number> = {
  "A": 1, "E": 2, "S": 3, "C": 4, "N": 0, "F": 5
};

function parseFormat18Row(fields: string[]) {
  const mpan = fields[0]?.trim();
  const meterSerial = fields[1]?.trim();
  const dataType = fields[2]?.trim();
  const dateStr = fields[3]?.trim();

  const dateParts = dateStr?.split("/");
  let date: Date | null = null;
  if (dateParts && dateParts.length === 3) {
    date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T00:00:00.000Z`);
  }

  const intervals: Record<string, number | null> = {};
  const flags: Record<string, number | null> = {};
  let dayTotal = 0;

  for (let i = 0; i < 48; i++) {
    const valIdx = 4 + (i * 2);
    const flagIdx = 5 + (i * 2);
    const val = fields[valIdx]?.trim();
    const flag = fields[flagIdx]?.trim();

    const numVal = val ? parseFloat(val) : null;
    intervals[INTERVAL_KEYS[i]] = numVal;
    flags[FLAG_KEYS[i]] = flag ? (FLAG_LETTER_MAP[flag.toUpperCase()] ?? null) : null;
    if (numVal !== null && !isNaN(numVal)) dayTotal += numVal;
  }

  return { mpan, meterSerial, dataType, date, intervals, flags, dayTotal };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/groups", async (_req, res) => {
    const groups = await storage.getGroups();
    res.json(groups);
  });

  app.get("/api/groups/hierarchy", async (_req, res) => {
    try {
      const hierarchy = await storage.getGroupsHierarchy();
      res.json(hierarchy);
    } catch (error: any) {
      console.error("Error fetching hierarchy:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const group = await storage.createGroup(req.body);
      res.status(201).json(group);
    } catch (error: any) {
      console.error("Error creating group:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/site-groups", async (req, res) => {
    try {
      const { siteId, groupId } = req.body;
      await storage.assignSiteToGroup(siteId, groupId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Error assigning site to group:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/site-groups", async (req, res) => {
    try {
      const { siteId, groupId } = req.body;
      await storage.removeSiteFromGroup(siteId, groupId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Error removing site from group:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/utilities", async (_req, res) => {
    const utils = await storage.getUtilities();
    res.json(utils);
  });

  app.get("/api/sites", async (_req, res) => {
    const sites = await storage.getSites();
    res.json(sites);
  });

  app.patch("/api/sites/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const site = await storage.updateSite(id, req.body);
      res.json(site);
    } catch (error: any) {
      console.error("Error updating site:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/sites", async (req, res) => {
    try {
      const site = await storage.createSite(req.body);
      res.status(200).json(site);
    } catch (error: any) {
      console.error("Error creating site:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", async (_req, res) => {
    try {
      const allUsers = await db.select().from(users);
      // Don't send passwords
      const safeUsers = allUsers.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    try {
      const newUser = await storage.createUser(req.body);
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: error.message || "Failed to create user" });
    }
  });

  app.patch("/api/data-sets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataSet = await storage.updateDataSet(id, req.body);
      res.json(dataSet);
    } catch (error: any) {
      console.error("Error updating data set:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/data-sets", async (req, res) => {
    try {
      const dataSet = await storage.createDataSet(req.body);
      res.status(200).json(dataSet);
    } catch (error: any) {
      console.error("Error creating data set:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/data-sets", async (_req, res) => {
    const dataSets = await storage.getDataSets();
    res.json(dataSets);
  });

  app.get("/api/data-sets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataSet = await storage.getDataSet(id);
      if (!dataSet) return res.status(404).json({ message: "Data set not found" });

      const site = await storage.getSite(dataSet.siteId);
      const allUtilities = await storage.getUtilities();
      const utility = allUtilities.find((u: any) => u.id === dataSet.utilityTypeId);

      res.json({ ...dataSet, site, utility });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/data-sets/:id/records", async (req, res) => {
    const records = await storage.getDataRecords(parseInt(req.params.id));
    res.json(records);
  });

  app.get("/api/data-sets/:id/profiles", async (req, res) => {
    try {
      const dataSetId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const profiles = await db.select({
        id: dataProfiles.id,
        dataSetId: dataProfiles.dataSetId,
        type: dataProfiles.type,
        date: dataProfiles.date,
        dayTotal: dataProfiles.dayTotal,
      }).from(dataProfiles)
        .where(eq(dataProfiles.dataSetId, dataSetId))
        .orderBy(sql`${dataProfiles.date} DESC`)
        .limit(limit)
        .offset(offset);

      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(dataProfiles)
        .where(eq(dataProfiles.dataSetId, dataSetId));

      res.json({ profiles, total: Number(countResult.count) });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- Contracts ---

  app.get("/api/contracts", async (_req, res) => {
    try {
      const allContracts = await storage.getContracts();
      res.json(allContracts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/data-sets/:id/contracts", async (req, res) => {
    try {
      const dataSetId = parseInt(req.params.id);
      const dataSetContracts = await storage.getContractsByDataSet(dataSetId);
      const contractIds = dataSetContracts.map(c => c.id);
      const allContractData = await storage.getContractDataByContractIds(contractIds);
      const dataByContract = new Map<number, any[]>();
      for (const cd of allContractData) {
        if (!dataByContract.has(cd.contractId)) dataByContract.set(cd.contractId, []);
        dataByContract.get(cd.contractId)!.push(cd);
      }
      const enriched = dataSetContracts.map(c => ({
        ...c,
        contractData: dataByContract.get(c.id) || [],
      }));
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      res.json(contract);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contracts", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.dateStart) data.dateStart = new Date(data.dateStart);
      if (data.dateEnd) data.dateEnd = new Date(data.dateEnd);
      const contract = await storage.createContract(data);
      res.status(201).json(contract);
    } catch (error: any) {
      console.error("Error creating contract:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/contracts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = { ...req.body };
      if (data.dateStart) data.dateStart = new Date(data.dateStart);
      if (data.dateEnd) data.dateEnd = new Date(data.dateEnd);
      const contract = await storage.updateContract(id, data);
      res.json(contract);
    } catch (error: any) {
      console.error("Error updating contract:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/contracts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContract(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting contract:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // --- Contract Data (time-of-use rates) ---

  app.get("/api/contracts/:id/data", async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const data = await storage.getContractData(contractId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- Contract Charges ---

  app.get("/api/contracts/:id/charges", async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const charges = await storage.getContractCharges(contractId);
      res.json(charges);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contract-charges", async (req, res) => {
    try {
      const charge = await storage.createContractCharge(req.body);
      res.status(201).json(charge);
    } catch (error: any) {
      console.error("Error creating contract charge:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/contract-charges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const charge = await storage.updateContractCharge(id, req.body);
      res.json(charge);
    } catch (error: any) {
      console.error("Error updating contract charge:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/contract-charges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContractCharge(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting contract charge:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // --- Charge Types ---

  app.get("/api/charge-types", async (_req, res) => {
    try {
      const types = await storage.getChargeTypes();
      res.json(types);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/charge-types", async (req, res) => {
    try {
      const type = await storage.createChargeType(req.body.name);
      res.status(201).json(type);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // --- Todos ---

  app.get("/api/todos", async (_req, res) => {
    const items = await storage.getTodoItems();
    res.json(items);
  });

  app.post("/api/todos", async (req, res) => {
    try {
      const item = await storage.createTodoItem(req.body);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/todos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.toggleTodoItem(id, req.body.isDone);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/todos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTodoItem(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // --- Profile Import ---

  app.post("/api/import/profile/preview", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const content = req.file.buffer.toString("utf-8");
      const lines = content.split(/\r?\n/).filter(l => l.trim());

      if (lines.length === 0) return res.status(400).json({ message: "File is empty" });

      const allMeters = await db.select({
        id: dataSets.id,
        mpan: dataSets.mpanCoreMprn,
        meterSerial: dataSets.meterSerial1,
        siteId: dataSets.siteId,
        name: dataSets.name
      }).from(dataSets);

      const mpanMap = new Map<string, typeof allMeters[0]>();
      const serialMap = new Map<string, typeof allMeters[0]>();
      for (const m of allMeters) {
        if (m.mpan) mpanMap.set(m.mpan.trim(), m);
        if (m.meterSerial) serialMap.set(m.meterSerial.trim(), m);
      }

      const metersFound = new Map<string, { meter: typeof allMeters[0]; rowCount: number; dateRange: { min: string; max: string } }>();
      const unmatchedMpans = new Set<string>();
      let totalRows = 0;
      const sampleRows: any[] = [];

      for (const line of lines) {
        const fields = line.split(",");
        if (fields.length < 100) continue;

        const parsed = parseFormat18Row(fields);
        if (!parsed.date || !parsed.mpan) continue;
        totalRows++;

        const mpanCore = parsed.mpan.length > 8 ? parsed.mpan.slice(2, -1) : parsed.mpan;
        const meter = mpanMap.get(parsed.mpan) || mpanMap.get(mpanCore) || serialMap.get(parsed.meterSerial);

        if (meter) {
          const key = `${meter.id}`;
          const existing = metersFound.get(key);
          const dateStr = parsed.date.toISOString().split("T")[0];
          if (existing) {
            existing.rowCount++;
            if (dateStr < existing.dateRange.min) existing.dateRange.min = dateStr;
            if (dateStr > existing.dateRange.max) existing.dateRange.max = dateStr;
          } else {
            metersFound.set(key, { meter, rowCount: 1, dateRange: { min: dateStr, max: dateStr } });
          }
        } else {
          unmatchedMpans.add(parsed.mpan);
        }

        if (sampleRows.length < 5) {
          sampleRows.push({
            mpan: parsed.mpan,
            meterSerial: parsed.meterSerial,
            date: parsed.date.toISOString().split("T")[0],
            dayTotal: Math.round(parsed.dayTotal * 100) / 100,
            matched: !!meter,
            meterId: meter?.id || null
          });
        }
      }

      res.json({
        filename: req.file.originalname,
        format: "Format 18 - HH Profile",
        totalRows,
        metersMatched: metersFound.size,
        meters: Array.from(metersFound.values()).map(m => ({
          id: m.meter.id,
          mpan: m.meter.mpan,
          meterSerial: m.meter.meterSerial,
          siteId: m.meter.siteId,
          rowCount: m.rowCount,
          dateRange: m.dateRange
        })),
        unmatchedMpans: Array.from(unmatchedMpans),
        sampleRows
      });
    } catch (error: any) {
      console.error("Preview error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/profile/execute", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const content = req.file.buffer.toString("utf-8");
      const lines = content.split(/\r?\n/).filter(l => l.trim());

      const allMeters = await db.select({
        id: dataSets.id,
        mpan: dataSets.mpanCoreMprn,
        meterSerial: dataSets.meterSerial1
      }).from(dataSets);

      const mpanMap = new Map<string, number>();
      const serialMap = new Map<string, number>();
      for (const m of allMeters) {
        if (m.mpan) mpanMap.set(m.mpan.trim(), m.id);
        if (m.meterSerial) serialMap.set(m.meterSerial.trim(), m.id);
      }

      const [logEntry] = await db.insert(importLogs).values({
        filename: req.file.originalname,
        format: "Format 18 - HH Profile",
        status: "processing",
        totalRows: lines.length,
      }).returning();

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const line of lines) {
        const fields = line.split(",");
        if (fields.length < 100) { skipped++; continue; }

        const parsed = parseFormat18Row(fields);
        if (!parsed.date || !parsed.mpan) { skipped++; continue; }

        const mpanCore = parsed.mpan.length > 8 ? parsed.mpan.slice(2, -1) : parsed.mpan;
        const dataSetId = mpanMap.get(parsed.mpan) ?? mpanMap.get(mpanCore) ?? serialMap.get(parsed.meterSerial);

        if (!dataSetId) { skipped++; continue; }

        try {
          const dateStr = parsed.date.toISOString().split("T")[0];
          const existing = await db.select({ id: dataProfiles.id })
            .from(dataProfiles)
            .where(and(
              eq(dataProfiles.dataSetId, dataSetId),
              sql`DATE(${dataProfiles.date}) = ${dateStr}`
            ))
            .limit(1);

          const profileData = {
            dataSetId,
            date: parsed.date,
            type: 0,
            dayTotal: Math.round(parsed.dayTotal * 100) / 100,
            ...parsed.intervals,
            ...parsed.flags
          } as any;

          if (existing.length > 0) {
            await db.update(dataProfiles)
              .set(profileData)
              .where(eq(dataProfiles.id, existing[0].id));
          } else {
            await db.insert(dataProfiles).values(profileData);
          }
          imported++;
        } catch (err: any) {
          errors++;
          if (errorDetails.length < 10) {
            errorDetails.push(`Row ${parsed.mpan} ${parsed.date.toISOString().split("T")[0]}: ${err.message}`);
          }
        }
      }

      await db.update(importLogs).set({
        status: errors > 0 ? "completed_with_errors" : "completed",
        importedRows: imported,
        skippedRows: skipped,
        errorRows: errors,
        errorDetails: errorDetails.length > 0 ? errorDetails.join("\n") : null,
        completedAt: new Date()
      }).where(eq(importLogs.id, logEntry.id));

      res.json({
        id: logEntry.id,
        status: errors > 0 ? "completed_with_errors" : "completed",
        imported,
        skipped,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      });
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/import/logs", async (_req, res) => {
    try {
      const logs = await db.select().from(importLogs).orderBy(sql`${importLogs.createdAt} DESC`).limit(20);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- Invoice MM Import ---

  app.post("/api/import/invoice/preview", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const content = req.file.buffer.toString("utf-8");
      const invoices = parseMMFile(content);

      if (invoices.length === 0) {
        return res.status(400).json({ message: "No valid invoice data found in file" });
      }

      const allMeters = await db.select({
        id: dataSets.id,
        mpan: dataSets.mpanCoreMprn,
        name: dataSets.name,
        siteId: dataSets.siteId,
      }).from(dataSets);

      const mpanMap = new Map<string, typeof allMeters[0]>();
      for (const m of allMeters) {
        if (m.mpan) mpanMap.set(m.mpan.trim(), m);
      }

      const results = invoices.map(inv => {
        const meter = inv.mpanCore ? mpanMap.get(inv.mpanCore) : null;

        const dayCharge = inv.charges.find(c => c.code === "UNIT" && c.register === "DAY");
        const nightCharge = inv.charges.find(c => c.code === "UNIT" && c.register === "NIGHT");
        const singleCharge = inv.charges.find(c => c.code === "UNIT" && c.register === "SINGLE");
        const stdgCharge = inv.charges.find(c => c.code === "STDG");
        const avalCharge = inv.charges.find(c => c.code === "AVAL");
        const reapCharge = inv.charges.find(c => c.code === "REAP");
        const dcdaCharge = inv.charges.find(c => c.code === "DCDA");

        return {
          accountRef: inv.accountRef,
          mpanCore: inv.mpanCore,
          matched: !!meter,
          meterId: meter?.id || null,
          meterName: meter?.name || null,
          siteId: meter?.siteId || null,
          invoiceDate: inv.invoiceDate?.toISOString().split("T")[0] || null,
          periodStart: inv.periodStart?.toISOString().split("T")[0] || null,
          periodEnd: inv.periodEnd?.toISOString().split("T")[0] || null,
          totalIncVat: inv.totalIncVat,
          netTotal: inv.netTotal,
          vatAmount: inv.vatAmount,
          vatPercent: inv.vatPercent,
          totalKwh: inv.totalKwh,
          dayUnits: dayCharge?.quantity || singleCharge?.quantity || 0,
          nightUnits: nightCharge?.quantity || 0,
          dayRate: dayCharge ? dayCharge.rate * 100 : (singleCharge ? singleCharge.rate * 100 : 0),
          nightRate: nightCharge ? nightCharge.rate * 100 : 0,
          standingCharge: stdgCharge ? stdgCharge.costPence / 100 : 0,
          availabilityCharge: avalCharge ? avalCharge.costPence / 100 : 0,
          reactivePowerCharge: reapCharge ? reapCharge.costPence / 100 : 0,
          meteringCharge: dcdaCharge ? dcdaCharge.costPence / 100 : 0,
          cclAmount: inv.cclAmount,
          cclRate: inv.cclRate,
          powerFactor: inv.powerFactor,
          supplierName: inv.supplierName,
          chargeCount: inv.charges.length,
        };
      });

      res.json({
        filename: req.file.originalname,
        format: "EDF MM Invoice",
        invoiceCount: results.length,
        invoices: results,
      });
    } catch (error: any) {
      console.error("Invoice preview error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/invoice/execute", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const content = req.file.buffer.toString("utf-8");
      const invoices = parseMMFile(content);
      const username = (req.body?.username as string) || "import";

      const allMeters = await db.select({
        id: dataSets.id,
        mpan: dataSets.mpanCoreMprn,
      }).from(dataSets);

      const mpanMap = new Map<string, number>();
      for (const m of allMeters) {
        if (m.mpan) mpanMap.set(m.mpan.trim(), m.id);
      }

      const [logEntry] = await db.insert(importLogs).values({
        filename: req.file.originalname,
        format: "EDF MM Invoice",
        status: "processing",
        totalRows: invoices.length,
      }).returning();

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const inv of invoices) {
        if (!inv.mpanCore) { skipped++; continue; }
        const dataSetId = mpanMap.get(inv.mpanCore);
        if (!dataSetId) { skipped++; continue; }

        try {
          const record = mmInvoiceToDataRecord(inv, dataSetId, username);

          const periodEnd = inv.periodEnd ? inv.periodEnd.toISOString().split("T")[0] : null;
          if (periodEnd) {
            const existing = await db.select({ id: dataRecords.id })
              .from(dataRecords)
              .where(and(
                eq(dataRecords.dataSetId, dataSetId),
                sql`DATE(${dataRecords.date}) = ${periodEnd}`
              ))
              .limit(1);

            if (existing.length > 0) {
              await db.update(dataRecords)
                .set(record)
                .where(eq(dataRecords.id, existing[0].id));
            } else {
              await db.insert(dataRecords).values(record);
            }
          } else {
            await db.insert(dataRecords).values(record);
          }

          imported++;
        } catch (err: any) {
          errors++;
          if (errorDetails.length < 10) {
            errorDetails.push(`MPAN ${inv.mpanCore}: ${err.message}`);
          }
        }
      }

      await db.update(importLogs).set({
        status: errors > 0 ? "completed_with_errors" : "completed",
        importedRows: imported,
        skippedRows: skipped,
        errorRows: errors,
        errorDetails: errorDetails.length > 0 ? errorDetails.join("\n") : null,
        completedAt: new Date()
      }).where(eq(importLogs.id, logEntry.id));

      res.json({
        id: logEntry.id,
        status: errors > 0 ? "completed_with_errors" : "completed",
        imported,
        skipped,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      });
    } catch (error: any) {
      console.error("Invoice import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // --- Crown EDI Invoice Import ---

  app.post("/api/import/crown-edi/preview", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const content = req.file.buffer.toString("utf-8");
      const invoices = parseCrownEDI(content);

      if (invoices.length === 0) {
        return res.status(400).json({ message: "No valid Crown EDI invoice data found in file" });
      }

      const allMeters = await db.select({
        id: dataSets.id,
        mpan: dataSets.mpanCoreMprn,
        name: dataSets.name,
        siteId: dataSets.siteId,
      }).from(dataSets);

      const mprnMap = new Map<string, typeof allMeters[0]>();
      for (const m of allMeters) {
        if (m.mpan) mprnMap.set(m.mpan.trim(), m);
      }

      const results = invoices.map(inv => {
        const meter = inv.mprn ? mprnMap.get(inv.mprn) : null;

        return {
          invoiceNumber: inv.invoiceNumber,
          mprn: inv.mprn,
          meterSerial: inv.meterSerial,
          matched: !!meter,
          meterId: meter?.id || null,
          meterName: meter?.name || null,
          siteId: meter?.siteId || null,
          billDate: inv.billDate?.toISOString().split("T")[0] || null,
          startReadDate: inv.startReadDate?.toISOString().split("T")[0] || null,
          endReadDate: inv.endReadDate?.toISOString().split("T")[0] || null,
          startRead: inv.startRead,
          startReadType: inv.startReadType,
          endRead: inv.endRead,
          endReadType: inv.endReadType,
          totalEnergy: inv.totalEnergy,
          gasCost: inv.gasCost,
          standingCharge: inv.standingCharge,
          cclAmount: inv.cclAmount,
          netTotal: inv.netTotal,
          vat1Percent: inv.vat1Percent,
          vat1: inv.vat1,
          vat2Percent: inv.vat2Percent,
          vat2: inv.vat2,
          invoiceTotal: inv.invoiceTotal,
          unitRate: inv.unitRate,
          scRate: inv.scRate,
          scDays: inv.scDays,
          cclRate: inv.cclRate,
          correctionFactor: inv.correctionFactor,
          cv: inv.cv,
          ceRef: inv.ceRef,
          accountNo: inv.accountNo,
        };
      });

      res.json({
        filename: req.file.originalname,
        format: "Crown EDI",
        invoiceCount: results.length,
        invoices: results,
      });
    } catch (error: any) {
      console.error("Crown EDI preview error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/crown-edi/execute", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const content = req.file.buffer.toString("utf-8");
      const invoices = parseCrownEDI(content);
      const username = (req.body?.username as string) || "import";

      const allMeters = await db.select({
        id: dataSets.id,
        mpan: dataSets.mpanCoreMprn,
      }).from(dataSets);

      const mprnMap = new Map<string, number>();
      for (const m of allMeters) {
        if (m.mpan) mprnMap.set(m.mpan.trim(), m.id);
      }

      const [logEntry] = await db.insert(importLogs).values({
        filename: req.file.originalname,
        format: "Crown EDI",
        status: "processing",
        totalRows: invoices.length,
      }).returning();

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const inv of invoices) {
        if (!inv.mprn) { skipped++; continue; }
        const dataSetId = mprnMap.get(inv.mprn);
        if (!dataSetId) { skipped++; continue; }

        try {
          const record = crownEDIToDataRecord(inv, dataSetId, username);

          const endDate = inv.endReadDate ? inv.endReadDate.toISOString().split("T")[0] : null;
          if (endDate) {
            const existing = await db.select({ id: dataRecords.id })
              .from(dataRecords)
              .where(and(
                eq(dataRecords.dataSetId, dataSetId),
                sql`DATE(${dataRecords.date}) = ${endDate}`
              ))
              .limit(1);

            if (existing.length > 0) {
              await db.update(dataRecords)
                .set(record)
                .where(eq(dataRecords.id, existing[0].id));
            } else {
              await db.insert(dataRecords).values(record);
            }
          } else {
            await db.insert(dataRecords).values(record);
          }

          imported++;
        } catch (err: any) {
          errors++;
          if (errorDetails.length < 10) {
            errorDetails.push(`MPRN ${inv.mprn}: ${err.message}`);
          }
        }
      }

      await db.update(importLogs).set({
        status: errors > 0 ? "completed_with_errors" : "completed",
        importedRows: imported,
        skippedRows: skipped,
        errorRows: errors,
        errorDetails: errorDetails.length > 0 ? errorDetails.join("\n") : null,
        completedAt: new Date()
      }).where(eq(importLogs.id, logEntry.id));

      res.json({
        id: logEntry.id,
        status: errors > 0 ? "completed_with_errors" : "completed",
        imported,
        skipped,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      });
    } catch (error: any) {
      console.error("Crown EDI import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // --- npower PDF Import ---

  app.post("/api/import/npower-pdf/preview", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const invoice = await parseNpowerPDF(req.file.buffer);

      const allDataSets = await db.select().from(dataSets);
      const metersPreview = invoice.meters.map((meter) => {
        const matched = allDataSets.find(
          (ds) => ds.mpanCoreMprn === meter.mpan || ds.mpanCoreMprn2 === meter.mpan
        );
        return {
          mpan: meter.mpan,
          meterSerial: meter.meterSerial,
          periodStart: meter.periodStart,
          periodEnd: meter.periodEnd,
          dayKwh: meter.dayKwh,
          nightKwh: meter.nightKwh,
          totalKwh: meter.totalKwh,
          dayRate: meter.dayRate,
          nightRate: meter.nightRate,
          dayCost: meter.dayCost,
          nightCost: meter.nightCost,
          wapDayCost: meter.wapDayCost,
          wapNightCost: meter.wapNightCost,
          duos: meter.duos,
          tuos: meter.tuos,
          bsuos: meter.bsuos,
          standingMetering: meter.standingMetering,
          totalGovLevies: meter.totalGovLevies,
          cclAmount: meter.cclAmount,
          totalExVat: meter.totalExVat,
          maxDemandKw: meter.maxDemandKw,
          maxDemandKva: meter.maxDemandKva,
          reactivePowerCost: meter.reactivePowerCost,
          matchedDataSetId: matched?.id || null,
          matchedMeterName: matched?.name || null,
          matchedSiteName: null as string | null,
        };
      });

      for (const mp of metersPreview) {
        if (mp.matchedDataSetId) {
          const ds = allDataSets.find((d) => d.id === mp.matchedDataSetId);
          if (ds) {
            const siteRows = await db.select().from(sites).where(eq(sites.id, ds.siteId));
            mp.matchedSiteName = siteRows[0]?.name || null;
          }
        }
      }

      res.json({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        accountNumber: invoice.accountNumber,
        totalExVat: invoice.totalExVat,
        vatRate: invoice.vatRate,
        vatAmount: invoice.vatAmount,
        invoiceTotal: invoice.invoiceTotal,
        meters: metersPreview,
        warnings: invoice.warnings || [],
      });
    } catch (error: any) {
      console.error("npower PDF preview error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/import/npower-pdf/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const invoice = await parseNpowerPDF(req.file.buffer);
      const username = (req.body?.username as string) || "import";

      const allDataSets = await db.select().from(dataSets);

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const meter of invoice.meters) {
        const matched = allDataSets.find(
          (ds) => ds.mpanCoreMprn === meter.mpan || ds.mpanCoreMprn2 === meter.mpan
        );

        if (!matched) {
          skipped++;
          errors.push(`No matching meter found for MPAN ${meter.mpan}`);
          continue;
        }

        const record = npowerInvoiceToDataRecord(invoice, meter, matched.id, username);

        const existing = await db.select().from(dataRecords).where(
          and(
            eq(dataRecords.dataSetId, matched.id),
            eq(dataRecords.date, record.date)
          )
        );

        if (existing.length > 0) {
          await db.update(dataRecords)
            .set(record)
            .where(eq(dataRecords.id, existing[0].id));
          updated++;
        } else {
          await db.insert(dataRecords).values(record);
          imported++;
        }
      }

      res.json({
        imported,
        updated,
        skipped,
        total: invoice.meters.length,
        invoiceNumber: invoice.invoiceNumber,
        errors,
      });
    } catch (error: any) {
      console.error("npower PDF import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // --- SFTP Configuration ---

  app.get("/api/sftp/configs", async (_req, res) => {
    try {
      const configs = await db.select().from(sftpConfigs).orderBy(desc(sftpConfigs.createdAt));
      const safeConfigs = configs.map(({ password, privateKey, ...rest }) => ({
        ...rest,
        hasPassword: !!password,
        hasPrivateKey: !!privateKey,
      }));
      res.json(safeConfigs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/sftp/configs", async (req, res) => {
    try {
      const { name, host, port, username, password, privateKey, remoteDirectory, filePattern } = req.body;
      if (!name || typeof name !== "string" || !host || typeof host !== "string" || !username || typeof username !== "string") {
        return res.status(400).json({ message: "Name, host, and username are required and must be strings" });
      }
      if (port !== undefined && (typeof port !== "number" || port < 1 || port > 65535)) {
        return res.status(400).json({ message: "Port must be a number between 1 and 65535" });
      }
      const [config] = await db.insert(sftpConfigs).values({
        name,
        host,
        port: port || 22,
        username,
        password: password || null,
        privateKey: privateKey || null,
        remoteDirectory: remoteDirectory || "/",
        filePattern: filePattern || "*.csv",
      }).returning();
      const { password: _p, privateKey: _k, ...safeConfig } = config;
      res.status(201).json({ ...safeConfig, hasPassword: !!config.password, hasPrivateKey: !!config.privateKey });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/sftp/configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates: any = {};
      const allowedFields = ["name", "host", "port", "username", "password", "privateKey", "remoteDirectory", "filePattern", "isActive"];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      const [config] = await db.update(sftpConfigs).set(updates).where(eq(sftpConfigs.id, id)).returning();
      if (!config) return res.status(404).json({ message: "Config not found" });
      const { password: _p, privateKey: _k, ...safeConfig } = config;
      res.json({ ...safeConfig, hasPassword: !!config.password, hasPrivateKey: !!config.privateKey });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/sftp/configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(sftpDownloadLogs).where(eq(sftpDownloadLogs.sftpConfigId, id));
      await db.delete(sftpConfigs).where(eq(sftpConfigs.id, id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/sftp/configs/:id/test", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [config] = await db.select().from(sftpConfigs).where(eq(sftpConfigs.id, id));
      if (!config) return res.status(404).json({ message: "Config not found" });

      const sftp = new SftpClient();
      const connectOpts: any = {
        host: config.host,
        port: config.port,
        username: config.username,
      };
      if (config.password) connectOpts.password = config.password;
      if (config.privateKey) connectOpts.privateKey = config.privateKey;

      await sftp.connect(connectOpts);
      const list = await sftp.list(config.remoteDirectory);
      await sftp.end();

      await db.update(sftpConfigs).set({ lastConnected: new Date(), lastError: null }).where(eq(sftpConfigs.id, id));

      const csvFiles = list.filter((f: any) => f.type === "-" && f.name.match(/\.(csv|txt)$/i));

      res.json({
        success: true,
        message: `Connected successfully. Found ${csvFiles.length} CSV/TXT files in ${config.remoteDirectory}`,
        files: csvFiles.map((f: any) => ({
          name: f.name,
          size: f.size,
          modifyTime: f.modifyTime,
        })),
      });
    } catch (error: any) {
      const id = parseInt(req.params.id);
      await db.update(sftpConfigs).set({ lastError: error.message }).where(eq(sftpConfigs.id, id));
      res.status(400).json({ success: false, message: `Connection failed: ${error.message}` });
    }
  });

  app.post("/api/sftp/configs/:id/list-files", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [config] = await db.select().from(sftpConfigs).where(eq(sftpConfigs.id, id));
      if (!config) return res.status(404).json({ message: "Config not found" });

      const sftp = new SftpClient();
      const connectOpts: any = {
        host: config.host,
        port: config.port,
        username: config.username,
      };
      if (config.password) connectOpts.password = config.password;
      if (config.privateKey) connectOpts.privateKey = config.privateKey;

      await sftp.connect(connectOpts);
      const list = await sftp.list(config.remoteDirectory);
      await sftp.end();

      const previousDownloads = await db.select({ filename: sftpDownloadLogs.filename })
        .from(sftpDownloadLogs).where(eq(sftpDownloadLogs.sftpConfigId, id));
      const downloadedFiles = new Set(previousDownloads.map(d => d.filename));

      const csvFiles = list
        .filter((f: any) => f.type === "-" && f.name.match(/\.(csv|txt)$/i))
        .map((f: any) => ({
          name: f.name,
          size: f.size,
          modifyTime: f.modifyTime,
          alreadyDownloaded: downloadedFiles.has(f.name),
        }))
        .sort((a: any, b: any) => (b.modifyTime || 0) - (a.modifyTime || 0));

      res.json(csvFiles);
    } catch (error: any) {
      res.status(400).json({ message: `Failed to list files: ${error.message}` });
    }
  });

  app.post("/api/sftp/configs/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { filename } = req.body;
      if (!filename) return res.status(400).json({ message: "Filename is required" });

      const [config] = await db.select().from(sftpConfigs).where(eq(sftpConfigs.id, id));
      if (!config) return res.status(404).json({ message: "Config not found" });

      const sftp = new SftpClient();
      const connectOpts: any = {
        host: config.host,
        port: config.port,
        username: config.username,
      };
      if (config.password) connectOpts.password = config.password;
      if (config.privateKey) connectOpts.privateKey = config.privateKey;

      await sftp.connect(connectOpts);
      const remotePath = config.remoteDirectory.endsWith("/")
        ? config.remoteDirectory + filename
        : config.remoteDirectory + "/" + filename;

      const stat = await sftp.stat(remotePath);
      if (stat.size > 50 * 1024 * 1024) {
        await sftp.end();
        return res.status(400).json({ message: "File too large (max 50MB)" });
      }

      const buffer = await sftp.get(remotePath) as Buffer;
      await sftp.end();

      const content = buffer.toString("utf-8");
      const lines = content.split(/\r?\n/).filter(l => l.trim());

      const allMeters = await db.select({
        id: dataSets.id,
        mpan: dataSets.mpanCoreMprn,
        meterSerial: dataSets.meterSerial1
      }).from(dataSets);

      const mpanMap = new Map<string, number>();
      const serialMap = new Map<string, number>();
      for (const m of allMeters) {
        if (m.mpan) mpanMap.set(m.mpan.trim(), m.id);
        if (m.meterSerial) serialMap.set(m.meterSerial.trim(), m.id);
      }

      const [logEntry] = await db.insert(importLogs).values({
        filename: `[SFTP] ${filename}`,
        format: "Format 18 - HH Profile",
        status: "processing",
        totalRows: lines.length,
      }).returning();

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const line of lines) {
        const fields = line.split(",");
        if (fields.length < 100) { skipped++; continue; }

        const parsed = parseFormat18Row(fields);
        if (!parsed.date || !parsed.mpan) { skipped++; continue; }

        const mpanCore = parsed.mpan.length > 8 ? parsed.mpan.slice(2, -1) : parsed.mpan;
        const dataSetId = mpanMap.get(parsed.mpan) ?? mpanMap.get(mpanCore) ?? serialMap.get(parsed.meterSerial);

        if (!dataSetId) { skipped++; continue; }

        try {
          const dateStr = parsed.date.toISOString().split("T")[0];
          const existing = await db.select({ id: dataProfiles.id })
            .from(dataProfiles)
            .where(and(
              eq(dataProfiles.dataSetId, dataSetId),
              sql`DATE(${dataProfiles.date}) = ${dateStr}`
            ))
            .limit(1);

          const profileData = {
            dataSetId,
            date: parsed.date,
            type: 0,
            dayTotal: Math.round(parsed.dayTotal * 100) / 100,
            ...parsed.intervals,
            ...parsed.flags
          } as any;

          if (existing.length > 0) {
            await db.update(dataProfiles)
              .set(profileData)
              .where(eq(dataProfiles.id, existing[0].id));
          } else {
            await db.insert(dataProfiles).values(profileData);
          }
          imported++;
        } catch (err: any) {
          errors++;
          if (errorDetails.length < 10) {
            errorDetails.push(`Row ${parsed.mpan} ${parsed.date.toISOString().split("T")[0]}: ${err.message}`);
          }
        }
      }

      const finalStatus = errors > 0 ? "completed_with_errors" : "completed";
      await db.update(importLogs).set({
        status: finalStatus,
        importedRows: imported,
        skippedRows: skipped,
        errorRows: errors,
        errorDetails: errorDetails.length > 0 ? errorDetails.join("\n") : null,
        completedAt: new Date()
      }).where(eq(importLogs.id, logEntry.id));

      await db.insert(sftpDownloadLogs).values({
        sftpConfigId: id,
        filename,
        fileSize: buffer.length,
        status: finalStatus,
        importLogId: logEntry.id,
        processedAt: new Date(),
        errorDetails: errorDetails.length > 0 ? errorDetails.join("\n") : null,
      });

      await db.update(sftpConfigs).set({ lastDownload: new Date(), lastError: null }).where(eq(sftpConfigs.id, id));

      res.json({
        importLogId: logEntry.id,
        filename,
        status: finalStatus,
        imported,
        skipped,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      });
    } catch (error: any) {
      res.status(500).json({ message: `Download failed: ${error.message}` });
    }
  });

  app.get("/api/sftp/configs/:id/downloads", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const logs = await db.select()
        .from(sftpDownloadLogs)
        .where(eq(sftpDownloadLogs.sftpConfigId, id))
        .orderBy(desc(sftpDownloadLogs.downloadedAt))
        .limit(50);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
