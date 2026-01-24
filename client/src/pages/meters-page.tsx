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
import { Search, FileDown, Settings2, ArrowUpDown, Loader2, Plus } from "lucide-react";
import * as XLSX from 'xlsx';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataSet, Site, insertDataSetSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MetersPage() {
  const [search, setSearch] = useState("");
  const [utilityFilter, setUtilityFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dataSets, isLoading } = useQuery<DataSet[]>({
    queryKey: ["/api/data-sets"],
  });

  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const canCreateMeter = user?.role === "admin" || user?.role === "editor";

  const form = useForm({
    resolver: zodResolver(insertDataSetSchema),
    defaultValues: {
      name: "",
      siteId: 0,
      utilityTypeId: 1,
      mpanProfile: "",
      mpanCoreMprn: "",
      meterSerial1: "",
      location: "",
      supplierId: null,
      isActive: true,
    },
  });

  const createMeterMutation = useMutation({
    mutationFn: async (values: any) => {
      // Clean values: ensure numeric IDs are numbers, and optional text fields are null if empty
      const cleanedValues: any = {
        name: values.name || "",
        siteId: values.siteId ? Number(values.siteId) : null,
        utilityTypeId: values.utilityTypeId ? Number(values.utilityTypeId) : null,
        mpanProfile: values.mpanProfile || null,
        mpanCoreMprn: values.mpanCoreMprn || null,
        meterSerial1: values.meterSerial1 || null,
        location: values.location || null,
        supplierId: values.supplierId ? Number(values.supplierId) : null,
      };

      // Filter out null values for required fields or fields that might cause issues if empty string is sent as parameter
      const finalValues = Object.fromEntries(
        Object.entries(cleanedValues).filter(([_, v]) => v !== null && v !== "")
      );

      const res = await apiRequest("POST", "/api/data-sets", finalValues);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create meter");
      }

      const text = await res.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (e) {
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sets"] });
      toast({ title: "Success", description: "Meter created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      // Check for common database errors and map them to fields
      const message = error.message || "";
      
      if (message.includes("mpan_core_mprn") || message.includes("parameter $5")) {
        form.setError("mpanCoreMprn", { message: "Invalid input syntax for integer" });
      } else if (message.includes("mpan_profile") || message.includes("parameter $4")) {
        form.setError("mpanProfile", { message: "Invalid input syntax for integer" });
      } else if (message.includes("meter_serial_1") || message.includes("parameter $6")) {
        form.setError("meterSerial1", { message: "Invalid input syntax for integer" });
      } else if (message.includes("supplier_id") || message.includes("parameter $8")) {
        form.setError("supplierId", { message: "Invalid input syntax for integer" });
      }

      toast({ 
        title: "Error", 
        description: error.message || "Failed to create meter",
        variant: "destructive"
      });
    },
  });

  const handleExport = () => {
    if (!dataSets) return;
    const worksheet = XLSX.utils.json_to_sheet(dataSets);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DataSets");
    XLSX.writeFile(workbook, "BBA_Energy_Meters.xlsx");
  };

  const filteredDataSets = dataSets?.filter(ds => {
    const matchesSearch = ds.name.toLowerCase().includes(search.toLowerCase()) ||
      (ds.mpanCoreMprn && ds.mpanCoreMprn.toLowerCase().includes(search.toLowerCase())) ||
      (ds.meterSerial1 && ds.meterSerial1.toLowerCase().includes(search.toLowerCase()));
    
    if (utilityFilter === "all") return matchesSearch;
    const utilityMap: Record<string, number> = { "elec": 1, "gas": 2, "water": 3 };
    return matchesSearch && ds.utilityTypeId === utilityMap[utilityFilter];
  }) || [];

  const getUtilityName = (id: number) => {
    const names: Record<number, string> = {
      1: "Electricity",
      2: "Gas",
      3: "Water"
    };
    return names[id] || `Unknown (${id})`;
  };

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Sets (Meters)</h1>
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
              <Select value={utilityFilter} onValueChange={setUtilityFilter}>
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

            <div className="flex items-center gap-2 flex-1 max-sm:max-w-none max-w-sm">
              <span className="text-sm font-medium text-nowrap">Search:</span>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9 h-9" 
                  placeholder="Search MPAN/Serial/Name..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              {canCreateMeter && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9 bg-primary text-white">
                      <Plus className="mr-2 h-4 w-4" />
                      New Meter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Meter</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit((data) => createMeterMutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="siteId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Site</FormLabel>
                                <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a site" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {sites?.map(site => (
                                      <SelectItem key={site.id} value={site.id.toString()}>{site.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="utilityTypeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Utility Type</FormLabel>
                                <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1">Electricity</SelectItem>
                                    <SelectItem value="2">Gas</SelectItem>
                                    <SelectItem value="3">Water</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Meter Name</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="mpanProfile"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>MPAN Profile</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="mpanCoreMprn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>MPAN Core / MPRN</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="meterSerial1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Meter Serial 1</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={createMeterMutation.isPending}>
                          {createMeterMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Meter
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
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
                    <TableHead className="font-bold">Utility Type</TableHead>
                    <TableHead className="font-bold">MPAN Profile</TableHead>
                    <TableHead className="font-bold">MPAN Core / MPRN</TableHead>
                    <TableHead className="font-bold">Meter Serial 1</TableHead>
                    <TableHead className="font-bold">Location</TableHead>
                    <TableHead className="font-bold">Supplier ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDataSets.length > 0 ? (
                    filteredDataSets.map((ds, i) => (
                      <TableRow key={ds.id} className={i % 2 === 1 ? "bg-secondary/20" : ""}>
                        <TableCell className="text-sm">{getUtilityName(ds.utilityTypeId)}</TableCell>
                        <TableCell className="text-sm">{ds.mpanProfile}</TableCell>
                        <TableCell className="text-sm">{ds.mpanCoreMprn}</TableCell>
                        <TableCell className="text-sm">{ds.meterSerial1}</TableCell>
                        <TableCell className="text-sm">{ds.location}</TableCell>
                        <TableCell className="text-sm">{ds.supplierId || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No meters found</TableCell>
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
