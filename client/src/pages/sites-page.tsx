import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileDown, Settings2, ArrowUpDown, Loader2, Plus, Pencil, Zap, Flame, Droplets, Package } from "lucide-react";
import * as XLSX from 'xlsx';
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Site, DataSet, insertSiteSchema } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "@/components/ui/context-menu";

export default function SitesPage() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [viewingMetersSite, setViewingMetersSite] = useState<Site | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const canCreateSite = user?.role === "admin" || user?.role === "editor";

  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: allMeters } = useQuery<DataSet[]>({
    queryKey: ["/api/data-sets"],
  });

  const siteMeters = viewingMetersSite 
    ? allMeters?.filter(m => m.siteId === viewingMetersSite.id) || []
    : [];

  const getUtilityIcon = (utilityTypeId: number) => {
    switch (utilityTypeId) {
      case 1: return <Zap className="h-4 w-4 text-amber-500" />;
      case 2: return <Flame className="h-4 w-4 text-orange-500" />;
      case 3: return <Droplets className="h-4 w-4 text-blue-500" />;
      default: return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

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
      email: "",
      floorArea: "",
      degreeDayArea: "",
      comments: "",
      latitude: undefined,
      longitude: undefined,
      photoUrl: "",
    },
  });

  const editForm = useForm({
    defaultValues: {
      name: "",
      code: "",
      address: "",
      address2: "",
      town: "",
      county: "",
      postcode: "",
      telephone: "",
      email: "",
      floorArea: "",
      degreeDayArea: "",
      comments: "",
      latitude: "",
      longitude: "",
      photoUrl: "",
    },
  });

  useEffect(() => {
    if (editingSite) {
      editForm.reset({
        name: editingSite.name || "",
        code: editingSite.code || "",
        address: editingSite.address || "",
        address2: editingSite.address2 || "",
        town: editingSite.town || "",
        county: editingSite.county || "",
        postcode: editingSite.postcode || "",
        telephone: editingSite.telephone || "",
        email: editingSite.email || "",
        floorArea: editingSite.floorArea || "",
        degreeDayArea: editingSite.degreeDayArea || "",
        comments: editingSite.comments || "",
        latitude: editingSite.latitude?.toString() || "",
        longitude: editingSite.longitude?.toString() || "",
        photoUrl: editingSite.photoUrl || "",
      });
    }
  }, [editingSite, editForm]);

  const createSiteMutation = useMutation({
    mutationFn: async (values: any) => {
      const formattedValues = {
        ...values,
        floorArea: values.floorArea ? parseFloat(values.floorArea) : null,
      };
      const res = await apiRequest("POST", "/api/sites", formattedValues);
      const text = await res.text();
      if (!text) return null;
      try { return JSON.parse(text); } catch { return null; }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({ title: "Success", description: "Site created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create site", variant: "destructive" });
    },
  });

  const updateSiteMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const cleaned: any = {
        name: values.name || undefined,
        code: values.code || undefined,
        address: values.address || null,
        address2: values.address2 || null,
        town: values.town || null,
        county: values.county || null,
        postcode: values.postcode || null,
        telephone: values.telephone || null,
        email: values.email || null,
        floorArea: values.floorArea ? parseFloat(values.floorArea) : null,
        degreeDayArea: values.degreeDayArea || null,
        comments: values.comments || null,
        latitude: values.latitude ? parseFloat(values.latitude) : null,
        longitude: values.longitude ? parseFloat(values.longitude) : null,
        photoUrl: values.photoUrl || null,
      };
      const res = await apiRequest("PATCH", `/api/sites/${id}`, cleaned);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/hierarchy"] });
      toast({ title: "Success", description: "Site updated successfully" });
      setEditingSite(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update site", variant: "destructive" });
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
    (site.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (site.code?.toLowerCase() || "").includes(search.toLowerCase())
  ) || [];

  const siteFormFields = (formInstance: any) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={formInstance.control}
          name="code"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Site Code</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="name"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Site Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="address"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Address 1</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="address2"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Address 2</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="town"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Town</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="county"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>County</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="postcode"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Post Code</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="telephone"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Telephone</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="email"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="floorArea"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Floor Area</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="latitude"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Latitude</FormLabel>
              <FormControl><Input type="number" step="any" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="longitude"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Longitude</FormLabel>
              <FormControl><Input type="number" step="any" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="degreeDayArea"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Degree Day Area</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="photoUrl"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Photo URL</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={formInstance.control}
        name="comments"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Comments</FormLabel>
            <FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Sites</h1>
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
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              {canCreateSite && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9 bg-primary text-white" data-testid="button-new-site">
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
                        {siteFormFields(form)}
                        <Button type="submit" className="w-full" disabled={createSiteMutation.isPending} data-testid="button-save-site">
                          {createSiteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Site
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
                disabled={!sites || sites.length === 0}
                data-testid="button-export"
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
                      <ContextMenu key={site.id}>
                        <ContextMenuTrigger asChild>
                          <TableRow 
                            className={`${i % 2 === 1 ? "bg-secondary/20" : ""} cursor-pointer`}
                            data-testid={`row-site-${site.id}`}
                            onClick={() => setViewingMetersSite(site)}
                          >
                            <TableCell className="text-xs font-mono text-muted-foreground">{site.code}</TableCell>
                            <TableCell className="text-sm">{site.name}</TableCell>
                            <TableCell className="text-sm">{site.address}</TableCell>
                            <TableCell className="text-sm">{site.town}</TableCell>
                            <TableCell className="text-sm">{site.telephone}</TableCell>
                            <TableCell className="text-sm">{site.email}</TableCell>
                          </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56">
                          <ContextMenuLabel className="text-xs text-muted-foreground truncate">
                            {site.name}
                          </ContextMenuLabel>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => setEditingSite(site)}
                            data-testid={`context-edit-site-${site.id}`}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Site
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
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

      <Dialog open={editingSite !== null} onOpenChange={(open) => { if (!open) setEditingSite(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => editingSite && updateSiteMutation.mutate({ id: editingSite.id, values: data }))} className="space-y-4">
              {siteFormFields(editForm)}
              <Button type="submit" className="w-full" disabled={updateSiteMutation.isPending} data-testid="button-update-site">
                {updateSiteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Site
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewingMetersSite !== null} onOpenChange={(open) => { if (!open) setViewingMetersSite(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Meters at {viewingMetersSite?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {siteMeters.length > 0 ? (
              siteMeters.map(meter => (
                <div 
                  key={meter.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    setViewingMetersSite(null);
                    setLocation(`/meters/${meter.id}`);
                  }}
                  data-testid={`meter-item-${meter.id}`}
                >
                  {getUtilityIcon(meter.utilityTypeId)}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{meter.mpanCoreMprn || meter.name || `Meter ${meter.id}`}</span>
                    {meter.meterSerial1 && (
                      <span className="text-xs text-muted-foreground">Serial: {meter.meterSerial1}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-muted-foreground italic">No meters found for this site.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
