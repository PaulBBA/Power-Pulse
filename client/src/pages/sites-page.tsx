import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileDown, Settings2, ArrowUpDown, Loader2, Plus } from "lucide-react";
import * as XLSX from 'xlsx';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Site, insertSiteSchema } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl,FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SitesPage() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const form = useForm({
    resolver: zodResolver(insertSiteSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      address2: "",
      town: "",
      county: "",
      postcode: "",
      telephone: "",
      floorArea: "",
      degreeDayArea: "",
      comments: "",
    },
  });

  const createSiteMutation = useMutation({
    mutationFn: async (values: any) => {
      // Ensure numeric fields are correctly typed
      const formattedValues = {
        ...values,
        floorArea: values.floorArea ? parseFloat(values.floorArea) : null,
      };
      const res = await apiRequest("POST", "/api/sites", formattedValues);
      
      // Try to parse as text first to avoid 'Unexpected end of JSON input'
      const text = await res.text();
      if (!text) return null;
      
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON response:", text);
        return null;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({ title: "Success", description: "Site created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create site",
        variant: "destructive"
      });
    },
  });

  const handleExport = () => {
    if (!sites) return;
    const worksheet = XLSX.utils.json_to_sheet(sites);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sites");
    XLSX.writeFile(workbook, "BBA_Energy_Sites.xlsx");
  };

  const filteredSites = sites?.filter(site => 
    site.name.toLowerCase().includes(search.toLowerCase()) ||
    site.code.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
                <Input 
                  className="pl-9 h-9" 
                  placeholder="Search sites..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 bg-primary text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    New Site
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Site</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => createSiteMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Site Code</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Site Name</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address 1</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address 2</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="town"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Town</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="county"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>County</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="postcode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Post Code</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="telephone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telephone</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="floorArea"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Floor Area</FormLabel>
                              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="degreeDayArea"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Degree Day Area</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="comments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comments</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createSiteMutation.isPending}>
                        {createSiteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Site
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Button 
                size="sm" 
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm"
                onClick={handleExport}
                disabled={!sites || sites.length === 0}
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
                    <TableHead className="font-bold">Code <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Name <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Address 1 <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Town <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Telephone <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                    <TableHead className="font-bold">Email <ArrowUpDown className="inline ml-1 h-3 w-3" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.length > 0 ? (
                    filteredSites.map((site, i) => (
                      <TableRow key={site.id} className={i % 2 === 1 ? "bg-secondary/20" : ""}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{site.code}</TableCell>
                        <TableCell className="text-sm">{site.name}</TableCell>
                        <TableCell className="text-sm">{site.address}</TableCell>
                        <TableCell className="text-sm">{site.town}</TableCell>
                        <TableCell className="text-sm">{site.telephone}</TableCell>
                        <TableCell className="text-sm">{site.email}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sites found</TableCell>
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
