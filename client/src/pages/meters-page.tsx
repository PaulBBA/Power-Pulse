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
import { Search, FileDown, Settings2, ArrowUpDown, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataSet } from "@shared/schema";

export default function MetersPage() {
  const [search, setSearch] = useState("");

  const { data: dataSets, isLoading } = useQuery<DataSet[]>({
    queryKey: ["/api/data-sets"],
  });

  const handleExport = () => {
    if (!dataSets) return;
    const worksheet = XLSX.utils.json_to_sheet(dataSets);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DataSets");
    XLSX.writeFile(workbook, "BBA_Energy_DataSets.xlsx");
  };

  const filteredDataSets = dataSets?.filter(ds => 
    ds.name.toLowerCase().includes(search.toLowerCase()) ||
    (ds.referenceNumber && ds.referenceNumber.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Sets (Meters)</h1>
        <p className="text-muted-foreground">Manage and view your energy meter infrastructure.</p>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-sidebar text-sidebar-foreground py-3">
          <CardTitle className="text-lg font-bold uppercase tracking-wider">Data Set List</CardTitle>
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
                <Input 
                  className="pl-9 h-9" 
                  placeholder="Search reference or name..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <Button 
                size="sm" 
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm"
                onClick={handleExport}
                disabled={!dataSets || dataSets.length === 0}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button size="sm" variant="outline" className="h-9 w-9 p-0 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[200px] flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow>
                    <TableHead className="font-bold">ID <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Name <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Reference <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Location <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Tariff <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Status <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDataSets.length > 0 ? (
                    filteredDataSets.map((ds, i) => (
                      <TableRow key={ds.id} className={i % 2 === 1 ? "bg-secondary/20" : ""}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{ds.id}</TableCell>
                        <TableCell className="text-sm">{ds.name}</TableCell>
                        <TableCell className="text-sm">{ds.referenceNumber}</TableCell>
                        <TableCell className="text-sm">{ds.location}</TableCell>
                        <TableCell className="text-sm">{ds.tariffName}</TableCell>
                        <TableCell className="text-sm">{ds.isActive ? "Active" : "Inactive"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data sets found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}