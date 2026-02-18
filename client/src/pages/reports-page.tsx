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
  FileText, Building2, MapPin, Gauge, ChevronRight, Calendar, Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

type ScopeLevel = "group" | "site" | "meter";

interface ScopeSelection {
  level: ScopeLevel;
  groupId: number | null;
  siteId: number | null;
  meterId: number | null;
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
  };

  const handleGroupChange = (val: string) => {
    const id = parseInt(val);
    setScope({ ...scope, groupId: id, siteId: null, meterId: null });
  };

  const handleSiteChange = (val: string) => {
    const id = parseInt(val);
    setScope({ ...scope, siteId: id, meterId: null });
  };

  const handleMeterChange = (val: string) => {
    const id = parseInt(val);
    setScope({ ...scope, meterId: id });
  };

  const isSelectionComplete = useMemo(() => {
    if (scope.level === "group") return scope.groupId !== null;
    if (scope.level === "site") return scope.siteId !== null;
    if (scope.level === "meter") return scope.meterId !== null;
    return false;
  }, [scope]);

  const scopeSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedGroupName) parts.push(selectedGroupName);
    if (scope.level !== "group" && selectedSiteName) parts.push(selectedSiteName);
    if (scope.level === "meter" && selectedMeterName) parts.push(selectedMeterName);
    return parts.join(" > ");
  }, [scope.level, selectedGroupName, selectedSiteName, selectedMeterName]);

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-2">
        <FileText className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-reports-title">Reports</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Generate reports by selecting a scope and date range below.</p>

      <Card>
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

            {isSelectionComplete && (
              <>
                <Separator />
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
                </div>
              </>
            )}

            {!isSelectionComplete && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Please select a {scope.level} to continue.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}