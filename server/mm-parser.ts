export interface MMInvoice {
  accountRef: string;
  mpanCore: string | null;
  invoiceDate: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  totalIncVat: number;
  netTotal: number;
  vatAmount: number;
  vatPercent: number;
  supplierName: string;
  customerName: string;
  paymentMethod: string;
  charges: MMCharge[];
  readings: MMReading[];
  cclAmount: number;
  cclRate: number;
  totalKwh: number;
  powerFactor: number | null;
}

export interface MMCharge {
  code: string;
  description: string;
  register: string;
  quantity: number;
  costPence: number;
  rate: number;
  days: number;
}

export interface MMReading {
  registerType: string;
  unit: string;
  value: number;
  chargeCode: string;
  register: string;
  mpan: string;
}

function parseDate(s: string): Date | null {
  if (!s || s.length < 8) return null;
  const y = parseInt(s.substring(0, 4));
  const m = parseInt(s.substring(4, 6)) - 1;
  const d = parseInt(s.substring(6, 8));
  if (isNaN(y) || isNaN(m) || isNaN(d) || y < 2000 || y > 2100 || m < 0 || m > 11 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m, d));
}

function parseSignedInt(s: string): number {
  const cleaned = s.replace(/\s/g, "");
  if (!cleaned) return 0;
  const sign = cleaned.startsWith("-") ? -1 : 1;
  const digits = cleaned.replace(/[+-]/g, "");
  return sign * parseInt(digits, 10);
}

export function parseMMFile(content: string): MMInvoice[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const invoices: MMInvoice[] = [];
  let pushed = false;

  let current: MMInvoice = makeEmptyInvoice();

  for (const line of lines) {
    if (line.length < 84) continue;

    const recordType = line.substring(80, 84).trim();
    const data = line.substring(84);

    switch (recordType) {
      case "0050": {
        current.accountRef = line.substring(0, 22).trim();
        current.invoiceDate = parseDate(data.substring(0, 8));
        current.totalIncVat = parseSignedInt(data.substring(8, 20)) / 100;
        current.netTotal = parseSignedInt(data.substring(20, 32)) / 100;
        current.vatAmount = parseSignedInt(data.substring(44, 56)) / 100;

        const supplierMatch = line.match(/EDF Energy/i);
        if (supplierMatch) current.supplierName = "EDF Energy";

        const ddMatch = data.match(/D\/D|DD|BACS|CHQ/i);
        if (ddMatch) current.paymentMethod = ddMatch[0];
        break;
      }

      case "0051": {
        const cclMatch = data.match(/\+(\d{11})M/);
        if (cclMatch) {
          current.cclAmount = parseInt(cclMatch[1]) / 100;
        }
        break;
      }

      case "0101": {
        const periodDates = data.match(/^(\d{8})(\d{8})/);
        if (periodDates) {
          current.periodStart = parseDate(periodDates[1]);
          current.periodEnd = parseDate(periodDates[2]);
        }
        break;
      }

      case "0460": {
        const charge = parse0460(data);
        if (charge) current.charges.push(charge);
        break;
      }

      case "0461": {
        const reading = parse0461(data, line);
        if (reading) {
          current.readings.push(reading);
          if (!current.mpanCore && reading.mpan) {
            current.mpanCore = reading.mpan;
          }
        }
        break;
      }

      case "0470": {
        const pfMatch = data.match(/Power factor.*?(\d+\.\d+)/i);
        if (pfMatch) {
          current.powerFactor = parseFloat(pfMatch[1]);
        }
        break;
      }

      case "1455": {
        const numbers = data.match(/\d+\.\d+/g);
        if (numbers && numbers.length >= 2) {
          current.totalKwh = parseFloat(numbers[0]);
          current.cclRate = parseFloat(numbers[1]);
        }
        if (current.totalKwh > 0 && current.cclRate > 0 && current.cclAmount === 0) {
          current.cclAmount = Math.round(current.totalKwh * current.cclRate) / 100;
        }
        break;
      }

      case "1460": {
        const vatData = data.substring(13);
        const vatRateMatch = vatData.match(/^(\d+\.\d+)/);
        if (vatRateMatch) {
          current.vatPercent = parseFloat(vatRateMatch[1]);
        }
        break;
      }

      case "2000": {
        if (current.accountRef || current.mpanCore) {
          invoices.push(current);
          pushed = true;
        }
        break;
      }

      case "9999": {
        if (!pushed && (current.accountRef || current.mpanCore)) {
          invoices.push(current);
        }
        break;
      }
    }
  }

  if (invoices.length === 0 && (current.accountRef || current.mpanCore)) {
    invoices.push(current);
  }

  return invoices;
}

function makeEmptyInvoice(): MMInvoice {
  return {
    accountRef: "",
    mpanCore: null,
    invoiceDate: null,
    periodStart: null,
    periodEnd: null,
    totalIncVat: 0,
    netTotal: 0,
    vatAmount: 0,
    vatPercent: 0,
    supplierName: "",
    customerName: "",
    paymentMethod: "",
    charges: [],
    readings: [],
    cclAmount: 0,
    cclRate: 0,
    totalKwh: 0,
    powerFactor: null,
  };
}

const CHARGE_CODES = ["REAP", "AVAL", "STDG", "UNIT", "DCDA", "DUOS", "TUOS", "TRIAD", "ROC", "FIT", "GREEN", "MISC"];
const CHARGE_CODE_PATTERN = CHARGE_CODES.join("|");
const MD_PATTERN = "MD\\s";

function parse0460(data: string): MMCharge | null {
  const codeMatch = data.match(new RegExp(`(${CHARGE_CODE_PATTERN})\\s`)) || data.match(/MD\s{2,}/);
  if (!codeMatch) return null;
  const code = codeMatch[1] || "MD";

  const quantityMatch = data.match(new RegExp(`[+-](\\d+\\.\\d+)(?=${code})`));
  const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 0;

  const afterCode = data.substring(data.indexOf(code) + code.length);
  const rateMatch = afterCode.match(/\s*[+-](\d+\.\d{3,})\d{8}/);
  const rate = rateMatch ? parseFloat(rateMatch[1]) : 0;

  const registerMatch = data.match(/(DAY|NIGHT|SINGLE|WEEKDAY|EVENING|PEAK|OFFPEAK)/i);
  const register = registerMatch ? registerMatch[1].toUpperCase() : "SINGLE";

  const costFieldMatch = afterCode.match(/\d{8}\+(\d{11})/);
  let costPence = 0;
  if (costFieldMatch) {
    costPence = parseInt(costFieldMatch[1]);
  } else {
    const altMatch = afterCode.match(/[+-](\d{11})/);
    if (altMatch) {
      costPence = parseInt(altMatch[1]);
    }
  }

  const descMatch = afterCode.match(/\d{11}([A-Z][\w\s]+?)(?:\s{2,})/);
  const description = descMatch ? descMatch[1].trim() : code;

  const daysMatch = data.match(/\s(\d{1,3})\s*[+-]/);
  const days = daysMatch ? parseInt(daysMatch[1]) : 0;

  return { code, description, register, quantity, costPence, rate, days };
}

function parse0461(data: string, fullLine: string): MMReading | null {
  const regTypeMatch = data.match(/^\s+(HH|MD|RE|RI)/);
  if (!regTypeMatch) return null;
  const registerType = regTypeMatch[1];

  const valueMatch = data.match(/(\d+\.?\d*)\d{6}\d(KWH|KW|KVA|KVARH)/);
  let value = 0;
  let unit = "";
  if (valueMatch) {
    value = parseFloat(valueMatch[1]);
    unit = valueMatch[2];
  }

  const chargeCodeMatch = data.match(/(UNIT|MDKVA|MD|REAP|AVAL)/);
  const chargeCode = chargeCodeMatch ? chargeCodeMatch[1] : "";

  const registerMatch = data.match(/(DAY|NIGHT|SINGLE|RCTEXP|RCTIMP)/);
  const register = registerMatch ? registerMatch[1] : "SINGLE";

  const mpanMatch = data.match(/N\s(\d{13})/);
  const mpan = mpanMatch ? mpanMatch[1] : "";

  return { registerType, unit, value, chargeCode, register, mpan };
}

export function mmInvoiceToDataRecord(invoice: MMInvoice, dataSetId: number, username: string): Record<string, any> {
  const dayCharge = invoice.charges.find(c => c.code === "UNIT" && c.register === "DAY");
  const nightCharge = invoice.charges.find(c => c.code === "UNIT" && c.register === "NIGHT");
  const singleCharge = invoice.charges.find(c => c.code === "UNIT" && c.register === "SINGLE");
  const stdgCharge = invoice.charges.find(c => c.code === "STDG");
  const avalCharge = invoice.charges.find(c => c.code === "AVAL");
  const reapCharge = invoice.charges.find(c => c.code === "REAP");
  const dcdaCharge = invoice.charges.find(c => c.code === "DCDA");

  const mdReading = invoice.readings.find(r => r.registerType === "MD" && r.unit === "KW");
  const mdKvaReading = invoice.readings.find(r => r.registerType === "MD" && r.unit === "KVA");
  const reactiveImport = invoice.readings.find(r => r.registerType === "RI");

  const unitCharge1 = dayCharge || singleCharge;
  const unitCharge2 = nightCharge;

  const dayRate = unitCharge1 ? unitCharge1.rate * 100 : 0;
  const nightRate = unitCharge2 ? unitCharge2.rate * 100 : 0;
  const stdgRate = stdgCharge
    ? (stdgCharge.rate > 0 ? Math.round(stdgCharge.rate * 10000) / 100 : (stdgCharge.days > 0 ? Math.round((stdgCharge.costPence / stdgCharge.days) * 100) / 100 : 0))
    : 0;

  const record: Record<string, any> = {
    dataSetId,
    utilityType: "electricity",
    date: invoice.periodEnd,
    previousDate: invoice.periodStart,
    direct: null,
    estimate: null,
    units: invoice.totalKwh || (unitCharge1?.quantity || 0) + (unitCharge2?.quantity || 0),
    cost: invoice.netTotal,
    batch: 0,
    standingCharge: stdgCharge ? stdgCharge.costPence / 100 : 0,
    standingChargeRate: stdgRate,
    otherCharge: 0,
    vat: invoice.vatAmount,
    ccl: invoice.cclAmount,
    cclRate: invoice.cclRate,
    invoiceNumber: null,
    supplierName: invoice.supplierName || "EDF Energy",
    number: invoice.mpanCore,
    locked: 0,
    passedToAccounts: 0,
    status: 0,
    datePaid: null,
    dateTaxPoint: invoice.invoiceDate,
    excludeFromReports: 0,
    lastUpdate: new Date(),
    lastUser: username,
    note: null,

    m1Units: unitCharge1?.quantity || 0,
    m1CostRate: dayRate,
    m1Cost: unitCharge1 ? unitCharge1.costPence / 100 : 0,
    m1Present: 0,
    m1Previous: 0,
    m1Factor: 0,

    m2Units: unitCharge2?.quantity || 0,
    m2CostRate: nightRate,
    m2Cost: unitCharge2 ? unitCharge2.costPence / 100 : 0,
    m2Present: 0,
    m2Previous: 0,
    m2Factor: 0,

    m3Present: 0, m3Previous: 0, m3Factor: 0, m3Units: 0, m3CostRate: 0, m3Cost: 0,
    m4Present: 0, m4Previous: 0, m4Factor: 0, m4Units: 0, m4CostRate: 0, m4Cost: 0,

    vatSplit: 0,
    vat1Percent: invoice.vatPercent || 20,
    vat1: invoice.vatAmount,
    vat2Percent: 0,
    vat2: 0,

    deMinimis: 0,
    deMinimisThreshold: 0,
    nonVatableCharges: 0,
    flexiblePurchasing: 0,
    miscCost: 0,

    kva: mdKvaReading?.value || 0,
    kvaCost: avalCharge ? avalCharge.costPence / 100 : 0,
    kvaCostRate: avalCharge ? avalCharge.rate * 100 : 0,

    powerFactor: invoice.powerFactor,
    reactivePower: reactiveImport?.value || 0,
    reactivePowerCost: reapCharge ? reapCharge.costPence / 100 : 0,
    reactivePowerCostRate: reapCharge ? reapCharge.rate * 100 : 0,

    metering: dcdaCharge ? dcdaCharge.costPence / 100 : 0,
    transportation: 0,
    kwhFactor: 0,
  };

  return record;
}
