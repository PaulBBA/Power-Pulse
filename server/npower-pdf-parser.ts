import { PDFParse } from "pdf-parse";

export interface NpowerMeterInvoice {
  mpan: string;
  meterSerial: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  dayKwh: number;
  nightKwh: number;
  totalKwh: number;
  dayRate: number;
  nightRate: number;
  dayCost: number;
  nightCost: number;
  wapDayCost: number;
  wapNightCost: number;
  wapDayRate: number;
  wapNightRate: number;
  totalConsumption: number;
  duos: number;
  tuos: number;
  bsuos: number;
  standingMetering: number;
  cm: number;
  nccs: number;
  nrab: number;
  ro: number;
  roRate: number;
  fit: number;
  fitRate: number;
  cfd: number;
  totalGovLevies: number;
  cclAmount: number;
  cclRate: number;
  totalExVat: number;
  maxDemandKw: number;
  maxDemandKva: number;
  reactivePowerCost: number;
  reactivePowerRate: number;
}

export interface NpowerInvoice {
  invoiceNumber: string;
  invoiceDate: Date | null;
  accountNumber: string;
  totalExVat: number;
  vatRate: number;
  vatAmount: number;
  invoiceTotal: number;
  meters: NpowerMeterInvoice[];
}

function parseUkDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  return null;
}

function parseMoney(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[£,]/g, "").trim();
  return parseFloat(cleaned) || 0;
}

function parseNumber(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[,]/g, "").trim();
  return parseFloat(cleaned) || 0;
}

export async function parseNpowerPDF(buffer: Buffer): Promise<NpowerInvoice> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await parser.getText();
  const text = textResult.text;
  await parser.destroy();

  const invoiceNumMatch = text.match(/Invoice number:\s*(IN\d+)/);
  const invoiceNumber = invoiceNumMatch ? invoiceNumMatch[1] : "";

  const invoiceDateMatch = text.match(/Invoice date:\s*(\d{1,2}\s+\w+\s+\d{4})/);
  let invoiceDate: Date | null = null;
  if (invoiceDateMatch) {
    const d = new Date(invoiceDateMatch[1]);
    if (!isNaN(d.getTime())) invoiceDate = d;
  }

  const accountMatch = text.match(/Account number:\s*(A\d+)/);
  const accountNumber = accountMatch ? accountMatch[1] : "";

  let invoicePeriodStart: Date | null = null;
  let invoicePeriodEnd: Date | null = null;
  const periodMatch = text.match(/Invoice period:\s*(\d{1,2}\s+\w+\s+\d{4})\s+to\s+(\d{1,2}\s+\w+\s+\d{4})/);
  if (periodMatch) {
    const s = new Date(periodMatch[1]);
    const e = new Date(periodMatch[2]);
    if (!isNaN(s.getTime())) invoicePeriodStart = s;
    if (!isNaN(e.getTime())) invoicePeriodEnd = e;
  }

  const totalExVatMatch = text.match(/Total charges excluding VAT\s+£?([\d,]+\.\d{2})/);
  const totalExVat = totalExVatMatch ? parseMoney(totalExVatMatch[1]) : 0;

  const vatMatch = text.match(/Standard VAT\s+([\d.]+)%\s+£?([\d,]+\.\d{2})\s+£?([\d,]+\.\d{2})/);
  const vatRate = vatMatch ? parseFloat(vatMatch[1]) : 20;
  const vatAmount = vatMatch ? parseMoney(vatMatch[3]) : 0;

  const invoiceTotalMatch = text.match(/Charges for period\s+£?([\d,]+\.\d{2})/);
  const invoiceTotal = invoiceTotalMatch ? parseMoney(invoiceTotalMatch[1]) : 0;

  const mpanPattern = /(?:Consumption details for MPAN|Breakdown of charges for MPAN)\s+(\d{13})/g;
  const mpans = new Set<string>();
  let match;
  while ((match = mpanPattern.exec(text)) !== null) {
    mpans.add(match[1]);
  }

  const meters: NpowerMeterInvoice[] = [];

  const mpanArray = Array.from(mpans);
  for (const mpan of mpanArray) {
    const meter = parseMeterSection(text, mpan, invoicePeriodStart, invoicePeriodEnd);
    meters.push(meter);
  }

  return {
    invoiceNumber,
    invoiceDate,
    accountNumber,
    totalExVat,
    vatRate,
    vatAmount,
    invoiceTotal,
    meters,
  };
}

function parseMeterSection(text: string, mpan: string, invoicePeriodStart: Date | null, invoicePeriodEnd: Date | null): NpowerMeterInvoice {
  const consumptionStart = text.indexOf(`Consumption details for MPAN ${mpan}`);
  const chargesStart = text.indexOf(`Breakdown of charges for MPAN ${mpan}`);

  const nextMpanAfterCharges = findNextMpanSection(text, chargesStart + 50);
  const sectionEnd = nextMpanAfterCharges > 0 ? nextMpanAfterCharges : text.length;

  const consumptionSection = consumptionStart >= 0 && chargesStart > consumptionStart
    ? text.substring(consumptionStart, chargesStart)
    : "";

  const chargesSection = chargesStart >= 0
    ? text.substring(chargesStart, sectionEnd)
    : "";

  const meterSerialMatch = consumptionSection.match(/([A-Z]\d{2}[A-Z]\d{4,5})/);
  const meterSerial = meterSerialMatch ? meterSerialMatch[1] : "";

  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  const meterReadingPattern = /[A-Z]\d{2}[A-Z]\d{4,5}\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/g;
  let readingMatch;
  while ((readingMatch = meterReadingPattern.exec(consumptionSection)) !== null) {
    const startDate = parseUkDate(readingMatch[1]);
    const endDate = parseUkDate(readingMatch[2]);
    if (startDate && (!periodStart || startDate < periodStart)) periodStart = startDate;
    if (endDate && (!periodEnd || endDate > periodEnd)) periodEnd = endDate;
  }
  if (!periodStart && invoicePeriodStart) periodStart = invoicePeriodStart;
  if (!periodEnd && invoicePeriodEnd) periodEnd = invoicePeriodEnd;

  let dayKwh = 0, nightKwh = 0, totalKwh = 0;
  let dayRate = 0, nightRate = 0, dayCost = 0, nightCost = 0;
  let wapDayCost = 0, wapNightCost = 0, wapDayRate = 0, wapNightRate = 0;
  let totalConsumption = 0;

  const totalKwhMatch = consumptionSection.match(/Total energy[\s\S]*?@ meter \(kWh\)[\s\S]*?([\d,]+\.\d{3})/);
  if (!totalKwhMatch) {
    const kwhLines = consumptionSection.match(/([A-Z]\d{2}[A-Z]\d{4,5})\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+([\d,]+\.\d{3})\s+([\d,]+\.\d{3})\s+([\d,]+\.\d{3})/g);
    if (kwhLines) {
      for (const line of kwhLines) {
        const parts = line.match(/([\d,]+\.\d{3})\s+([\d,]+\.\d{3})\s+([\d,]+\.\d{3})/);
        if (parts) {
          totalKwh += parseNumber(parts[3]);
        }
      }
    }
  }

  const consumptionCharges = extractConsumptionCharges(chargesSection);
  dayKwh = consumptionCharges.dayKwh;
  nightKwh = consumptionCharges.nightKwh;
  dayRate = consumptionCharges.dayRate;
  nightRate = consumptionCharges.nightRate;
  dayCost = consumptionCharges.dayCost;
  nightCost = consumptionCharges.nightCost;
  wapDayCost = consumptionCharges.wapDayCost;
  wapNightCost = consumptionCharges.wapNightCost;
  wapDayRate = consumptionCharges.wapDayRate;
  wapNightRate = consumptionCharges.wapNightRate;

  if (totalKwh === 0) totalKwh = dayKwh + nightKwh;

  const totalConsMatch = chargesSection.match(/Total consumption charges\s+£?([\d,]+\.\d{2})/);
  totalConsumption = totalConsMatch ? parseMoney(totalConsMatch[1]) : (dayCost + nightCost + wapDayCost + wapNightCost);

  const duosMatch = chargesSection.match(/Total DUoS charge\s+£?([\d,]+\.\d{2})/);
  const duos = duosMatch ? parseMoney(duosMatch[1]) : 0;

  const tuosMatch = chargesSection.match(/Total TNUoS charge\s+£?([\d,]+\.\d{2})/);
  const tuos = tuosMatch ? parseMoney(tuosMatch[1]) : 0;

  const bsuosMatch = chargesSection.match(/Total BSUoS charge\s+£?([\d,]+\.\d{2})/);
  const bsuos = bsuosMatch ? parseMoney(bsuosMatch[1]) : 0;

  const standingMatch = chargesSection.match(/Total standing and metering charge\s+£?([\d,]+\.\d{2})/);
  const standingMetering = standingMatch ? parseMoney(standingMatch[1]) : 0;

  const cmMatch = chargesSection.match(/Total CM charge\s+£?([\d,]+\.\d{2})/);
  const cm = cmMatch ? parseMoney(cmMatch[1]) : 0;

  const nccsMatch = chargesSection.match(/Total NCCS Charge\s+£?([\d,]+\.\d{2})/);
  const nccs = nccsMatch ? parseMoney(nccsMatch[1]) : 0;

  const nrabMatch = chargesSection.match(/Total NRAB Charge\s+£?([\d,]+\.\d{2})/);
  const nrab = nrabMatch ? parseMoney(nrabMatch[1]) : 0;

  const roMatch = chargesSection.match(/Total RO charge\s+£?([\d,]+\.\d{2})/);
  const ro = roMatch ? parseMoney(roMatch[1]) : 0;

  const roRateMatch = chargesSection.match(/RO Forecast Passthrough[\s\S]*?([\d.]+)\s*p\/kWh/);
  const roRate = roRateMatch ? parseFloat(roRateMatch[1]) : 0;

  const fitMatch = chargesSection.match(/Total FIT charge\s+£?([\d,]+\.\d{2})/);
  const fit = fitMatch ? parseMoney(fitMatch[1]) : 0;

  const fitRateMatch = chargesSection.match(/FIT Forecast Passthrough[\s\S]*?([\d.]+)\s*p\/kWh/);
  const fitRate = fitRateMatch ? parseFloat(fitRateMatch[1]) : 0;

  const cfdMatch = chargesSection.match(/Total CfD charge\s+£?([\d,]+\.\d{2})/);
  const cfd = cfdMatch ? parseMoney(cfdMatch[1]) : 0;

  const govLeviesMatch = chargesSection.match(/Total government and regulatory levies\s+£?([\d,]+\.\d{2})/);
  const totalGovLevies = govLeviesMatch ? parseMoney(govLeviesMatch[1]) : (cm + nccs + nrab + ro + fit + cfd);

  const cclAmountMatch = chargesSection.match(/Total CCL charges\s+£?([\d,]+\.\d{2})/);
  const cclAmount = cclAmountMatch ? parseMoney(cclAmountMatch[1]) : 0;

  const cclRateMatch = chargesSection.match(/Climate Change[\s\S]*?(\d+\.\d{5})\s*£\s*\/\s*kWh/);
  const cclRate = cclRateMatch ? parseFloat(cclRateMatch[1]) * 100 : 0;

  const totalExVatMatch = chargesSection.match(/Total charges for this meter point excluding VAT\s+£?([\d,]+\.\d{2})/);
  const totalExVat = totalExVatMatch ? parseMoney(totalExVatMatch[1]) : 0;

  const maxKwMatch = consumptionSection.match(/Maximum kW demand[\s\S]*?([\d,]+\.\d+)\s*kW/);
  const maxDemandKw = maxKwMatch ? parseNumber(maxKwMatch[1]) : 0;

  const maxKvaMatch = consumptionSection.match(/Maximum kVA demand[\s\S]*?([\d,]+\.\d+)\s*kVA/);
  const maxDemandKva = maxKvaMatch ? parseNumber(maxKvaMatch[1]) : 0;

  const reactiveMatch = chargesSection.match(/Reactive power charge[\s\S]*?([\d,]+\.\d+)\s*kVArh[\s\S]*?([\d.]+)\s*p\/kVArh[\s\S]*?£([\d,]+\.\d{2})/);
  const reactivePowerCost = reactiveMatch ? parseMoney(reactiveMatch[3]) : 0;
  const reactivePowerRate = reactiveMatch ? parseFloat(reactiveMatch[2]) : 0;

  return {
    mpan,
    meterSerial,
    periodStart,
    periodEnd,
    dayKwh,
    nightKwh,
    totalKwh,
    dayRate,
    nightRate,
    dayCost,
    nightCost,
    wapDayCost,
    wapNightCost,
    wapDayRate,
    wapNightRate,
    totalConsumption,
    duos,
    tuos,
    bsuos,
    standingMetering,
    cm,
    nccs,
    nrab,
    ro,
    roRate,
    fit,
    fitRate,
    cfd,
    totalGovLevies,
    cclAmount,
    cclRate,
    totalExVat,
    maxDemandKw,
    maxDemandKva,
    reactivePowerCost,
    reactivePowerRate,
  };
}

function extractConsumptionCharges(section: string) {
  let dayKwh = 0, nightKwh = 0;
  let dayRate = 0, nightRate = 0;
  let dayCost = 0, nightCost = 0;
  let wapDayCost = 0, wapNightCost = 0;
  let wapDayRate = 0, wapNightRate = 0;

  const consumptionEnd = section.indexOf("Total consumption charges");
  if (consumptionEnd < 0) return { dayKwh, nightKwh, dayRate, nightRate, dayCost, nightCost, wapDayCost, wapNightCost, wapDayRate, wapNightRate };

  const consumptionBlock = section.substring(0, consumptionEnd);

  const meterDayPattern = /Electricity consumption @[\s\S]*?Day[\s\S]*?(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.\d{3})\s*kWh\s+([\d.]+)\s*p\/kWh\s+STD\s+£([\d,]+\.\d{2})/g;
  const meterNightPattern = /Night\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.\d{3})\s*kWh\s+([\d.]+)\s*p\/kWh\s+STD\s+£([\d,]+\.\d{2})/g;

  let m;
  const wapStart = consumptionBlock.indexOf("Multi Purchase Charge");
  const meterBlock = wapStart > 0 ? consumptionBlock.substring(0, wapStart) : consumptionBlock;
  const wapBlock = wapStart > 0 ? consumptionBlock.substring(wapStart) : "";

  const dayEntries = meterBlock.match(/Day\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+([\d,]+\.\d{3})\s*kWh[\s\S]*?([\d.]+)\s*p\/kWh[\s\S]*?£([\d,]+\.\d{2})/g);
  if (dayEntries) {
    for (const entry of dayEntries) {
      const parts = entry.match(/([\d,]+\.\d{3})\s*kWh[\s\S]*?([\d.]+)\s*p\/kWh[\s\S]*?£([\d,]+\.\d{2})/);
      if (parts) {
        dayKwh += parseNumber(parts[1]);
        dayRate = parseFloat(parts[2]);
        dayCost += parseMoney(parts[3]);
      }
    }
  }

  const nightEntries = meterBlock.match(/Night\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+([\d,]+\.\d{3})\s*kWh[\s\S]*?([\d.]+)\s*p\/kWh[\s\S]*?£([\d,]+\.\d{2})/g);
  if (nightEntries) {
    for (const entry of nightEntries) {
      const parts = entry.match(/([\d,]+\.\d{3})\s*kWh[\s\S]*?([\d.]+)\s*p\/kWh[\s\S]*?£([\d,]+\.\d{2})/);
      if (parts) {
        nightKwh += parseNumber(parts[1]);
        nightRate = parseFloat(parts[2]);
        nightCost += parseMoney(parts[3]);
      }
    }
  }

  if (wapBlock) {
    const wapDayEntries = wapBlock.match(/Day\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+([\d,]+\.\d{3})\s*kWh[\s\S]*?([\d.]+)\s*p\/kWh[\s\S]*?£([\d,]+\.\d{2})/g);
    if (wapDayEntries) {
      for (const entry of wapDayEntries) {
        const parts = entry.match(/([\d,]+\.\d{3})\s*kWh[\s\S]*?([\d.]+)\s*p\/kWh[\s\S]*?£([\d,]+\.\d{2})/);
        if (parts) {
          wapDayRate = parseFloat(parts[2]);
          wapDayCost += parseMoney(parts[3]);
        }
      }
    }

    const wapNightEntries = wapBlock.match(/Night\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+([\d,]+\.\d{3})\s*kWh[\s\S]*?([\d.]+)\s*p\/kWh[\s\S]*?£([\d,]+\.\d{2})/g);
    if (wapNightEntries) {
      for (const entry of wapNightEntries) {
        const parts = entry.match(/([\d,]+\.\d{3})\s*kWh[\s\S]*?([\d.]+)\s*p\/kWh[\s\S]*?£([\d,]+\.\d{2})/);
        if (parts) {
          wapNightRate = parseFloat(parts[2]);
          wapNightCost += parseMoney(parts[3]);
        }
      }
    }
  }

  return { dayKwh, nightKwh, dayRate, nightRate, dayCost, nightCost, wapDayCost, wapNightCost, wapDayRate, wapNightRate };
}

function findNextMpanSection(text: string, fromIndex: number): number {
  const patterns = [
    /Consumption details for MPAN \d{13}/,
    /Your electricity invoice\s+Invoice date:/,
  ];

  let earliest = -1;
  for (const pattern of patterns) {
    const sub = text.substring(fromIndex);
    const m = sub.match(pattern);
    if (m && m.index !== undefined) {
      const pos = fromIndex + m.index;
      if (earliest < 0 || pos < earliest) earliest = pos;
    }
  }

  const totalChargesPattern = /Total charges for this meter point excluding VAT\s+£?[\d,]+\.\d{2}/;
  const sub = text.substring(fromIndex);
  const tcMatch = sub.match(totalChargesPattern);
  if (tcMatch && tcMatch.index !== undefined) {
    const endOfTotal = fromIndex + tcMatch.index + tcMatch[0].length;
    if (earliest < 0 || endOfTotal < earliest) {
      const afterTotal = text.indexOf("Your electricity invoice", endOfTotal);
      const afterConsumption = text.indexOf("Consumption details for MPAN", endOfTotal);
      if (afterTotal > 0 && (earliest < 0 || afterTotal < earliest)) earliest = afterTotal;
      if (afterConsumption > 0 && (earliest < 0 || afterConsumption < earliest)) earliest = afterConsumption;
    }
  }

  return earliest;
}

export function npowerInvoiceToDataRecord(
  invoice: NpowerInvoice,
  meter: NpowerMeterInvoice,
  dataSetId: number,
  username: string
): Record<string, any> {
  const vatForMeter = Math.round(meter.totalExVat * (invoice.vatRate / 100) * 1000) / 1000;
  const costIncVat = Math.round((meter.totalExVat + vatForMeter) * 100) / 100;

  const miscCost = Math.round((
    meter.wapDayCost + meter.wapNightCost +
    meter.standingMetering +
    meter.bsuos +
    meter.cm + meter.nccs + meter.nrab + meter.cfd
  ) * 100) / 100;

  let previousDate: Date | null = null;
  if (meter.periodStart) {
    previousDate = new Date(meter.periodStart);
    previousDate.setDate(previousDate.getDate() - 1);
  }

  return {
    dataSetId,
    utilityType: "electricity",
    date: meter.periodEnd,
    previousDate,
    direct: null,
    estimate: null,
    units: meter.totalKwh,
    cost: costIncVat,
    batch: 0,
    standingCharge: 0,
    standingChargeRate: 0,
    otherCharge: 0,
    vat: vatForMeter,
    ccl: meter.cclAmount,
    cclRate: meter.cclRate,
    invoiceNumber: invoice.invoiceNumber,
    supplierName: "npower",
    number: meter.mpan,
    locked: 0,
    passedToAccounts: 0,
    status: 0,
    datePaid: null,
    dateTaxPoint: invoice.invoiceDate,
    excludeFromReports: 0,
    lastUpdate: new Date(),
    lastUser: username,
    note: null,

    m1Units: meter.nightKwh,
    m1CostRate: meter.nightRate,
    m1Cost: meter.nightCost,
    m1Present: 0,
    m1Previous: 0,
    m1Factor: 1,

    m2Units: meter.dayKwh,
    m2CostRate: meter.dayRate,
    m2Cost: meter.dayCost,
    m2Present: 0,
    m2Previous: 0,
    m2Factor: 1,

    m3Present: 0, m3Previous: 0, m3Factor: 0, m3Units: 0, m3CostRate: 0, m3Cost: 0,
    m4Present: 0, m4Previous: 0, m4Factor: 0, m4Units: 0, m4CostRate: 0, m4Cost: 0,

    vatSplit: 0,
    vat1Percent: invoice.vatRate,
    vat1: vatForMeter,
    vat2Percent: 0,
    vat2: 0,

    duos: meter.duos,
    tuos: meter.tuos,
    roc: meter.ro,
    rocRate: meter.roRate,
    feedInCost: meter.fit,
    feedInCostRate: meter.fitRate,
    miscCost,
    flexiblePurchasing: 0,
    reactivePowerCost: meter.reactivePowerCost,
    reactivePowerCostRate: meter.reactivePowerRate,
  };
}
