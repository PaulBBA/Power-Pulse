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
import { Switch } from "@/components/ui/switch";
import { Search, FileDown, Settings2, ArrowUpDown, Loader2, Plus, Pencil, ArrowRightLeft } from "lucide-react";
import * as XLSX from 'xlsx';
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataSet, Site, insertDataSetSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { Separator } from "@/components/ui/separator";

export default function MetersPage() {
  const [search, setSearch] = useState("");
  const [utilityFilter, setUtilityFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<DataSet | null>(null);
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

  const defaultFormValues = {
    name: "",
    siteId: 0,
    utilityTypeId: 1,
    mpanProfile: "",
    mpanCoreMprn: "",
    meterSerial1: "",
    location: "",
    supplierId: null as number | null,
    isActive: true,
    isVirtual: false,
    tariffName: "",
    meterType: "",
    dateClosed: "",
    code: "",
    code2: "",
    hostSupplier: "",
    billFrequency: "",
    annualQuantity: "",
    meterDigits: "",
    meterNumber: "",
    otherNumber: "",
    subMeter: false,
    aggregateMeter: false,
    landlordBilled: false,
    interruptible: false,
    vatRate: "",
    tariffCclRate: "",
    comments: "",
    units: "",
    kva: "",
    voltage: "",
    powerFactor: "",
    eac: "",
    profileMeter: false,
    profileFrequency: "",
    profileScaleFactor: "",
    profileKwhFactor: "",
    profileCalorificValue: "",
    profileCorrectionFactor: "",
    profileCostRate: "",
    profileMeterMax: "",
    profileThreshold1: "",
    profileThreshold2: "",
    meterOperator: "",
    meterAssetManager: "",
    mhhsApplied: false,
    rotaDisconnectionAlphaId: "",
    gasMeterSize: "",
    nominatedSoq: "",
    soqPeak: "",
    soqAlternative: "",
    soqMinimum: "",
    supplyHourlyQuantity: "",
    kwhFactor: "",
    meterSize: "",
    meterSize2: "",
    meterTypeCapacity: "",
    returnToSewer: "",
    highwayDrainage: false,
    surfaceWater: false,
    sewerageSupplier: "",
    waterSupplier: "",
    sewerageWholesaleTariff: "",
    waterWholesaleTariff: "",
  };

  const form = useForm({
    defaultValues: defaultFormValues,
  });

  const editForm = useForm({
    defaultValues: defaultFormValues,
  });

  const watchUtilityType = form.watch("utilityTypeId");
  const editWatchUtilityType = editForm.watch("utilityTypeId");

  useEffect(() => {
    if (editingMeter) {
      editForm.reset({
        name: editingMeter.name || "",
        siteId: editingMeter.siteId,
        utilityTypeId: editingMeter.utilityTypeId,
        mpanProfile: editingMeter.mpanProfile || "",
        mpanCoreMprn: editingMeter.mpanCoreMprn || "",
        meterSerial1: editingMeter.meterSerial1 || "",
        location: editingMeter.location || "",
        supplierId: editingMeter.supplierId ?? null,
        tariffName: editingMeter.tariffName || "",
        meterType: editingMeter.meterType || "",
        isVirtual: editingMeter.isVirtual ?? false,
        isActive: editingMeter.isActive ?? true,
        dateClosed: editingMeter.dateClosed ? new Date(editingMeter.dateClosed).toISOString().split("T")[0] : "",
        code: editingMeter.code || "",
        code2: editingMeter.code2 || "",
        hostSupplier: editingMeter.hostSupplier || "",
        billFrequency: editingMeter.billFrequency || "",
        annualQuantity: editingMeter.annualQuantity?.toString() || "",
        meterDigits: editingMeter.meterDigits?.toString() || "",
        meterNumber: editingMeter.meterNumber || "",
        otherNumber: editingMeter.otherNumber || "",
        subMeter: editingMeter.subMeter ?? false,
        aggregateMeter: editingMeter.aggregateMeter ?? false,
        landlordBilled: editingMeter.landlordBilled ?? false,
        interruptible: editingMeter.interruptible ?? false,
        vatRate: editingMeter.vatRate?.toString() || "",
        tariffCclRate: editingMeter.tariffCclRate?.toString() || "",
        comments: editingMeter.comments || "",
        units: editingMeter.units || "",
        kva: editingMeter.kva?.toString() || "",
        voltage: editingMeter.voltage || "",
        powerFactor: editingMeter.powerFactor?.toString() || "",
        eac: editingMeter.eac?.toString() || "",
        profileMeter: editingMeter.profileMeter ?? false,
        profileFrequency: editingMeter.profileFrequency || "",
        profileScaleFactor: editingMeter.profileScaleFactor?.toString() || "",
        profileKwhFactor: editingMeter.profileKwhFactor?.toString() || "",
        profileCalorificValue: editingMeter.profileCalorificValue?.toString() || "",
        profileCorrectionFactor: editingMeter.profileCorrectionFactor?.toString() || "",
        profileCostRate: editingMeter.profileCostRate?.toString() || "",
        profileMeterMax: editingMeter.profileMeterMax?.toString() || "",
        profileThreshold1: editingMeter.profileThreshold1?.toString() || "",
        profileThreshold2: editingMeter.profileThreshold2?.toString() || "",
        meterOperator: editingMeter.meterOperator || "",
        meterAssetManager: editingMeter.meterAssetManager || "",
        mhhsApplied: editingMeter.mhhsApplied ?? false,
        rotaDisconnectionAlphaId: editingMeter.rotaDisconnectionAlphaId || "",
        gasMeterSize: editingMeter.gasMeterSize || "",
        nominatedSoq: editingMeter.nominatedSoq?.toString() || "",
        soqPeak: editingMeter.soqPeak?.toString() || "",
        soqAlternative: editingMeter.soqAlternative?.toString() || "",
        soqMinimum: editingMeter.soqMinimum?.toString() || "",
        supplyHourlyQuantity: editingMeter.supplyHourlyQuantity?.toString() || "",
        kwhFactor: editingMeter.kwhFactor?.toString() || "",
        meterSize: editingMeter.meterSize?.toString() || "",
        meterSize2: editingMeter.meterSize2?.toString() || "",
        meterTypeCapacity: editingMeter.meterTypeCapacity?.toString() || "",
        returnToSewer: editingMeter.returnToSewer?.toString() || "",
        highwayDrainage: editingMeter.highwayDrainage ?? false,
        surfaceWater: editingMeter.surfaceWater ?? false,
        sewerageSupplier: editingMeter.sewerageSupplier || "",
        waterSupplier: editingMeter.waterSupplier || "",
        sewerageWholesaleTariff: editingMeter.sewerageWholesaleTariff || "",
        waterWholesaleTariff: editingMeter.waterWholesaleTariff || "",
      });
    }
  }, [editingMeter, editForm]);

  const cleanValues = (values: any) => {
    const cleaned: any = {
      name: values.name || null,
      siteId: values.siteId ? Number(values.siteId) : null,
      utilityTypeId: values.utilityTypeId ? Number(values.utilityTypeId) : null,
      mpanProfile: values.mpanProfile || null,
      mpanCoreMprn: values.mpanCoreMprn || null,
      meterSerial1: values.meterSerial1 || null,
      location: values.location || null,
      supplierId: values.supplierId ? Number(values.supplierId) : null,
      tariffName: values.tariffName || null,
      meterType: values.meterType || null,
      isVirtual: values.isVirtual ?? false,
      isActive: values.isActive ?? true,
      dateClosed: values.dateClosed ? new Date(values.dateClosed) : null,
      code: values.code || null,
      code2: values.code2 || null,
      hostSupplier: values.hostSupplier || null,
      billFrequency: values.billFrequency || null,
      annualQuantity: values.annualQuantity ? Number(values.annualQuantity) : null,
      meterDigits: values.meterDigits ? Number(values.meterDigits) : null,
      meterNumber: values.meterNumber || null,
      otherNumber: values.otherNumber || null,
      subMeter: values.subMeter ?? false,
      aggregateMeter: values.aggregateMeter ?? false,
      landlordBilled: values.landlordBilled ?? false,
      interruptible: values.interruptible ?? false,
      vatRate: values.vatRate ? Number(values.vatRate) : null,
      tariffCclRate: values.tariffCclRate ? Number(values.tariffCclRate) : null,
      comments: values.comments || null,
      units: values.units || null,
      kva: values.kva ? Number(values.kva) : null,
      voltage: values.voltage || null,
      powerFactor: values.powerFactor ? Number(values.powerFactor) : null,
      eac: values.eac ? Number(values.eac) : null,
      profileMeter: values.profileMeter ?? false,
      profileFrequency: values.profileFrequency || null,
      profileScaleFactor: values.profileScaleFactor ? Number(values.profileScaleFactor) : null,
      profileKwhFactor: values.profileKwhFactor ? Number(values.profileKwhFactor) : null,
      profileCalorificValue: values.profileCalorificValue ? Number(values.profileCalorificValue) : null,
      profileCorrectionFactor: values.profileCorrectionFactor ? Number(values.profileCorrectionFactor) : null,
      profileCostRate: values.profileCostRate ? Number(values.profileCostRate) : null,
      profileMeterMax: values.profileMeterMax ? Number(values.profileMeterMax) : null,
      profileThreshold1: values.profileThreshold1 ? Number(values.profileThreshold1) : null,
      profileThreshold2: values.profileThreshold2 ? Number(values.profileThreshold2) : null,
      meterOperator: values.meterOperator || null,
      meterAssetManager: values.meterAssetManager || null,
      mhhsApplied: values.mhhsApplied ?? false,
      rotaDisconnectionAlphaId: values.rotaDisconnectionAlphaId || null,
      gasMeterSize: values.gasMeterSize || null,
      nominatedSoq: values.nominatedSoq ? Number(values.nominatedSoq) : null,
      soqPeak: values.soqPeak ? Number(values.soqPeak) : null,
      soqAlternative: values.soqAlternative ? Number(values.soqAlternative) : null,
      soqMinimum: values.soqMinimum ? Number(values.soqMinimum) : null,
      supplyHourlyQuantity: values.supplyHourlyQuantity ? Number(values.supplyHourlyQuantity) : null,
      kwhFactor: values.kwhFactor ? Number(values.kwhFactor) : null,
      meterSize: values.meterSize ? Number(values.meterSize) : null,
      meterSize2: values.meterSize2 ? Number(values.meterSize2) : null,
      meterTypeCapacity: values.meterTypeCapacity ? Number(values.meterTypeCapacity) : null,
      returnToSewer: values.returnToSewer ? Number(values.returnToSewer) : null,
      highwayDrainage: values.highwayDrainage ?? false,
      surfaceWater: values.surfaceWater ?? false,
      sewerageSupplier: values.sewerageSupplier || null,
      waterSupplier: values.waterSupplier || null,
      sewerageWholesaleTariff: values.sewerageWholesaleTariff || null,
      waterWholesaleTariff: values.waterWholesaleTariff || null,
    };
    return cleaned;
  };

  const createMeterMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/data-sets", cleanValues(values));
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create meter");
      }
      const text = await res.text();
      if (!text) return null;
      try { return JSON.parse(text); } catch { return null; }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/hierarchy"] });
      toast({ title: "Success", description: "Meter created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create meter", variant: "destructive" });
    },
  });

  const updateMeterMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const cleaned = cleanValues(values);
      const res = await apiRequest("PATCH", `/api/data-sets/${id}`, cleaned);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/hierarchy"] });
      toast({ title: "Success", description: "Meter updated successfully" });
      setEditingMeter(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update meter", variant: "destructive" });
    },
  });

  const moveMeterMutation = useMutation({
    mutationFn: async ({ id, siteId }: { id: number; siteId: number }) => {
      const res = await apiRequest("PATCH", `/api/data-sets/${id}`, { siteId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/hierarchy"] });
      toast({ title: "Success", description: "Meter moved to new site" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to move meter", variant: "destructive" });
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
    const matchesSearch = (ds.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (ds.mpanCoreMprn && ds.mpanCoreMprn.toLowerCase().includes(search.toLowerCase())) ||
      (ds.meterSerial1 && ds.meterSerial1.toLowerCase().includes(search.toLowerCase()));
    
    if (utilityFilter === "all") return matchesSearch;
    const utilityMap: Record<string, number> = { "elec": 1, "gas": 2, "water": 3 };
    return matchesSearch && ds.utilityTypeId === utilityMap[utilityFilter];
  }) || [];

  const getUtilityName = (id: number) => {
    const names: Record<number, string> = { 1: "Electricity", 2: "Gas", 3: "Water" };
    return names[id] || `Unknown (${id})`;
  };

  const getSiteName = (siteId: number) => {
    const site = sites?.find(s => s.id === siteId);
    return site?.name || `Site ${siteId}`;
  };

  const textField = (formInstance: any, name: string, label: string, placeholder?: string) => (
    <FormField
      control={formInstance.control}
      name={name}
      render={({ field }: any) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl><Input {...field} placeholder={placeholder} data-testid={`input-${name}`} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const numberField = (formInstance: any, name: string, label: string) => (
    <FormField
      control={formInstance.control}
      name={name}
      render={({ field }: any) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl><Input {...field} type="number" step="any" data-testid={`input-${name}`} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const switchField = (formInstance: any, name: string, label: string) => (
    <FormField
      control={formInstance.control}
      name={name}
      render={({ field }: any) => (
        <FormItem className="flex items-center gap-3 space-y-0">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid={`switch-${name}`} />
          </FormControl>
        </FormItem>
      )}
    />
  );

  const sectionHeader = (title: string) => (
    <div className="col-span-2 pt-2">
      <Separator className="mb-2" />
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
    </div>
  );

  const commonTopFields = (formInstance: any) => (
    <>
      <FormField
        control={formInstance.control}
        name="siteId"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Site</FormLabel>
            <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
              <FormControl>
                <SelectTrigger data-testid="select-siteId">
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
        control={formInstance.control}
        name="utilityTypeId"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Utility Type</FormLabel>
            <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
              <FormControl>
                <SelectTrigger data-testid="select-utilityTypeId">
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
      {textField(formInstance, "name", "Meter Name")}
      {textField(formInstance, "mpanCoreMprn", "MPAN Core / MPRN")}
      {textField(formInstance, "mpanProfile", "MPAN Profile")}
      {textField(formInstance, "meterSerial1", "Meter Serial")}
      {textField(formInstance, "location", "Location")}
      {textField(formInstance, "meterNumber", "Meter Number")}
    </>
  );

  const generalFields = (formInstance: any) => (
    <>
      {sectionHeader("General")}
      {textField(formInstance, "code", "Code")}
      {textField(formInstance, "code2", "Code 2")}
      {textField(formInstance, "hostSupplier", "Host Supplier")}
      {textField(formInstance, "billFrequency", "Bill Frequency")}
      {numberField(formInstance, "annualQuantity", "Annual Quantity")}
      {numberField(formInstance, "meterDigits", "Meter Digits")}
      {textField(formInstance, "otherNumber", "Other Number")}
      {textField(formInstance, "units", "Units")}
      {numberField(formInstance, "vatRate", "VAT Rate")}
      {numberField(formInstance, "tariffCclRate", "CCL Rate")}
      <FormField
        control={formInstance.control}
        name="supplierId"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Supplier ID</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ""} data-testid="input-supplierId" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {textField(formInstance, "tariffName", "Tariff Name")}
      <FormField
        control={formInstance.control}
        name="meterType"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Meter Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger data-testid="select-meterType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Main">Main</SelectItem>
                <SelectItem value="Sub-meter">Sub-meter</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={formInstance.control}
        name="dateClosed"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Date Closed</FormLabel>
            <FormControl><Input type="date" {...field} data-testid="input-dateClosed" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="col-span-2">
        <FormField
          control={formInstance.control}
          name="comments"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Comments</FormLabel>
              <FormControl><Input {...field} data-testid="input-comments" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="col-span-2 flex flex-wrap gap-6 pt-1">
        {switchField(formInstance, "isActive", "Active")}
        {switchField(formInstance, "isVirtual", "Virtual Meter")}
        {switchField(formInstance, "subMeter", "Sub Meter")}
        {switchField(formInstance, "aggregateMeter", "Aggregate Meter")}
        {switchField(formInstance, "landlordBilled", "Landlord Billed")}
        {switchField(formInstance, "interruptible", "Interruptible")}
      </div>
    </>
  );

  const electricityFields = (formInstance: any) => (
    <>
      {sectionHeader("Electricity")}
      {numberField(formInstance, "kva", "kVA")}
      {textField(formInstance, "voltage", "Voltage")}
      {numberField(formInstance, "powerFactor", "Power Factor")}
      {numberField(formInstance, "eac", "EAC")}
      {textField(formInstance, "meterOperator", "Meter Operator")}
      {textField(formInstance, "meterAssetManager", "Meter Asset Manager")}
      {textField(formInstance, "rotaDisconnectionAlphaId", "Rota Disconnection Alpha ID")}
      {sectionHeader("Profile Settings")}
      {textField(formInstance, "profileFrequency", "Profile Frequency")}
      {numberField(formInstance, "profileScaleFactor", "Profile Scale Factor")}
      {numberField(formInstance, "profileKwhFactor", "Profile kWh Factor")}
      {numberField(formInstance, "profileCalorificValue", "Profile Calorific Value")}
      {numberField(formInstance, "profileCorrectionFactor", "Profile Correction Factor")}
      {numberField(formInstance, "profileCostRate", "Profile Cost Rate")}
      {numberField(formInstance, "profileMeterMax", "Profile Meter Max")}
      {numberField(formInstance, "profileThreshold1", "Profile Threshold 1")}
      {numberField(formInstance, "profileThreshold2", "Profile Threshold 2")}
      <div className="col-span-2 flex flex-wrap gap-6 pt-1">
        {switchField(formInstance, "profileMeter", "Profile Meter")}
        {switchField(formInstance, "mhhsApplied", "MHHS Applied")}
      </div>
    </>
  );

  const gasFields = (formInstance: any) => (
    <>
      {sectionHeader("Gas")}
      {textField(formInstance, "gasMeterSize", "Gas Meter Size")}
      {numberField(formInstance, "nominatedSoq", "Nominated SOQ")}
      {numberField(formInstance, "soqPeak", "SOQ Peak")}
      {numberField(formInstance, "soqAlternative", "SOQ Alternative")}
      {numberField(formInstance, "soqMinimum", "SOQ Minimum")}
      {numberField(formInstance, "supplyHourlyQuantity", "Supply Hourly Quantity")}
      {numberField(formInstance, "kwhFactor", "kWh Factor")}
    </>
  );

  const waterFields = (formInstance: any) => (
    <>
      {sectionHeader("Water")}
      {numberField(formInstance, "meterSize", "Meter Size")}
      {numberField(formInstance, "meterSize2", "Meter Size 2")}
      {numberField(formInstance, "meterTypeCapacity", "Meter Type Capacity")}
      {numberField(formInstance, "returnToSewer", "Return to Sewer %")}
      {textField(formInstance, "sewerageSupplier", "Sewerage Supplier")}
      {textField(formInstance, "waterSupplier", "Water Supplier")}
      {textField(formInstance, "sewerageWholesaleTariff", "Sewerage Wholesale Tariff")}
      {textField(formInstance, "waterWholesaleTariff", "Water Wholesale Tariff")}
      <div className="col-span-2 flex flex-wrap gap-6 pt-1">
        {switchField(formInstance, "highwayDrainage", "Highway Drainage")}
        {switchField(formInstance, "surfaceWater", "Surface Water")}
      </div>
    </>
  );

  const meterFormFields = (formInstance: any, utilityType: number) => (
    <div className="grid grid-cols-2 gap-4">
      {commonTopFields(formInstance)}
      {generalFields(formInstance)}
      {utilityType === 1 && electricityFields(formInstance)}
      {utilityType === 2 && gasFields(formInstance)}
      {utilityType === 3 && waterFields(formInstance)}
    </div>
  );

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Data Sets (Meters)</h1>
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
                <SelectTrigger className="w-32 h-9" data-testid="select-utility-filter">
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
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              {canCreateMeter && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9 bg-primary text-white" data-testid="button-new-meter">
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
                        {meterFormFields(form, watchUtilityType)}
                        <Button type="submit" className="w-full" disabled={createMeterMutation.isPending} data-testid="button-save-meter">
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
                    <TableHead className="font-bold">Utility Type</TableHead>
                    <TableHead className="font-bold">MPAN Profile</TableHead>
                    <TableHead className="font-bold">MPAN Core / MPRN</TableHead>
                    <TableHead className="font-bold">Meter Serial 1</TableHead>
                    <TableHead className="font-bold">Location</TableHead>
                    <TableHead className="font-bold">Supplier ID</TableHead>
                    <TableHead className="font-bold">Site</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDataSets.length > 0 ? (
                    filteredDataSets.map((ds, i) => (
                      <ContextMenu key={ds.id}>
                        <ContextMenuTrigger asChild>
                          <TableRow 
                            className={`${i % 2 === 1 ? "bg-secondary/20" : ""} cursor-pointer`}
                            data-testid={`row-meter-${ds.id}`}
                          >
                            <TableCell className="text-sm">{getUtilityName(ds.utilityTypeId)}</TableCell>
                            <TableCell className="text-sm">{ds.mpanProfile}</TableCell>
                            <TableCell className="text-sm">{ds.mpanCoreMprn}</TableCell>
                            <TableCell className="text-sm">{ds.meterSerial1}</TableCell>
                            <TableCell className="text-sm">{ds.location}</TableCell>
                            <TableCell className="text-sm">{ds.supplierId || '-'}</TableCell>
                            <TableCell className="text-sm">{getSiteName(ds.siteId)}</TableCell>
                          </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56">
                          <ContextMenuLabel className="text-xs text-muted-foreground truncate">
                            {ds.mpanCoreMprn || ds.name || `Meter ${ds.id}`}
                          </ContextMenuLabel>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => setEditingMeter(ds)}
                            data-testid={`context-edit-${ds.id}`}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Meter
                          </ContextMenuItem>
                          <ContextMenuSub>
                            <ContextMenuSubTrigger>
                              <ArrowRightLeft className="mr-2 h-4 w-4" />
                              Move to Site
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-56 max-h-64 overflow-y-auto">
                              {sites?.filter(s => s.id !== ds.siteId).map(site => (
                                <ContextMenuItem
                                  key={site.id}
                                  onClick={() => moveMeterMutation.mutate({ id: ds.id, siteId: site.id })}
                                  data-testid={`context-move-${ds.id}-${site.id}`}
                                >
                                  {site.name}
                                </ContextMenuItem>
                              ))}
                            </ContextMenuSubContent>
                          </ContextMenuSub>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No meters found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editingMeter !== null} onOpenChange={(open) => { if (!open) setEditingMeter(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Meter</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => editingMeter && updateMeterMutation.mutate({ id: editingMeter.id, values: data }))} className="space-y-4">
              {meterFormFields(editForm, editWatchUtilityType)}
              <Button type="submit" className="w-full" disabled={updateMeterMutation.isPending} data-testid="button-update-meter">
                {updateMeterMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Meter
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
