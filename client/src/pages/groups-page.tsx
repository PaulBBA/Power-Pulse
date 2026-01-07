import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileDown, ArrowUpDown } from "lucide-react";

const groups = [
  { name: "{All Sites}" },
  { name: "{Hidden Sites}" },
  { name: "_ArchiveKFS" },
  { name: "_ArchiveMPX" },
  { name: "_ArchiveSAT" },
  { name: "1st Potton Scouts Hall Group" },
  { name: "Aiden Jones Ltd" },
  { name: "Amble Electrical" },
  { name: "Archer Academy" },
  { name: "ASK Electronics Ltd" },
];

export default function GroupsPage() {
  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
        <p className="text-muted-foreground">Manage and organize your energy reporting groups.</p>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-sidebar text-sidebar-foreground py-3">
          <CardTitle className="text-lg font-bold uppercase tracking-wider">Group List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 bg-card border-b flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <span className="text-sm font-medium">Search:</span>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-9" placeholder="Search groups..." />
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm">
                <FileDown className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="font-bold">Name <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group, i) => (
                  <TableRow key={group.name} className={i % 2 === 1 ? "bg-secondary/20" : ""}>
                    <TableCell className="text-sm py-3">{group.name}</TableCell>
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