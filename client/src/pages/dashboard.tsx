import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Zap, Flame, PoundSterling, Building2, Gauge, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Group } from "@shared/schema";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

function formatCurrency(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

interface DashboardStats {
  totalUnits: number;
  totalCost: number;
  monthlyData: { year: number; month: number; totalUnits: number; totalCost: number }[];
  halfHourlyData?: { datetime: string; date: string; time: string; kWh: number; elecKWh: number; gasKWh: number }[];
  electricityTotal?: number;
  gasTotal?: number;
  dateFrom: string | null;
  dateTo: string | null;
  periodLabel: string;
  siteCount: number;
  meterCount: number;
}

const PERIOD_OPTIONS = [
  { value: "last_month", label: "Last Month Billed" },
  { value: "ytd", label: "Year to Date" },
  { value: "mtd", label: "Past 4 Weeks (Profile Data)" },
];

export default function Dashboard() {
  const [period, setPeriod] = useState("last_month");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [groupAutoApplied, setGroupAutoApplied] = useState(false);

  const { data: groups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  useEffect(() => {
    if (groups && groups.length === 1 && !groupAutoApplied) {
      setSelectedGroupId(groups[0].id.toString());
      setGroupAutoApplied(true);
    }
  }, [groups, groupAutoApplied]);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", period, selectedGroupId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (selectedGroupId !== "all") params.set("groupId", selectedGroupId);
      const res = await fetch(`/api/dashboard/stats?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });

  const chartData = stats?.monthlyData.map(m => ({
    name: `${MONTH_NAMES[m.month - 1]} ${m.year}`,
    kwh: Math.round(m.totalUnits),
    cost: Math.round(m.totalCost),
  })) || [];

  const isMtd = period === "mtd";

  return (
    <Layout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
          {stats?.periodLabel && (
            <p className="text-muted-foreground" data-testid="text-period-label">
              {stats.periodLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-[220px]" data-testid="select-group-filter">
              <SelectValue placeholder="Filter by group" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="all">All Groups</SelectItem>
              {groups?.sort((a, b) => a.name.localeCompare(b.name)).map(g => (
                <SelectItem key={g.id} value={g.id.toString()} data-testid={`option-group-${g.id}`}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod} data-testid="select-period">
            <SelectTrigger className="w-[240px]" data-testid="select-period-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} data-testid={`select-period-${opt.value}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="card-total-consumption">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isMtd ? "Consumption (Profile)" : "Total Consumption"}
                </CardTitle>
                <Zap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-units">
                  {formatNumber(stats?.totalUnits || 0)} kWh
                </div>
                {isMtd && ((stats?.electricityTotal || 0) > 0 || (stats?.gasTotal || 0) > 0) && (
                  <div className="flex flex-col gap-1 mt-2">
                    {(stats?.electricityTotal || 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-elec-total">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        <span>Electricity: {formatNumber(stats!.electricityTotal!)} kWh</span>
                      </div>
                    )}
                    {(stats?.gasTotal || 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-gas-total">
                        <Flame className="h-3 w-3 text-orange-500" />
                        <span>Gas: {formatNumber(stats!.gasTotal!)} kWh</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="card-total-cost">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isMtd ? "Cost" : "Total Cost"}
                </CardTitle>
                <PoundSterling className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-cost">
                  {isMtd ? (
                    <span className="text-lg text-muted-foreground">Not yet invoiced</span>
                  ) : (
                    formatCurrency(stats?.totalCost || 0)
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="card-sites">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sites</CardTitle>
                <Building2 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-site-count">
                  {stats?.siteCount?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active locations</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="card-meters">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meters</CardTitle>
                <Gauge className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-meter-count">
                  {stats?.meterCount?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active data sets</p>
              </CardContent>
            </Card>
          </div>

          {isMtd && stats?.halfHourlyData && stats.halfHourlyData.length > 0 && (() => {
            const hasElec = (stats.electricityTotal || 0) > 0;
            const hasGas = (stats.gasTotal || 0) > 0;
            const hasBoth = hasElec && hasGas;
            return (
            <Card className="shadow-sm" data-testid="card-profile-chart">
              <CardHeader>
                <CardTitle>Half-Hourly Usage – Past 4 Weeks</CardTitle>
                <CardDescription>
                  <span>
                    {hasBoth ? "Electricity and gas consumption" : hasGas ? "Gas consumption" : "Electricity consumption"} per half hour across all meters
                  </span>
                  {stats.dateTo && (
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      — Last data received: {new Date(stats.dateTo + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </CardDescription>
                {hasBoth && (
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#eab308' }} />
                      <span className="text-muted-foreground">Electricity</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }} />
                      <span className="text-muted-foreground">Gas</span>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.halfHourlyData.map((d, idx) => ({
                      ...d,
                      idx,
                    }))} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                      <defs>
                        <linearGradient id="colorElec" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="idx"
                        stroke="#888888"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        tick={({ x, y, payload }: any) => {
                          const d = stats.halfHourlyData![payload.value];
                          if (!d || d.time !== '00:30') return <g />;
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text x={0} y={0} dy={8} textAnchor="end" fill="#888888" fontSize={9} transform="rotate(-90)">
                                {new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </text>
                            </g>
                          );
                        }}
                      />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value} kWh`} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelFormatter={(idx: number) => {
                          const d = stats.halfHourlyData![idx];
                          if (!d) return '';
                          return `${new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${d.time}`;
                        }}
                        formatter={(value: number, name: string) => {
                          const label = name === 'elecKWh' ? 'Electricity' : name === 'gasKWh' ? 'Gas' : 'Usage';
                          return [`${value} kWh`, label];
                        }}
                      />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      {hasElec && (
                        <Area type="monotone" dataKey="elecKWh" stackId="1" stroke="#eab308" strokeWidth={1} fillOpacity={1} fill="url(#colorElec)" dot={false} />
                      )}
                      {hasGas && (
                        <Area type="monotone" dataKey="gasKWh" stackId="1" stroke="#f97316" strokeWidth={1} fillOpacity={1} fill="url(#colorGas)" dot={false} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            );
          })()}

          {!isMtd && chartData.length > 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-sm" data-testid="card-usage-chart">
                <CardHeader>
                  <CardTitle>Consumption by Month</CardTitle>
                  <CardDescription>kWh usage per month</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => [`${value.toLocaleString()} kWh`, 'Consumption']}
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <Bar dataKey="kwh" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm" data-testid="card-cost-chart">
                <CardHeader>
                  <CardTitle>Cost by Month</CardTitle>
                  <CardDescription>Invoiced cost per month</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `£${formatNumber(value)}`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => [formatCurrency(value), 'Cost']}
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <Bar dataKey="cost" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
