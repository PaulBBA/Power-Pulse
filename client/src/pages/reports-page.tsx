import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, Building2, MapPin, Gauge, ChevronRight, Calendar, Loader2, Download, Play,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

type ScopeLevel = "group" | "site" | "meter";

interface ScopeSelection {
  level: ScopeLevel;
  groupId: number | null;
  siteId: number | null;
  meterId: number | null;
}

interface SiteDetailRow {
  siteName: string;
  address1: string;
  town: string;
  postCode: string;
  utility: string;
  supplier: string;
  meterSerial: string;
  mpanCoreMprn: string;
  mpanProfile: string;
  kva: number;
}

interface MonthlyData {
  month: string;
  kwh: number;
  cost: number;
}

interface UtilityTotals {
  utilityType: string;
  monthly: MonthlyData[];
  totalKwh: number;
  totalCost: number;
}

const REPORT_TYPES = [
  { id: "best-of-data", name: "Best of Data", description: "Monthly kWh breakdown by data source (Profile, Invoice, Direct) with configurable priority order. Shows where data comes from and what is missing." },
  { id: "site-details", name: "Site and Data Set Details", description: "Lists all sites and meters within the selected scope, including utility type, supplier, and meter references." },
  { id: "simple-totals", name: "Simple Totals", description: "Monthly kWh and cost totals by utility type with bar charts, for the selected scope and date range." },
];

const PRIORITY_OPTIONS = [
  { id: "Invoice,Direct,Profile", label: "Invoice, Direct, Profile" },
  { id: "Invoice,Profile,Direct", label: "Invoice, Profile, Direct" },
  { id: "Direct,Invoice,Profile", label: "Direct, Invoice, Profile" },
  { id: "Direct,Profile,Invoice", label: "Direct, Profile, Invoice" },
  { id: "Profile,Invoice,Direct", label: "Profile, Invoice, Direct" },
  { id: "Profile,Direct,Invoice", label: "Profile, Direct, Invoice" },
];

interface BodMeter {
  meterId: number;
  siteName: string;
  code: string;
  referenceNumber: string;
  supplier: string;
  mpanCore: string;
  mpanProfile: string;
  utilityType: string;
  totalKwh: number;
  profilePct: number;
  invoicePct: number;
  directPct: number;
  noDataPct: number;
  monthly: {
    month: string;
    profile: number;
    invoice: number;
    direct: number;
    total: number;
    noDataPct: number;
  }[];
}

interface BodData {
  meters: BodMeter[];
  months: string[];
  grandTotals: { month: string; total: number }[];
}

const UTILITY_COLORS: Record<string, string> = {
  "Electricity": "#3b82f6",
  "Gas": "#f59e0b",
  "Water": "#06b6d4",
  "Oil": "#8b5cf6",
  "Solid Fuel": "#ef4444",
};

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return monthNames[parseInt(month) - 1] || month;
}

function formatMonthFull(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return monthNames[parseInt(month) - 1] || month;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function yearLabel(dateFrom: string, dateTo: string): string {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  return `${from.getFullYear()}-${to.getFullYear()}`;
}

export default function ReportsPage() {
  const defaultEnd = endOfMonth(subMonths(new Date(), 1));
  const defaultStart = startOfMonth(subMonths(new Date(), 12));

  const [scope, setScope] = useState<ScopeSelection>({
    level: "group",
    groupId: null,
    siteId: null,
    meterId: null,
  });
  const [dateFrom, setDateFrom] = useState(format(defaultStart, "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(defaultEnd, "yyyy-MM-dd"));
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [priorityOrder, setPriorityOrder] = useState<string>("Profile,Invoice,Direct");
  const [bodUtilityFilter, setBodUtilityFilter] = useState<string>("all");
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportParams, setReportParams] = useState<{
    report: string;
    scope: ScopeSelection;
    dateFrom: string;
    dateTo: string;
    priority?: string;
    utilityFilter?: string;
  } | null>(null);

  const { data: hierarchy, isLoading: hierarchyLoading } = useQuery<{
    groups: any[];
    unassigned: any[];
  }>({
    queryKey: ["/api/groups/hierarchy"],
  });

  const groups = useMemo(() => {
    return (hierarchy?.groups || []).filter((g: any) => g.sites && g.sites.length > 0).sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
  }, [hierarchy]);

  const sitesForGroup = useMemo(() => {
    if (!scope.groupId) return [];
    const group = groups.find((g: any) => g.id === scope.groupId);
    return group?.sites || [];
  }, [groups, scope.groupId]);

  const metersForSite = useMemo(() => {
    if (!scope.siteId) return [];
    const site = sitesForGroup.find((s: any) => s.id === scope.siteId);
    return site?.meters || [];
  }, [sitesForGroup, scope.siteId]);

  const selectedGroupName = useMemo(() => {
    if (!scope.groupId) return null;
    return groups.find((g: any) => g.id === scope.groupId)?.name || null;
  }, [groups, scope.groupId]);

  const selectedSiteName = useMemo(() => {
    if (!scope.siteId) return null;
    return sitesForGroup.find((s: any) => s.id === scope.siteId)?.name || null;
  }, [sitesForGroup, scope.siteId]);

  const selectedMeterName = useMemo(() => {
    if (!scope.meterId) return null;
    const m = metersForSite.find((m: any) => m.id === scope.meterId);
    if (!m) return null;
    return m.mpanCoreMprn || m.meterSerial1 || `Meter ${m.id}`;
  }, [metersForSite, scope.meterId]);

  const handleScopeLevel = (level: ScopeLevel) => {
    setScope({ level, groupId: scope.groupId, siteId: level === "group" ? null : scope.siteId, meterId: level === "meter" ? scope.meterId : null });
    setReportGenerated(false);
  };

  const handleGroupChange = (val: string) => {
    setScope({ ...scope, groupId: parseInt(val), siteId: null, meterId: null });
    setReportGenerated(false);
  };

  const handleSiteChange = (val: string) => {
    setScope({ ...scope, siteId: parseInt(val), meterId: null });
    setReportGenerated(false);
  };

  const handleMeterChange = (val: string) => {
    setScope({ ...scope, meterId: parseInt(val) });
    setReportGenerated(false);
  };

  const isSelectionComplete = useMemo(() => {
    if (scope.level === "group") return scope.groupId !== null;
    if (scope.level === "site") return scope.siteId !== null;
    if (scope.level === "meter") return scope.meterId !== null;
    return false;
  }, [scope]);

  const canGenerate = isSelectionComplete && !!selectedReport;

  const scopeSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedGroupName) parts.push(selectedGroupName);
    if (scope.level !== "group" && selectedSiteName) parts.push(selectedSiteName);
    if (scope.level === "meter" && selectedMeterName) parts.push(selectedMeterName);
    return parts.join(" > ");
  }, [scope.level, selectedGroupName, selectedSiteName, selectedMeterName]);

  const { data: siteDetailData, isLoading: siteDetailLoading } = useQuery<{
    groupName: string;
    rows: SiteDetailRow[];
    count: number;
  }>({
    queryKey: ["/api/reports/site-details", reportParams?.scope.groupId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/site-details/${reportParams!.scope.groupId}`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: reportGenerated && reportParams?.report === "site-details" && !!reportParams?.scope.groupId,
  });

  const { data: simpleTotalsData, isLoading: simpleTotalsLoading } = useQuery<{
    utilities: UtilityTotals[];
  }>({
    queryKey: ["/api/reports/simple-totals", reportParams?.scope, reportParams?.dateFrom, reportParams?.dateTo],
    queryFn: async () => {
      const p = reportParams!;
      const params = new URLSearchParams({
        level: p.scope.level,
        dateFrom: p.dateFrom,
        dateTo: p.dateTo,
      });
      if (p.scope.groupId) params.set("groupId", p.scope.groupId.toString());
      if (p.scope.siteId) params.set("siteId", p.scope.siteId.toString());
      if (p.scope.meterId) params.set("meterId", p.scope.meterId.toString());
      const res = await fetch(`/api/reports/simple-totals?${params}`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: reportGenerated && reportParams?.report === "simple-totals",
  });

  const { data: bodData, isLoading: bodLoading } = useQuery<BodData>({
    queryKey: ["/api/reports/best-of-data", reportParams?.scope, reportParams?.dateFrom, reportParams?.dateTo, reportParams?.priority, reportParams?.utilityFilter],
    queryFn: async () => {
      const p = reportParams!;
      const params = new URLSearchParams({
        level: p.scope.level,
        dateFrom: p.dateFrom,
        dateTo: p.dateTo,
        priority: p.priority || "Profile,Invoice,Direct",
      });
      if (p.scope.groupId) params.set("groupId", p.scope.groupId.toString());
      if (p.scope.siteId) params.set("siteId", p.scope.siteId.toString());
      if (p.scope.meterId) params.set("meterId", p.scope.meterId.toString());
      if (p.utilityFilter && p.utilityFilter !== "all") params.set("utilityType", p.utilityFilter);
      const res = await fetch(`/api/reports/best-of-data?${params}`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: reportGenerated && reportParams?.report === "best-of-data",
  });

  const handleGenerate = () => {
    if (!canGenerate) return;
    setReportParams({
      report: selectedReport,
      scope: { ...scope },
      dateFrom,
      dateTo,
      priority: priorityOrder,
      utilityFilter: bodUtilityFilter,
    });
    setReportGenerated(true);
  };

  const isLoading = (reportParams?.report === "site-details" && siteDetailLoading) ||
    (reportParams?.report === "simple-totals" && simpleTotalsLoading) ||
    (reportParams?.report === "best-of-data" && bodLoading);

  const downloadSiteDetailsExcel = useCallback(() => {
    if (!siteDetailData?.rows?.length) return;
    const headers = [
      "Name", "Address 1", "Town", "Post Code", "Utility", "Supplier",
      "M1 Meter Serial", "M1 MPAN / MPR / Water SPID",
      "M1 MPAN Profile / Sewerage SPID", "Electricity Capacity kVA",
    ];
    const dataRows = siteDetailData.rows.map(r => [
      r.siteName, r.address1, r.town, r.postCode, r.utility, r.supplier,
      r.meterSerial, r.mpanCoreMprn, r.mpanProfile, r.kva,
    ]);
    const wsData = [["Site and Data Set Details Report"], [], headers, ...dataRows, [siteDetailData.rows.length]];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [30, 35, 15, 10, 12, 12, 18, 20, 22, 12].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet");
    XLSX.writeFile(wb, `Site_Details_${siteDetailData.groupName || "Report"}.xlsx`);
  }, [siteDetailData]);

  const downloadSimpleTotalsExcel = useCallback(() => {
    if (!simpleTotalsData?.utilities?.length || !reportParams) return;
    const label = yearLabel(reportParams.dateFrom, reportParams.dateTo);
    const wb = XLSX.utils.book_new();

    for (const util of simpleTotalsData.utilities) {
      const wsData: any[][] = [
        [`${util.utilityType} - Simple Totals Report`],
        [],
        ["Month", `${label} kWh`, `${label} Cost`],
      ];
      for (const m of util.monthly) {
        wsData.push([formatMonthFull(m.month), m.kwh, m.cost]);
      }
      wsData.push(["Total", util.totalKwh, util.totalCost]);
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws, util.utilityType);
    }

    XLSX.writeFile(wb, `Simple_Totals_${scopeSummary.replace(/[^a-zA-Z0-9]/g, "_") || "Report"}.xlsx`);
  }, [simpleTotalsData, reportParams, scopeSummary]);

  const downloadBodExcel = useCallback(async () => {
    if (!bodData?.meters?.length || !reportParams) return;
    const ExcelJS = (await import("exceljs")).default;
    const months = bodData.months;
    const fromDate = new Date(reportParams.dateFrom);
    const toDate = new Date(reportParams.dateTo);
    const fromStr = `${String(fromDate.getDate()).padStart(2, "0")}/${String(fromDate.getMonth() + 1).padStart(2, "0")}/${fromDate.getFullYear()}`;
    const toStr = `${String(toDate.getDate()).padStart(2, "0")}/${String(toDate.getMonth() + 1).padStart(2, "0")}/${toDate.getFullYear()}`;
    const utilLabel = reportParams.utilityFilter && reportParams.utilityFilter !== "all"
      ? `${reportParams.utilityFilter.charAt(0).toUpperCase() + reportParams.utilityFilter.slice(1)} `
      : "";
    const totalCols = 13 + months.length;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sheet");

    const titleRow = ws.addRow([`${utilLabel}Best of Data by Month with Breakdown for ${fromStr} to ${toStr}`]);
    ws.mergeCells(1, 1, 1, totalCols);
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2B579A" } };
    titleRow.getCell(1).alignment = { horizontal: "center" };
    titleRow.height = 28;

    ws.addRow([]);

    const monthHeaders = months.map(m => {
      const [y, mo] = m.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[parseInt(mo) - 1]} ${y.slice(2)}`;
    });
    const headerValues = [
      "Site Name", "Utility", "Code", "Reference Number", "Supplier",
      "MPAN / MPRN / SPID", "Profile / Sewerage",
      "Total kWh", "Profile %", "Invoice %", "Direct %", "No Data %", "Row Showing",
      ...monthHeaders,
    ];
    const headerRow = ws.addRow(headerValues);
    const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF4472C4" } };
    const headerFont = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    const headerBorder = {
      bottom: { style: "medium" as const, color: { argb: "FF2B579A" } },
    };
    headerRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.border = headerBorder;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    headerRow.height = 24;

    const thinBorder = {
      left: { style: "thin" as const, color: { argb: "FFD0D0D0" } },
      right: { style: "thin" as const, color: { argb: "FFD0D0D0" } },
      bottom: { style: "thin" as const, color: { argb: "FFD0D0D0" } },
    };

    const rowStyles: Record<string, { fill: any; font: any }> = {
      "Profile": {
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } },
        font: { size: 9, color: { argb: "FF1F4E79" } },
      },
      "Invoice": {
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } },
        font: { size: 9, color: { argb: "FF7F6000" } },
      },
      "Direct": {
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } },
        font: { size: 9, color: { argb: "FF375623" } },
      },
      "Total": {
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E2F3" } },
        font: { bold: true, size: 10, color: { argb: "FF1F3864" } },
      },
      "No Data (%)": {
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4EC" } },
        font: { size: 9, color: { argb: "FFC00000" } },
      },
    };

    const numFmt = "#,##0.00";
    const pctFmt = "0.00";

    for (const meter of bodData.meters) {
      const sourceRows = [
        { label: "Profile", vals: meter.monthly.map(mm => mm.profile) },
        { label: "Invoice", vals: meter.monthly.map(mm => mm.invoice) },
        { label: "Direct", vals: meter.monthly.map(mm => mm.direct) },
        { label: "Total", vals: meter.monthly.map(mm => mm.total) },
        { label: "No Data (%)", vals: meter.monthly.map(mm => mm.noDataPct) },
      ];

      sourceRows.forEach((sr, rIdx) => {
        const isFirst = rIdx === 0;
        const rowData = isFirst
          ? [
              meter.siteName, meter.utilityType, meter.code, meter.referenceNumber, meter.supplier,
              meter.mpanCore, meter.mpanProfile, meter.totalKwh,
              meter.profilePct, meter.invoicePct, meter.directPct, meter.noDataPct,
              sr.label, ...sr.vals,
            ]
          : [
              null, null, null, null, null, null, null, null, null, null, null, null,
              sr.label, ...sr.vals,
            ];

        const row = ws.addRow(rowData);
        const style = rowStyles[sr.label];

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.fill = style.fill;
          cell.font = style.font;
          cell.border = thinBorder;
          if (colNumber >= 8 && colNumber <= 12) {
            cell.numFmt = colNumber === 8 ? numFmt : pctFmt;
            cell.alignment = { horizontal: "right" };
          }
          if (colNumber === 13) {
            cell.font = { ...style.font, bold: true };
            cell.alignment = { horizontal: "left" };
          }
          if (colNumber >= 14) {
            cell.numFmt = sr.label === "No Data (%)" ? "0" : numFmt;
            cell.alignment = { horizontal: "right" };
          }
        });

        if (isFirst) {
          row.getCell(1).font = { ...style.font, bold: true };
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= 7) {
              cell.border = {
                ...thinBorder,
                top: { style: "medium", color: { argb: "FF4472C4" } },
              };
            }
          });
        }
      });
    }

    ws.addRow([]);

    const grandTotal = bodData.grandTotals.reduce((s, gt) => s + gt.total, 0);
    const gtValues: (string | number | null)[] = Array(13).fill(null);
    gtValues[0] = "Grand Total";
    const gtRow = ws.addRow([...gtValues, ...bodData.grandTotals.map(gt => gt.total), grandTotal]);
    const gtFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF2B579A" } };
    const gtFont = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    ws.mergeCells(gtRow.number, 1, gtRow.number, 13);
    gtRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = gtFill;
      cell.font = gtFont;
      cell.border = { top: { style: "medium", color: { argb: "FF1F3864" } } };
      if (colNumber >= 14) {
        cell.numFmt = numFmt;
        cell.alignment = { horizontal: "right" };
      }
      if (colNumber === 1) {
        cell.alignment = { horizontal: "right" };
      }
    });
    gtRow.height = 22;

    ws.columns = [
      { width: 32 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 18 }, { width: 16 },
      { width: 14 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 14 },
      ...months.map(() => ({ width: 14 })),
      ...(months.length > 0 ? [{ width: 16 }] : []),
    ];

    ws.views = [{ state: "frozen", xSplit: 0, ySplit: 3 }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Best_of_Data_${scopeSummary.replace(/[^a-zA-Z0-9]/g, "_") || "Report"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [bodData, reportParams, scopeSummary]);

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-2">
        <FileText className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-reports-title">Reports</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Generate reports by selecting a scope and date range below.</p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">Report Scope</Label>
              <div className="flex items-center gap-1 mb-4" data-testid="scope-level-selector">
                <Button variant={scope.level === "group" ? "default" : "outline"} size="sm" onClick={() => handleScopeLevel("group")} data-testid="btn-scope-group">
                  <Building2 className="h-4 w-4 mr-1.5" />Group
                </Button>
                <Button variant={scope.level === "site" ? "default" : "outline"} size="sm" onClick={() => handleScopeLevel("site")} data-testid="btn-scope-site">
                  <MapPin className="h-4 w-4 mr-1.5" />Site
                </Button>
                <Button variant={scope.level === "meter" ? "default" : "outline"} size="sm" onClick={() => handleScopeLevel("meter")} data-testid="btn-scope-meter">
                  <Gauge className="h-4 w-4 mr-1.5" />Meter
                </Button>
              </div>

              {hierarchyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />Loading...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Group</Label>
                    <Select value={scope.groupId?.toString() || ""} onValueChange={handleGroupChange}>
                      <SelectTrigger data-testid="select-group">
                        <SelectValue placeholder="Select a group..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {groups.map((g: any) => (
                          <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(scope.level === "site" || scope.level === "meter") && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Site</Label>
                      <Select value={scope.siteId?.toString() || ""} onValueChange={handleSiteChange} disabled={!scope.groupId}>
                        <SelectTrigger data-testid="select-site">
                          <SelectValue placeholder={scope.groupId ? "Select a site..." : "Select a group first"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {sitesForGroup.map((s: any) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scope.level === "meter" && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Meter</Label>
                      <Select value={scope.meterId?.toString() || ""} onValueChange={handleMeterChange} disabled={!scope.siteId}>
                        <SelectTrigger data-testid="select-meter">
                          <SelectValue placeholder={scope.siteId ? "Select a meter..." : "Select a site first"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {metersForSite.map((m: any) => (
                            <SelectItem key={m.id} value={m.id.toString()}>
                              {m.mpanCoreMprn || m.meterSerial1 || `Meter ${m.id}`}
                              {m.utilityName ? ` (${m.utilityName})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium mb-2 block">Date Range</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="input-date-from" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="input-date-to" />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium mb-2 block">Report Type</Label>
              <div className="max-w-md">
                <Select value={selectedReport} onValueChange={(val) => { setSelectedReport(val); setReportGenerated(false); }}>
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue placeholder="Select a report..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(rt => (
                      <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedReport && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {REPORT_TYPES.find(rt => rt.id === selectedReport)?.description}
                  </p>
                )}
                {selectedReport === "best-of-data" && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Utility Type</Label>
                      <Select value={bodUtilityFilter} onValueChange={(val) => { setBodUtilityFilter(val); setReportGenerated(false); }}>
                        <SelectTrigger data-testid="select-bod-utility">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Utilities</SelectItem>
                          <SelectItem value="electricity">Electricity</SelectItem>
                          <SelectItem value="gas">Gas</SelectItem>
                          <SelectItem value="water">Water</SelectItem>
                          <SelectItem value="oil">Oil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Processing Priority Order</Label>
                      <Select value={priorityOrder} onValueChange={(val) => { setPriorityOrder(val); setReportGenerated(false); }}>
                        <SelectTrigger data-testid="select-priority-order">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map(po => (
                            <SelectItem key={po.id} value={po.id}>{po.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        First source with data for each day wins. For example, "Profile, Invoice, Direct" means profile data is preferred, then invoice, then direct readings.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {isSelectionComplete && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Selected scope:</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {scope.level === "group" && <Building2 className="h-3 w-3 mr-1" />}
                      {scope.level === "site" && <MapPin className="h-3 w-3 mr-1" />}
                      {scope.level === "meter" && <Gauge className="h-3 w-3 mr-1" />}
                      {scope.level.charAt(0).toUpperCase() + scope.level.slice(1)}
                    </Badge>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium" data-testid="text-scope-summary">{scopeSummary}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {dateFrom} to {dateTo}
                  </p>
                </div>
                <Button onClick={handleGenerate} disabled={!canGenerate} data-testid="btn-generate-report">
                  <Play className="h-4 w-4 mr-1.5" />Generate Report
                </Button>
              </div>
            )}

            {!isSelectionComplete && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Please select a {scope.level} to continue.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />Generating report...
        </div>
      )}

      {reportGenerated && reportParams?.report === "site-details" && siteDetailData && !siteDetailLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold" data-testid="text-report-title">Site and Data Set Details Report</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />{siteDetailData.groupName}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-2">
                    {siteDetailData.count} record{siteDetailData.count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadSiteDetailsExcel} data-testid="btn-download-report">
                <Download className="h-4 w-4 mr-1.5" />Download Excel
              </Button>
            </div>
            <Separator className="mb-4" />
            {siteDetailData.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sites or meters found in this group.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="table-site-details">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Name</TableHead>
                      <TableHead className="whitespace-nowrap">Address 1</TableHead>
                      <TableHead className="whitespace-nowrap">Town</TableHead>
                      <TableHead className="whitespace-nowrap">Post Code</TableHead>
                      <TableHead className="whitespace-nowrap">Utility</TableHead>
                      <TableHead className="whitespace-nowrap">Supplier</TableHead>
                      <TableHead className="whitespace-nowrap">M1 Meter Serial</TableHead>
                      <TableHead className="whitespace-nowrap">M1 MPAN / MPR / Water SPID</TableHead>
                      <TableHead className="whitespace-nowrap">M1 MPAN Profile / Sewerage SPID</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Electricity Capacity kVA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteDetailData.rows.map((row, idx) => (
                      <TableRow key={idx} data-testid={`row-site-detail-${idx}`}>
                        <TableCell className="font-medium whitespace-nowrap">{row.siteName}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.address1}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.town}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.postCode}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.utility}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.supplier}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{row.meterSerial}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{row.mpanCoreMprn}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{row.mpanProfile}</TableCell>
                        <TableCell className="text-right">{row.kva || ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground text-right">Total records: {siteDetailData.count}</div>
          </CardContent>
        </Card>
      )}

      {reportGenerated && reportParams?.report === "simple-totals" && simpleTotalsData && !simpleTotalsLoading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" data-testid="text-report-title">Simple Totals Report</h2>
            <Button variant="outline" size="sm" onClick={downloadSimpleTotalsExcel} data-testid="btn-download-report">
              <Download className="h-4 w-4 mr-1.5" />Download Excel
            </Button>
          </div>

          {simpleTotalsData.utilities.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground text-center">No data found for the selected scope and date range.</p>
              </CardContent>
            </Card>
          ) : (
            simpleTotalsData.utilities.map(util => {
              const color = UTILITY_COLORS[util.utilityType] || "#6b7280";
              const label = reportParams ? yearLabel(reportParams.dateFrom, reportParams.dateTo) : "";
              return (
                <Card key={util.utilityType} data-testid={`card-utility-${util.utilityType.toLowerCase()}`}>
                  <CardContent className="pt-6">
                    <h3 className="text-base font-semibold mb-4">{util.utilityType}</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={util.monthly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatNumber(v)} />
                            <Tooltip
                              formatter={(value: number) => [formatNumber(value), "kWh"]}
                              labelFormatter={(label: string) => formatMonthFull(label)}
                            />
                            <Legend />
                            <Bar dataKey="kwh" name={label} fill={color} radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Month</TableHead>
                              <TableHead className="text-right">{label}<br />kWh</TableHead>
                              <TableHead className="text-right">{label}<br />Cost (&pound;)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {util.monthly.map((m, i) => (
                              <TableRow key={m.month} className={i % 2 === 0 ? "bg-muted/30" : ""} data-testid={`row-total-${util.utilityType.toLowerCase()}-${i}`}>
                                <TableCell>{formatMonthFull(m.month)}</TableCell>
                                <TableCell className="text-right">{formatNumber(m.kwh)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(m.cost)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-semibold border-t-2">
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right">{formatNumber(util.totalKwh)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(util.totalCost)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
      {reportGenerated && reportParams?.report === "best-of-data" && bodData && !bodLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold" data-testid="text-report-title">
                {reportParams.utilityFilter && reportParams.utilityFilter !== "all"
                  ? `${reportParams.utilityFilter.charAt(0).toUpperCase() + reportParams.utilityFilter.slice(1)} `
                  : ""}Best of Data Report
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Priority: {reportParams.priority?.split(",").join(" > ")} | {bodData.meters.length} meter{bodData.meters.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadBodExcel} data-testid="btn-download-report">
              <Download className="h-4 w-4 mr-1.5" />Download Excel
            </Button>
          </div>

          {bodData.meters.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground text-center">No data found for the selected scope and date range.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4 pb-2 px-2">
                <div className="overflow-x-auto">
                  <Table data-testid="table-best-of-data" className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap text-xs px-2">Site Name</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2">Utility</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2">Code</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2">Ref</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2">Supplier</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2">MPAN / MPRN / SPID</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2">Profile / Sewerage</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2 text-right">Total kWh</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2 text-right">Profile %</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2 text-right">Invoice %</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2 text-right">Direct %</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2 text-right">No Data %</TableHead>
                        <TableHead className="whitespace-nowrap text-xs px-2">Source</TableHead>
                        {bodData.months.map(m => (
                          <TableHead key={m} className="whitespace-nowrap text-xs px-2 text-right">{formatMonth(m)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bodData.meters.map((meter, mIdx) => {
                        const rows = ["Profile", "Invoice", "Direct", "Total", "No Data (%)"];
                        const rowColors: Record<string, string> = {
                          "Profile": "bg-blue-50 dark:bg-blue-950/30",
                          "Invoice": "bg-amber-50 dark:bg-amber-950/30",
                          "Direct": "bg-green-50 dark:bg-green-950/30",
                          "Total": "bg-gray-100 dark:bg-gray-800 font-semibold",
                          "No Data (%)": "bg-red-50 dark:bg-red-950/20",
                        };
                        return rows.map((rowType, rIdx) => (
                          <TableRow
                            key={`${meter.meterId}-${rowType}`}
                            className={`${rowColors[rowType] || ""} ${rIdx === 0 ? "border-t-2 border-gray-300 dark:border-gray-600" : ""}`}
                            data-testid={`row-bod-${meter.meterId}-${rowType.toLowerCase().replace(/[^a-z]/g, "")}`}
                          >
                            {rIdx === 0 ? (
                              <>
                                <TableCell className="whitespace-nowrap px-2 font-medium">{meter.siteName}</TableCell>
                                <TableCell className="whitespace-nowrap px-2">{meter.utilityType}</TableCell>
                                <TableCell className="whitespace-nowrap px-2 font-mono">{meter.code}</TableCell>
                                <TableCell className="whitespace-nowrap px-2 font-mono">{meter.referenceNumber}</TableCell>
                                <TableCell className="whitespace-nowrap px-2">{meter.supplier}</TableCell>
                                <TableCell className="whitespace-nowrap px-2 font-mono">{meter.mpanCore}</TableCell>
                                <TableCell className="whitespace-nowrap px-2 font-mono">{meter.mpanProfile}</TableCell>
                                <TableCell className="whitespace-nowrap px-2 text-right font-semibold">{formatNumber(meter.totalKwh)}</TableCell>
                                <TableCell className="whitespace-nowrap px-2 text-right">{meter.profilePct.toFixed(1)}</TableCell>
                                <TableCell className="whitespace-nowrap px-2 text-right">{meter.invoicePct.toFixed(1)}</TableCell>
                                <TableCell className="whitespace-nowrap px-2 text-right">{meter.directPct.toFixed(1)}</TableCell>
                                <TableCell className="whitespace-nowrap px-2 text-right">{meter.noDataPct.toFixed(1)}</TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell colSpan={12} />
                              </>
                            )}
                            <TableCell className="whitespace-nowrap px-2 font-medium">{rowType}</TableCell>
                            {meter.monthly.map(mm => {
                              let val: number;
                              if (rowType === "Profile") val = mm.profile;
                              else if (rowType === "Invoice") val = mm.invoice;
                              else if (rowType === "Direct") val = mm.direct;
                              else if (rowType === "Total") val = mm.total;
                              else val = mm.noDataPct;

                              const isPercent = rowType === "No Data (%)";
                              const display = isPercent
                                ? (val > 0 ? `${val}%` : "")
                                : (val > 0 ? formatNumber(val) : "");

                              return (
                                <TableCell key={mm.month} className={`whitespace-nowrap px-2 text-right ${rowType === "Total" ? "font-semibold" : ""} ${isPercent && val > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                                  {display}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ));
                      })}
                      <TableRow className="border-t-4 border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-700 font-bold">
                        <TableCell colSpan={13} className="px-2 text-right">Grand Total</TableCell>
                        {bodData.grandTotals.map(gt => (
                          <TableCell key={gt.month} className="whitespace-nowrap px-2 text-right font-bold">{formatNumber(gt.total)}</TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </Layout>
  );
}
