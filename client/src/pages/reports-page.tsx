import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, Building2, MapPin, Gauge, ChevronRight, Loader2, Download,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";

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

export default function ReportsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const { data: hierarchy, isLoading: hierarchyLoading } = useQuery<{
    groups: any[];
    unassigned: any[];
  }>({
    queryKey: ["/api/groups/hierarchy"],
  });

  const groups = useMemo(() => {
    return (hierarchy?.groups || []).filter((g: any) => g.sites && g.sites.length > 0);
  }, [hierarchy]);

  const selectedGroupName = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((g: any) => g.id === selectedGroupId)?.name || null;
  }, [groups, selectedGroupId]);

  const { data: reportData, isLoading: reportLoading } = useQuery<{
    groupName: string;
    rows: ReportRow[];
    count: number;
  }>({
    queryKey: ["/api/reports/site-details", selectedGroupId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/site-details/${selectedGroupId}`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  const handleGroupChange = (val: string) => {
    setSelectedGroupId(parseInt(val));
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
    XLSX.writeFile(wb, `Site_Details_${selectedGroupName || "Report"}.xlsx`);
  }, [reportData, selectedGroupName]);

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-2">
        <FileText className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-reports-title">Reports</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Generate reports by selecting a group below.</p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Site and Data Set Details Report</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Lists all sites and meters within a group, including utility type, supplier, and meter references.
              </p>
              <div className="max-w-sm">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Group</Label>
                {hierarchyLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading groups...
                  </div>
                ) : (
                  <Select
                    value={selectedGroupId?.toString() || ""}
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
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Generating report...
        </div>
      )}

      {reportData && !reportLoading && (
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

      {!selectedGroupId && !reportLoading && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Please select a group to generate the report.
        </div>
      )}
    </Layout>
  );
}
