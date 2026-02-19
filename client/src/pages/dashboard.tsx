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
import { ArrowUpRight, ArrowDownRight, Zap, PoundSterling, Leaf, Building2, Gauge, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

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
  dailyData?: { date: string; dailyUnits: number; cumulativeUnits: number }[];
  dateFrom: string | null;
  dateTo: string | null;
  periodLabel: string;
  siteCount: number;
  meterCount: number;
}

const PERIOD_OPTIONS = [
  { value: "last_month", label: "Last Month Billed" },
  { value: "ytd", label: "Year to Date" },
  { value: "mtd", label: "Month to Date (Profile Data)" },
];

export default function Dashboard() {
  const [period, setPeriod] = useState("last_month");

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", period],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?period=${period}`, { credentials: "include" });
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

          {isMtd && stats?.dailyData && stats.dailyData.length > 0 && (
            <Card className="shadow-sm" data-testid="card-cumulative-chart">
              <CardHeader>
                <CardTitle>Cumulative Consumption – Month to Date</CardTitle>
                <CardDescription>Daily profile data building up through the month</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.dailyData.map(d => ({
                      ...d,
                      label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                    }))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: number, name: string) => [
                          `${value.toLocaleString()} kWh`,
                          name === 'cumulativeUnits' ? 'Cumulative' : 'Daily'
                        ]}
                      />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <Area type="monotone" dataKey="cumulativeUnits" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorCumulative)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="shadow-sm opacity-60" data-testid="card-carbon-footprint">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Carbon Footprint</CardTitle>
                <Leaf className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium text-muted-foreground">Coming Soon</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Carbon calculations will be available in a future update.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </Layout>
  );
}
