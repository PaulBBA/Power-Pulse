import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileDown, Settings2, ArrowUpDown } from "lucide-react";
import * as XLSX from 'xlsx';

const meters = [
  { code: "BBA1096-0515", site: "SAT : Bedford (16)", mpan: "1012345711844", serial: "L73E004122", location: "COT'd JULY 2018 - no long SATCOL meter", supplier: "Haven", utility: "Electricity" },
  { code: "BBA1096-1112", site: "SAT : Brownhills (797)", mpan: "1417941440008", serial: "S72G06102", location: "REMOVED", supplier: "", utility: "Electricity" },
  { code: "BBA1096-0434", site: "SAT : Parkstone (418) SITE CLOSED NOV 2014", mpan: "2000021408121", serial: "L67C09861", location: "", supplier: "SSE", utility: "Electricity" },
  { code: "BBA1096-0738", site: "SAT : Tunbridge Wells (691) SITE CLOSED JUNE 2015", mpan: "1900032278239", serial: "P9910485", location: "", supplier: "SSE", utility: "Electricity" },
  { code: "BBA1596-0008", site: "MPX : Chelsea Barracks Phase 4", mpan: "2700006186284", serial: "E21BG02069", location: "EXPORT Energy Centre 2 Services - COT 08/12/21", supplier: "Ecotricity", utility: "Electricity" },
  { code: "BBA1589-0001", site: "SPC : St Mary Church", mpan: "1012357707721", serial: "D12C12152", location: "The Church", supplier: "Npower", utility: "Electricity" },
];

export default function MetersPage() {
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(meters);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Meters");
    XLSX.writeFile(workbook, "BBA_Energy_Meters.xlsx");
  };

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Meters</h1>
        <p className="text-muted-foreground">Manage and view your energy meter infrastructure.</p>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-sidebar text-sidebar-foreground py-3">
          <CardTitle className="text-lg font-bold uppercase tracking-wider">Meter List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 bg-card border-b flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Utility:</span>
              <Select defaultValue="all">
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="elec">Electricity</SelectItem>
                  <SelectItem value="gas">Gas</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <span className="text-sm font-medium">Search:</span>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-9" placeholder="Search meters..." />
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <Button 
                size="sm" 
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm"
                onClick={handleExport}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button size="sm" variant="outline" className="h-9 w-9 p-0 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="font-bold">Code <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  <TableHead className="font-bold">Site Name <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  <TableHead className="font-bold">MPAN / MPRN <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  <TableHead className="font-bold">Meter Serial Number <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  <TableHead className="font-bold">Location <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  <TableHead className="font-bold">Supplier <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  <TableHead className="font-bold">Utility <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meters.map((meter, i) => (
                  <TableRow key={meter.code} className={i % 2 === 1 ? "bg-secondary/20" : ""}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{meter.code}</TableCell>
                    <TableCell className="text-sm">{meter.site}</TableCell>
                    <TableCell className="text-xs font-mono">{meter.mpan}</TableCell>
                    <TableCell className="text-xs font-mono">{meter.serial}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={meter.location}>
                      {meter.location}
                    </TableCell>
                    <TableCell className="text-sm">{meter.supplier}</TableCell>
                    <TableCell className="text-sm">{meter.utility}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}