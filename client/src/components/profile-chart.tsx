import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Calendar } from "lucide-react";
import {
  BarChart, Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears,
  subDays, subWeeks, subMonths, subYears, isBefore, isAfter, parseISO,
} from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type ViewMode = "day" | "week" | "month" | "year" | "footprint";

const INTERVALS = [
  "i0030","i0100","i0130","i0200","i0230","i0300","i0330","i0400",
  "i0430","i0500","i0530","i0600","i0630","i0700","i0730","i0800",
  "i0830","i0900","i0930","i1000","i1030","i1100","i1130","i1200",
  "i1230","i1300","i1330","i1400","i1430","i1500","i1530","i1600",
  "i1630","i1700","i1730","i1800","i1830","i1900","i1930","i2000",
  "i2030","i2100","i2130","i2200","i2230","i2300","i2330","i2400",
];

const INTERVAL_LABELS = [
  "00:30","01:00","01:30","02:00","02:30","03:00","03:30","04:00",
  "04:30","05:00","05:30","06:00","06:30","07:00","07:30","08:00",
  "08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00",
  "12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00",
  "16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00",
  "20:30","21:00","21:30","22:00","22:30","23:00","23:30","00:00",
];

function getDateRange(anchor: Date, mode: ViewMode): { start: Date; end: Date } {
  switch (mode) {
    case "day":
      return { start: startOfDay(anchor), end: endOfDay(anchor) };
    case "week":
      return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
    case "month":
    case "footprint":
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case "year":
      return { start: startOfYear(anchor), end: endOfYear(anchor) };
  }
}

function navigate(anchor: Date, mode: ViewMode, direction: number): Date {
  switch (mode) {
    case "day": return direction > 0 ? addDays(anchor, 1) : subDays(anchor, 1);
    case "week": return direction > 0 ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
    case "month":
    case "footprint":
      return direction > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1);
    case "year": return direction > 0 ? addYears(anchor, 1) : subYears(anchor, 1);
  }
}

function getAverageRange(start: Date, mode: ViewMode): { start: Date; end: Date } {
  switch (mode) {
    case "day":
    case "week":
      return { start: subWeeks(start, 4), end: subDays(start, 1) };
    case "month":
    case "footprint":
      return { start: subMonths(start, 4), end: subDays(start, 1) };
    case "year":
      return { start: subYears(start, 3), end: subDays(start, 1) };
  }
}

function formatTitle(anchor: Date, mode: ViewMode): string {
  switch (mode) {
    case "day": return format(anchor, "EEEE d MMMM yyyy");
    case "week": {
      const { end } = getDateRange(anchor, "week");
      return `Week Ending ${format(end, "d MMMM yyyy")}`;
    }
    case "month":
    case "footprint":
      return format(anchor, "MMMM yyyy");
    case "year": return format(anchor, "yyyy");
  }
}

const HOUR_LABELS = [
  "1","2","3","4","5","6","7","8","9","10","11","12",
  "13","14","15","16","17","18","19","20","21","22","23","24",
];

function getHeatmapColor(value: number, min: number, max: number): string {
  if (value === 0 || max === min) return "#f0f9ff";
  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
  if (ratio <= 0.15) return "#e0f2fe";
  if (ratio <= 0.25) return "#dcfce7";
  if (ratio <= 0.35) return "#bbf7d0";
  if (ratio <= 0.45) return "#86efac";
  if (ratio <= 0.55) return "#fef08a";
  if (ratio <= 0.65) return "#fde047";
  if (ratio <= 0.75) return "#fdba74";
  if (ratio <= 0.85) return "#fb923c";
  if (ratio <= 0.95) return "#f87171";
  return "#ef4444";
}

function FootprintHeatmap({ profiles }: { profiles: any[] }) {
  const { allValues, min, max, blockSize } = useMemo(() => {
    const vals: number[] = [];
    for (const p of profiles) {
      for (const key of INTERVALS) {
        const v = p[key];
        if (v != null && Number(v) > 0) vals.push(Number(v));
      }
    }
    if (vals.length === 0) return { allValues: vals, min: 0, max: 0, blockSize: 0 };
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const block = Math.round((maxVal - minVal) / 10);
    return { allValues: vals, min: minVal, max: maxVal, blockSize: block || 1 };
  }, [profiles]);

  const legendSteps = useMemo(() => {
    if (max === 0) return [];
    const steps: { color: string; label: string }[] = [];
    const stepCount = 10;
    for (let i = 0; i <= stepCount; i++) {
      const val = min + (max - min) * (i / stepCount);
      steps.push({
        color: getHeatmapColor(val, min, max),
        label: `${Math.round(val)} kWh`,
      });
    }
    return steps;
  }, [min, max]);

  if (profiles.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No data available for this period.
      </div>
    );
  }

  return (
    <div data-testid="footprint-heatmap">
      <div className="flex gap-6">
        <div className="flex-1 overflow-x-auto relative">
          <table className="border-collapse text-[10px]" style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                <th className="sticky left-0 bg-background z-10 text-left px-1 py-0.5 font-medium text-muted-foreground whitespace-nowrap" style={{ minWidth: 110 }}></th>
                {HOUR_LABELS.map((h, i) => (
                  <th key={h} colSpan={2} className="text-center px-0 py-0.5 font-normal text-muted-foreground border-l border-border/30">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((p: any) => {
                const d = new Date(p.date);
                const dateLabel = format(d, "dd/MM/yyyy EEE");
                return (
                  <tr key={p.id}>
                    <td className="sticky left-0 bg-background z-10 px-1 py-0 font-medium text-muted-foreground whitespace-nowrap border-r border-border/50" style={{ minWidth: 110 }}>
                      {dateLabel}
                    </td>
                    {INTERVALS.map((key, i) => {
                      const val = p[key] != null ? Number(p[key]) : 0;
                      const color = val > 0 ? getHeatmapColor(val, min, max) : "#f8fafc";
                      return (
                        <td
                          key={key}
                          className="p-0 cursor-crosshair"
                          style={{
                            backgroundColor: color,
                            width: 14,
                            minWidth: 14,
                            height: 18,
                            borderLeft: i % 2 === 0 ? "1px solid rgba(0,0,0,0.05)" : "none",
                          }}
                          title={`${dateLabel} ${INTERVAL_LABELS[i]}: ${val.toFixed(1)} kWh`}
                          data-testid={`cell-heatmap-${p.id}-${i}`}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky left-0 bg-background z-10"></td>
                {HOUR_LABELS.map((h) => (
                  <td key={`f-${h}`} colSpan={2} className="text-center text-[9px] text-muted-foreground border-t border-border/30 pt-0.5">
                    {h}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 bg-background z-10"></td>
                <td colSpan={12} className="text-center text-[10px] text-muted-foreground pt-1 font-medium">Night</td>
                <td colSpan={8} className="text-center text-[10px] text-muted-foreground pt-1 font-medium">Morning</td>
                <td colSpan={10} className="text-center text-[10px] text-muted-foreground pt-1 font-medium">Afternoon</td>
                <td colSpan={8} className="text-center text-[10px] text-muted-foreground pt-1 font-medium">Peak</td>
                <td colSpan={10} className="text-center text-[10px] text-muted-foreground pt-1 font-medium">Evening</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex-shrink-0 text-[11px]" style={{ minWidth: 130 }}>
          <div className="mb-2 space-y-0.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Maximum</span><strong>{Math.round(max)} kWh</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Minimum</span><strong>{Math.round(min)} kWh</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Block Size</span><strong>{blockSize} kWh</strong></div>
          </div>
          <div className="space-y-0.5 mt-3">
            {legendSteps.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-4 h-3 border border-border/30 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProfileChartProps {
  meterId: number;
  meterIds?: number[];
}

export function ProfileChart({ meterId, meterIds }: ProfileChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState<Date>(new Date());

  const { data: dateRangeData } = useQuery<{ earliest: string | null; latest: string | null; totalDays: number }>({
    queryKey: [`/api/data-sets/${meterId}/profiles/date-range`],
  });

  const latestDate = dateRangeData?.latest ? parseISO(dateRangeData.latest) : null;
  const earliestDate = dateRangeData?.earliest ? parseISO(dateRangeData.earliest) : null;

  const effectiveAnchor = useMemo(() => {
    if (latestDate && isAfter(anchor, latestDate)) return latestDate;
    if (earliestDate && isBefore(anchor, earliestDate)) return earliestDate;
    return anchor;
  }, [anchor, latestDate, earliestDate]);

  const { start, end } = useMemo(() => getDateRange(effectiveAnchor, viewMode), [effectiveAnchor, viewMode]);
  const avgRange = useMemo(() => getAverageRange(start, viewMode), [start, viewMode]);

  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");
  const avgStartStr = format(avgRange.start, "yyyy-MM-dd");
  const avgEndStr = format(avgRange.end, "yyyy-MM-dd");

  const { data: chartData, isLoading } = useQuery<{ profiles: any[] }>({
    queryKey: [`/api/data-sets/${meterId}/profiles/chart`, startStr, endStr],
    queryFn: () => fetch(`/api/data-sets/${meterId}/profiles/chart?start=${startStr}&end=${endStr}`).then(r => r.json()),
  });

  const { data: avgData } = useQuery<{ profiles: any[] }>({
    queryKey: [`/api/data-sets/${meterId}/profiles/chart`, avgStartStr, avgEndStr],
    queryFn: () => fetch(`/api/data-sets/${meterId}/profiles/chart?start=${avgStartStr}&end=${avgEndStr}`).then(r => r.json()),
    enabled: viewMode !== "year" && viewMode !== "footprint",
  });

  const processedData = useMemo(() => {
    if (!chartData?.profiles?.length) return [];

    if (viewMode === "day") {
      const dayProfile = chartData.profiles[0];
      if (!dayProfile) return [];
      return INTERVALS.map((key, i) => ({
        label: INTERVAL_LABELS[i],
        consumption: dayProfile[key] != null ? Number(dayProfile[key]) : 0,
      }));
    }

    if (viewMode === "week") {
      const points: { label: string; consumption: number }[] = [];
      for (const profile of chartData.profiles) {
        const dateStr = format(new Date(profile.date), "EEE dd");
        for (let i = 0; i < INTERVALS.length; i++) {
          const val = profile[INTERVALS[i]];
          points.push({
            label: `${dateStr} ${INTERVAL_LABELS[i]}`,
            consumption: val != null ? Number(val) : 0,
          });
        }
      }
      return points;
    }

    if (viewMode === "month") {
      return chartData.profiles.map((p: any) => ({
        label: format(new Date(p.date), "dd"),
        consumption: p.dayTotal != null ? Number(p.dayTotal) : 0,
      }));
    }

    if (viewMode === "year") {
      const monthTotals: Record<string, number> = {};
      for (const p of chartData.profiles) {
        const monthKey = format(new Date(p.date), "MMM");
        const total = p.dayTotal != null ? Number(p.dayTotal) : 0;
        monthTotals[monthKey] = (monthTotals[monthKey] || 0) + total;
      }
      const monthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return monthOrder.map(m => ({
        label: m,
        consumption: monthTotals[m] || 0,
      }));
    }

    return [];
  }, [chartData, viewMode]);

  const avgLine = useMemo(() => {
    if (!avgData?.profiles?.length || viewMode === "year") return null;

    if (viewMode === "day") {
      const weekCount = 4;
      const avgByInterval: number[] = new Array(48).fill(0);
      const countByInterval: number[] = new Array(48).fill(0);
      const dayOfWeek = effectiveAnchor.getDay();
      const matchingProfiles = avgData.profiles.filter(p => new Date(p.date).getDay() === dayOfWeek);
      for (const p of matchingProfiles) {
        for (let i = 0; i < INTERVALS.length; i++) {
          const val = p[INTERVALS[i]];
          if (val != null) {
            avgByInterval[i] += Number(val);
            countByInterval[i]++;
          }
        }
      }
      return processedData.map((d, i) => ({
        ...d,
        average: countByInterval[i] > 0 ? avgByInterval[i] / countByInterval[i] : undefined,
      }));
    }

    if (viewMode === "week") {
      const weekAvgs: number[] = new Array(48 * 7).fill(0);
      const weekCounts: number[] = new Array(48 * 7).fill(0);
      for (const p of avgData.profiles) {
        const dow = (new Date(p.date).getDay() + 6) % 7;
        for (let i = 0; i < INTERVALS.length; i++) {
          const idx = dow * 48 + i;
          const val = p[INTERVALS[i]];
          if (val != null) {
            weekAvgs[idx] += Number(val);
            weekCounts[idx]++;
          }
        }
      }
      return processedData.map((d, i) => ({
        ...d,
        average: weekCounts[i] > 0 ? weekAvgs[i] / weekCounts[i] : undefined,
      }));
    }

    if (viewMode === "month") {
      const dayAvgs: Record<number, { sum: number; count: number }> = {};
      for (const p of avgData.profiles) {
        const dom = new Date(p.date).getDate();
        if (!dayAvgs[dom]) dayAvgs[dom] = { sum: 0, count: 0 };
        if (p.dayTotal != null) {
          dayAvgs[dom].sum += Number(p.dayTotal);
          dayAvgs[dom].count++;
        }
      }
      return processedData.map((d) => {
        const dom = parseInt(d.label);
        const avg = dayAvgs[dom];
        return {
          ...d,
          average: avg && avg.count > 0 ? avg.sum / avg.count : undefined,
        };
      });
    }

    return null;
  }, [avgData, processedData, viewMode, effectiveAnchor]);

  const finalData = avgLine || processedData;

  const handlePrev = useCallback(() => {
    setAnchor(prev => navigate(prev, viewMode, -1));
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setAnchor(prev => navigate(prev, viewMode, 1));
  }, [viewMode]);

  const handleToday = useCallback(() => {
    if (latestDate) {
      setAnchor(latestDate);
    } else {
      setAnchor(new Date());
    }
  }, [latestDate]);

  const handleModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const totalConsumption = useMemo(() => {
    return processedData.reduce((sum, d) => sum + (d.consumption || 0), 0);
  }, [processedData]);

  const maxConsumption = useMemo(() => {
    return Math.max(...processedData.map(d => d.consumption || 0), 0);
  }, [processedData]);

  const avgLabel = viewMode === "day" || viewMode === "week" ? "4-Week Average" : "4-Month Average";

  const tickInterval = useMemo(() => {
    if (viewMode === "day") return 3;
    if (viewMode === "week") return 24;
    if (viewMode === "month") return 1;
    return 0;
  }, [viewMode]);

  if (!dateRangeData) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="profile-chart-loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dateRangeData.earliest) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm" data-testid="profile-chart-empty">
        No profile data available for this meter.
      </div>
    );
  }

  return (
    <div data-testid="profile-chart">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1" data-testid="profile-view-modes">
          <Button
            variant={viewMode === "year" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("year")}
            data-testid="btn-view-year"
          >
            Year
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("month")}
            data-testid="btn-view-month"
          >
            Month
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("week")}
            data-testid="btn-view-week"
          >
            Week
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("day")}
            data-testid="btn-view-day"
          >
            Day
          </Button>
          <Button
            variant={viewMode === "footprint" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("footprint")}
            data-testid="btn-view-footprint"
          >
            Footprint
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday} data-testid="btn-view-latest">
          <Calendar className="h-4 w-4 mr-1" />
          Latest
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={handlePrev} data-testid="btn-nav-prev">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-base font-semibold" data-testid="text-chart-title">
          {formatTitle(effectiveAnchor, viewMode)}
        </h3>
        <Button variant="ghost" size="icon" onClick={handleNext} data-testid="btn-nav-next">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-6 mb-2 text-sm text-muted-foreground">
        <span>Total: <strong className="text-foreground">{totalConsumption.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh</strong></span>
        {viewMode !== "year" && (
          <span>Peak: <strong className="text-foreground">{maxConsumption.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh</strong></span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === "footprint" ? (
        <FootprintHeatmap profiles={chartData?.profiles || []} />
      ) : processedData.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No data available for this period.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={400} data-testid="chart-container">
            <ComposedChart data={finalData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={tickInterval}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                label={{ value: "kWh", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh`,
                  name === "consumption" ? "Consumption" : avgLabel,
                ]}
              />
              <Bar
                dataKey="consumption"
                fill="#5eead4"
                radius={[1, 1, 0, 0]}
                name="Electricity Consumption"
              />
              {avgLine && (
                <Line
                  dataKey="average"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  name={avgLabel}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#5eead4" }} />
              <span>Electricity Consumption</span>
            </div>
            {avgLine && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5" style={{ backgroundColor: "#a78bfa" }} />
                <span>{avgLabel}</span>
              </div>
            )}
          </div>

          {chartData?.profiles && chartData.profiles.length > 0 && (
            <div className="mt-6 border rounded-md" data-testid="profile-daily-table">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="text-right font-medium">Day Total (kWh)</TableHead>
                    <TableHead className="font-medium">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.profiles.map((p: any) => (
                    <TableRow key={p.id} data-testid={`row-profile-${p.id}`}>
                      <TableCell>{format(new Date(p.date), "EEE dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-right">
                        {p.dayTotal != null ? Number(p.dayTotal).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"}
                      </TableCell>
                      <TableCell>{p.type === 0 ? "Actual" : `Type ${p.type}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}