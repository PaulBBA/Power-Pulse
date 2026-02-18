export interface CrownEDIInvoice {
  invoiceNumber: string;
  billDate: Date | null;
  dueDate: Date | null;
  ceRef: string;
  accountNo: string;
  gasCost: number;
  standingCharge: number;
  cclAmount: number;
  netTotal: number;
  vat1Percent: number;
  vat2Percent: number;
  vat1: number;
  vat2: number;
  invoiceTotal: number;

  mprn: string;
  meterSerial: string;
  correctionFactor: number;
  cv: number;
  startReadDate: Date | null;
  startRead: number;
  startReadType: string;
  endReadDate: Date | null;
  endRead: number;
  endReadType: string;
  cclRate: number;
  scDays: number;
  unitRate: number;
  scRate: number;
  totalEnergy: number;
}

function parseDate(s: string): Date | null {
  if (!s || s.length !== 8) return null;
  const y = parseInt(s.substring(0, 4));
  const m = parseInt(s.substring(4, 6)) - 1;
  const d = parseInt(s.substring(6, 8));
  return new Date(y, m, d);
}

function parseReading(s: string): { value: number; type: string } {
  if (!s) return { value: 0, type: "" };
  const trimmed = s.trim();
  const parts = trimmed.split(/\s+/);
  const value = parseFloat(parts[0]) || 0;
  const type = parts[1] || "";
  return { value, type };
}

export function parseCrownEDI(content: string): CrownEDIInvoice[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  if (!headerLine.includes("Record ID")) return [];

  const invoices: CrownEDIInvoice[] = [];
  let i = 1;

  while (i < lines.length) {
    const cols = lines[i].split(",");
    if (cols[0] !== "I1") { i++; continue; }

    const i1 = cols;

    let i2: string[] | null = null;
    if (i + 1 < lines.length) {
      const nextCols = lines[i + 1].split(",");
      if (nextCols[0] === "I2" && nextCols[1] === i1[1]) {
        i2 = nextCols;
        i += 2;
      } else {
        i++;
        continue;
      }
    } else {
      i++;
      continue;
    }

    const startReading = parseReading(i2[7]);
    const endReading = parseReading(i2[9]);

    invoices.push({
      invoiceNumber: i1[1],
      billDate: parseDate(i1[2]),
      dueDate: parseDate(i1[3]),
      ceRef: i1[4] || "",
      accountNo: i1[5] || "",
      gasCost: parseFloat(i1[6]) || 0,
      standingCharge: parseFloat(i1[7]) || 0,
      cclAmount: parseFloat(i1[8]) || 0,
      netTotal: parseFloat(i1[9]) || 0,
      vat1Percent: parseFloat(i1[10]) || 0,
      vat2Percent: parseFloat(i1[11]) || 0,
      vat1: parseFloat(i1[12]) || 0,
      vat2: parseFloat(i1[13]) || 0,
      invoiceTotal: parseFloat(i1[14]) || 0,

      mprn: i2[2] || "",
      meterSerial: i2[3] || "",
      correctionFactor: parseFloat(i2[4]) || 0,
      cv: parseFloat(i2[5]) || 0,
      startReadDate: parseDate(i2[6]),
      startRead: startReading.value,
      startReadType: startReading.type,
      endReadDate: parseDate(i2[8]),
      endRead: endReading.value,
      endReadType: endReading.type,
      cclRate: parseFloat(i2[10]) || 0,
      scDays: parseInt(i2[11]) || 0,
      unitRate: parseFloat(i2[12]) || 0,
      scRate: parseFloat(i2[13]) || 0,
      totalEnergy: parseFloat(i2[14]) || 0,
    });
  }

  return invoices;
}

export function crownEDIToDataRecord(invoice: CrownEDIInvoice, dataSetId: number, username: string): Record<string, any> {
  return {
    dataSetId,
    utilityType: "gas",
    date: invoice.endReadDate,
    previousDate: invoice.startReadDate,
    direct: null,
    estimate: invoice.endReadType === "E" ? "E" : null,
    units: invoice.totalEnergy,
    cost: invoice.invoiceTotal,
    batch: 0,
    standingCharge: invoice.standingCharge,
    standingChargeRate: invoice.scRate > 0 ? Math.round(invoice.scRate * 100) / 100 : 0,
    otherCharge: 0,
    vat: invoice.vat1 + invoice.vat2,
    ccl: invoice.cclAmount,
    cclRate: invoice.cclRate,
    invoiceNumber: invoice.invoiceNumber,
    supplierName: "Crown Gas & Power",
    number: invoice.mprn,
    locked: 0,
    passedToAccounts: 0,
    status: 0,
    datePaid: null,
    dateTaxPoint: invoice.billDate,
    excludeFromReports: 0,
    lastUpdate: new Date(),
    lastUser: username,
    note: null,

    m1Units: invoice.totalEnergy,
    m1CostRate: invoice.unitRate,
    m1Cost: invoice.gasCost,
    m1Present: invoice.endRead,
    m1Previous: invoice.startRead,
    m1Factor: invoice.correctionFactor,

    m2Units: 0, m2CostRate: 0, m2Cost: 0, m2Present: 0, m2Previous: 0, m2Factor: 0,
    m3Present: 0, m3Previous: 0, m3Factor: 0, m3Units: 0, m3CostRate: 0, m3Cost: 0,
    m4Present: 0, m4Previous: 0, m4Factor: 0, m4Units: 0, m4CostRate: 0, m4Cost: 0,

    vatSplit: 0,
    vat1Percent: invoice.vat1Percent,
    vat1: invoice.vat1,
    vat2Percent: invoice.vat2Percent,
    vat2: invoice.vat2,

    kwhFactor: invoice.cv,
  };
}
