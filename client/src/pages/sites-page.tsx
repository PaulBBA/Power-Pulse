import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileDown, Settings2, ArrowUpDown } from "lucide-react";
import * as XLSX from 'xlsx';

const sites = [
  { code: "BBA0871-0007", name: "APS : Atwood Primary Academy", address: "Atwood Primary School", town: "Sanderstead, South Croydon", telephone: "020 8657 7374", email: "" },
  { code: "BBA1606-0001", name: "BHL : Belle Hotel Ltd- now Craft Pubs Ltd", address: "The Coach House", town: "Potton", telephone: "", email: "" },
  { code: "BBA1597-0001", name: "BSB : Beego's Sandwich Bar", address: "32 High Street", town: "Biggleswade", telephone: "01767 314749", email: "" },
  { code: "BBA1573-1058", name: "CAD : Chunky's (Andrew Davie Ltd)", address: "Chunky's (Andrew Davie Ltd)", town: "Sandy", telephone: "01767 692 966", email: "" },
  { code: "BBA1605-0001", name: "CDC : Chiswick Dental", address: "231 Chiswick High Road", town: "London", telephone: "07738 011001", email: "" },
  { code: "BBA1611-0009", name: "CLA : Algernon Road", address: "1 Cascade Walk", town: "London", telephone: "", email: "" },
  { code: "BBA1611-0006", name: "CLA : Aytoun", address: "Aytoun Road", town: "London", telephone: "", email: "" },
];

export default function SitesPage() {
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(sites);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sites");
    XLSX.writeFile(workbook, "BBA_Energy_Sites.xlsx");
  };

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
        <p className="text-muted-foreground">Manage and view your physical site locations.</p>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-sidebar text-sidebar-foreground py-3">
          <CardTitle className="text-lg font-bold uppercase tracking-wider">Site List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 bg-card border-b flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <span className="text-sm font-medium">Search:</span>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-9" placeholder="Search sites..." />
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
                  <TableHead className="font-bold">Name <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  <TableHead className="font-bold">Address 1 <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  <TableHead className="font-bold">Town <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  <TableHead className="font-bold">Telephone <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  <TableHead className="font-bold">Email <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site, i) => (
                  <TableRow key={site.code} className={i % 2 === 1 ? "bg-secondary/20" : ""}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{site.code}</TableCell>
                    <TableCell className="text-sm">{site.name}</TableCell>
                    <TableCell className="text-sm">{site.address}</TableCell>
                    <TableCell className="text-sm">{site.town}</TableCell>
                    <TableCell className="text-sm">{site.telephone}</TableCell>
                    <TableCell className="text-sm">{site.email}</TableCell>
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