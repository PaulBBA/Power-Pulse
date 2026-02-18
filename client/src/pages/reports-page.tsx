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
import * as XLSX from "xlsx";

type ScopeLevel = "group" | "site" | "meter";

interface ScopeSelection {
  level: ScopeLevel;
  groupId: number | null;
  siteId: number | null;
  meterId: number | null;
}

interface ReportRow {
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

const REPORT_TYPES = [
  { id: "site-details", name: "Site and Data Set Details", description: "Lists all sites and meters within the selected scope, including utility type, supplier, and meter references." },
];

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
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportGroupId, setReportGroupId] = useState<number | null>(null);

  const { data: hierarchy, isLoading: hierarchyLoading } = useQuery<{
    groups: any[];
    unassigned: any[];
  }>({
    queryKey: ["/api/groups/hierarchy"],
  });

  const groups = useMemo(() => {
    return (hierarchy?.groups || []).filter((g: any) => g.sites && g.sites.length > 0);
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

  const { data: reportData, isLoading: reportLoading } = useQuery<{
    groupName: string;
    rows: ReportRow[];
    count: number;
  }>({
    queryKey: ["/api/reports/site-details", reportGroupId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/site-details/${reportGroupId}`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: reportGenerated && !!reportGroupId && selectedReport === "site-details",
  });

  const handleGenerate = () => {
    if (!canGenerate) return;
    setReportGroupId(scope.groupId);
    setReportGenerated(true);
  };

  const downloadExcel = useCallback(() => {
    if (!reportData?.rows?.length) return;

    const headers = [
      "Name", "Address 1", "Town", "Post Code", "Utility", "Supplier",
      "M1 Meter Serial", "M1 MPAN / MPR / Water SPID",
      "M1 MPAN Profile / Sewerage SPID", "Electricity Capacity kVA",
    ];

    const dataRows = reportData.rows.map(r => [
      r.siteName, r.address1, r.town, r.postCode, r.utility, r.supplier,
      r.meterSerial, r.mpanCoreMprn, r.mpanProfile, r.kva,
    ]);

    const wsData = [
      ["Site and Data Set Details Report"],
      [],
      headers,
      ...dataRows,
      [reportData.rows.length],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [30, 35, 15, 10, 12, 12, 18, 20, 22, 12];
    ws["!cols"] = colWidths.map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet");
    XLSX.writeFile(wb, `Site_Details_${reportData.groupName || "Report"}.xlsx`);
  }, [reportData]);

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
                <Button
                  variant={scope.level === "group" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleScopeLevel("group")}
                  data-testid="btn-scope-group"
                >
                  <Building2 className="h-4 w-4 mr-1.5" />
                  Group
                </Button>
                <Button
                  variant={scope.level === "site" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleScopeLevel("site")}
                  data-testid="btn-scope-site"
                >
                  <MapPin className="h-4 w-4 mr-1.5" />
                  Site
                </Button>
                <Button
                  variant={scope.level === "meter" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleScopeLevel("meter")}
                  data-testid="btn-scope-meter"
                >
                  <Gauge className="h-4 w-4 mr-1.5" />
                  Meter
                </Button>
              </div>

              {hierarchyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Group</Label>
                    <Select
                      value={scope.groupId?.toString() || ""}
                      onValueChange={handleGroupChange}
                    >
                      <SelectTrigger data-testid="select-group">
                        <SelectValue placeholder="Select a group..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {groups.map((g: any) => (
                          <SelectItem key={g.id} value={g.id.toString()}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(scope.level === "site" || scope.level === "meter") && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Site</Label>
                      <Select
                        value={scope.siteId?.toString() || ""}
                        onValueChange={handleSiteChange}
                        disabled={!scope.groupId}
                      >
                        <SelectTrigger data-testid="select-site">
                          <SelectValue placeholder={scope.groupId ? "Select a site..." : "Select a group first"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {sitesForGroup.map((s: any) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scope.level === "meter" && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Meter</Label>
                      <Select
                        value={scope.meterId?.toString() || ""}
                        onValueChange={handleMeterChange}
                        disabled={!scope.siteId}
                      >
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
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    data-testid="input-date-from"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    data-testid="input-date-to"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium mb-2 block">Report Type</Label>
              <div className="max-w-md">
                <Select
                  value={selectedReport}
                  onValueChange={(val) => { setSelectedReport(val); setReportGenerated(false); }}
                >
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue placeholder="Select a report..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(rt => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedReport && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {REPORT_TYPES.find(rt => rt.id === selectedReport)?.description}
                  </p>
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
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  data-testid="btn-generate-report"
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  Generate Report
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

      {reportLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Generating report...
        </div>
      )}

      {reportGenerated && reportData && !reportLoading && selectedReport === "site-details" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold" data-testid="text-report-title">
                  Site and Data Set Details Report
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />
                    {reportData.groupName}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-2">
                    {reportData.count} record{reportData.count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadExcel}
                data-testid="btn-download-report"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download Excel
              </Button>
            </div>

            <Separator className="mb-4" />

            {reportData.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sites or meters found in this group.
              </p>
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
                    {reportData.rows.map((row, idx) => (
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

            <div className="mt-3 text-xs text-muted-foreground text-right">
              Total records: {reportData.count}
            </div>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}
