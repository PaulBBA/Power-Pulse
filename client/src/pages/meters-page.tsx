import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileDown, Settings2, ArrowUpDown, Loader2, Plus } from "lucide-react";
import * as XLSX from 'xlsx';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataSet, Site, insertDataSetSchema } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MetersPage() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const canCreateMeter = user?.role === "admin" || user?.role === "editor";

  const { data: meters, isLoading: isLoadingMeters } = useQuery<(DataSet & { siteCode?: string })[]>({
    queryKey: ["/api/data-sets"],
  });

  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: utilities } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/utilities"],
  });

  const form = useForm({
    resolver: zodResolver(insertDataSetSchema),
    defaultValues: {
      siteId: undefined as any,
      name: "",
      utilityTypeId: undefined as any, 
      referenceNumber: "",
      supplier: "",
      frequency: "",
      meterSerial1: "",
      mpanProfile: "",
      location: "",
      mpanCoreMprn: "",
      importLinkDirect: "",
      importLinkInvoice: "",
      importLinkProfile: "",
    },
  });

  const createMeterMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/data-sets", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sets"] });
      toast({ title: "Success", description: "Meter created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = () => {
    if (!meters) return;
    const worksheet = XLSX.utils.json_to_sheet(meters);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Meters");
    XLSX.writeFile(workbook, "BBA_Energy_Meters.xlsx");
  };

  const filteredMeters = meters?.filter(meter => 
    meter.name.toLowerCase().includes(search.toLowerCase()) ||
    meter.siteCode?.toLowerCase().includes(search.toLowerCase()) ||
    meter.referenceNumber?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Meters</h1>
        <p className="text-muted-foreground">Manage and view your data sets and meters.</p>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-sidebar text-sidebar-foreground py-3">
          <CardTitle className="text-lg font-bold uppercase tracking-wider">Meter List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 bg-card border-b flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <span className="text-sm font-medium">Search:</span>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9 h-9" 
                  placeholder="Search meters..." 
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
                                      <SelectItem key={site.id} value={site.id.toString()}>{site.code} - {site.name}</SelectItem>
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
                                <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select utility" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {utilities?.map(u => (
                                      <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                    ))}
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
                            name="supplier"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Supplier</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="frequency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequency</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="referenceNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ref. Number</FormLabel>
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
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
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
                                <FormLabel>MPAN Core/MPRN</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="importLinkDirect"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Import Link Direct</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="importLinkInvoice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Import Link Invoice</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="importLinkProfile"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Import Link Profile</FormLabel>
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
                disabled={!meters || meters.length === 0}
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
            {isLoadingMeters ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow>
                    <TableHead className="font-bold">Site Code <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Supplier <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Frequency <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Ref. Number <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Meter Serial 1 <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">MPAN Profile <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Location <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">MPAN Core/MPRN <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Import Link Direct <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Import Link Invoice <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Import Link Profile <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeters.length > 0 ? (
                    filteredMeters.map((meter, i) => (
                      <TableRow key={meter.id} className={i % 2 === 1 ? "bg-secondary/20" : ""}>
                        <TableCell className="text-xs font-mono text-primary font-medium">{meter.siteCode}</TableCell>
                        <TableCell className="text-sm">{meter.supplier}</TableCell>
                        <TableCell className="text-sm">{meter.frequency}</TableCell>
                        <TableCell className="text-sm">{meter.referenceNumber}</TableCell>
                        <TableCell className="text-sm">{meter.meterSerial1}</TableCell>
                        <TableCell className="text-sm">{meter.mpanProfile}</TableCell>
                        <TableCell className="text-sm">{meter.location}</TableCell>
                        <TableCell className="text-sm">{meter.mpanCoreMprn}</TableCell>
                        <TableCell className="text-sm">{meter.importLinkDirect}</TableCell>
                        <TableCell className="text-sm">{meter.importLinkInvoice}</TableCell>
                        <TableCell className="text-sm">{meter.importLinkProfile}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No meters found</TableCell>
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
