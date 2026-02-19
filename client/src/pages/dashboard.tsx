import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

function formatCurrency(value: number): string {
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface DashboardStats {
  totalUnits: number;
  totalCost: number;
  monthlyData: { year: number; month: number; totalUnits: number; totalCost: number }[];
  siteCount: number;
  meterCount: number;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });

  const chartData = stats?.monthlyData.map(m => ({
    name: `${MONTH_NAMES[m.month - 1]} ${m.year}`,
    kwh: Math.round(m.totalUnits),
    cost: Math.round(m.totalCost),
  })) || [];

  const latestMonth = stats?.monthlyData?.[stats.monthlyData.length - 1];
  const previousMonth = stats?.monthlyData?.[stats.monthlyData.length - 2];

  let unitsChange: number | null = null;
  let costChange: number | null = null;
  if (latestMonth && previousMonth && previousMonth.totalUnits > 0) {
    unitsChange = ((latestMonth.totalUnits - previousMonth.totalUnits) / previousMonth.totalUnits) * 100;
  }
  if (latestMonth && previousMonth && previousMonth.totalCost > 0) {
    costChange = ((latestMonth.totalCost - previousMonth.totalCost) / previousMonth.totalCost) * 100;
  }

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your energy consumption and performance metrics.</p>
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
                <CardTitle className="text-sm font-medium">Total Consumption</CardTitle>
                <Zap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-units">
                  {formatNumber(stats?.totalUnits || 0)} kWh
                </div>
                {unitsChange !== null && (
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <span className={`flex items-center mr-1 ${unitsChange <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {unitsChange <= 0 ? <ArrowDownRight className="h-3 w-3 mr-0.5" /> : <ArrowUpRight className="h-3 w-3 mr-0.5" />}
                      {unitsChange >= 0 ? '+' : ''}{unitsChange.toFixed(1)}%
                    </span>
                    vs previous month
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="card-total-cost">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <PoundSterling className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-cost">
                  {formatCurrency(stats?.totalCost || 0)}
                </div>
                {costChange !== null && (
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <span className={`flex items-center mr-1 ${costChange <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {costChange <= 0 ? <ArrowDownRight className="h-3 w-3 mr-0.5" /> : <ArrowUpRight className="h-3 w-3 mr-0.5" />}
                      {costChange >= 0 ? '+' : ''}{costChange.toFixed(1)}%
                    </span>
                    vs previous month
                  </p>
                )}
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 shadow-sm" data-testid="card-usage-chart">
              <CardHeader>
                <CardTitle>Energy Usage Overview</CardTitle>
                <CardDescription>
                  Monthly consumption across all your meters (last 24 months).
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => [`${value.toLocaleString()} kWh`, 'Consumption']}
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <Area type="monotone" dataKey="kwh" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorKwh)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No usage data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3 shadow-sm" data-testid="card-cost-chart">
              <CardHeader>
                <CardTitle>Monthly Cost Trend</CardTitle>
                <CardDescription>
                  Cost analysis across your meters (last 24 months).
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `£${formatNumber(value)}`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => [formatCurrency(value), 'Cost']}
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <Area type="monotone" dataKey="cost" stroke="hsl(var(--chart-2))" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No cost data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

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
