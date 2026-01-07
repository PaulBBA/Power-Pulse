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
import { ArrowUpRight, ArrowDownRight, Zap, DollarSign, Leaf, Upload, FileText, User } from "lucide-react";

const usageData = [
  { name: "Jan", kwh: 4000, cost: 2400 },
  { name: "Feb", kwh: 3000, cost: 1398 },
  { name: "Mar", kwh: 2000, cost: 9800 },
  { name: "Apr", kwh: 2780, cost: 3908 },
  { name: "May", kwh: 1890, cost: 4800 },
  { name: "Jun", kwh: 2390, cost: 3800 },
  { name: "Jul", kwh: 3490, cost: 4300 },
];

export default function Dashboard() {
  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your energy consumption and performance metrics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consumption</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,345 kWh</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-emerald-500 flex items-center mr-1">
                <ArrowDownRight className="h-3 w-3 mr-0.5" /> 
                -4.5%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,240.00</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-rose-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> 
                +12.1%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carbon Footprint</CardTitle>
            <Leaf className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4 Tons</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-emerald-500 flex items-center mr-1">
                <ArrowDownRight className="h-3 w-3 mr-0.5" /> 
                -8.2%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Energy Usage Overview</CardTitle>
            <CardDescription>
              Monthly consumption and cost analysis for the current year.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <Area type="monotone" dataKey="kwh" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorKwh)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system events and alerts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="flex items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Data Import Completed</p>
                  <p className="text-sm text-muted-foreground">SFTP upload from 'Meter_01' processed.</p>
                </div>
                <div className="ml-auto font-medium text-xs text-muted-foreground">Just now</div>
              </div>
              
              <div className="flex items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                  <ArrowUpRight className="h-5 w-5 text-destructive" />
                </div>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Usage Spike Detected</p>
                  <p className="text-sm text-muted-foreground">Unusual consumption in Sector B.</p>
                </div>
                <div className="ml-auto font-medium text-xs text-muted-foreground">2h ago</div>
              </div>

              <div className="flex items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Monthly Report Ready</p>
                  <p className="text-sm text-muted-foreground">June 2024 analysis available.</p>
                </div>
                <div className="ml-auto font-medium text-xs text-muted-foreground">5h ago</div>
              </div>
              
              <div className="flex items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <User className="h-5 w-5 text-foreground" />
                </div>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">New User Added</p>
                  <p className="text-sm text-muted-foreground">Admin created 'j.smith@company.com'.</p>
                </div>
                <div className="ml-auto font-medium text-xs text-muted-foreground">1d ago</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         {/* More cards can go here */}
      </div>
    </Layout>
  );
}