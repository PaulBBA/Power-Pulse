import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ArrowUpDown, Plus, Loader2, FileSignature, Pencil } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Contract, DataSet, Site } from "@shared/schema";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type SortField = "dateStart" | "dateEnd" | "utility" | "supplier";
type SortDir = "asc" | "desc";

const defaultFormValues = {
  dataSetId: 0,
  supplier: "",
  referenceNumber: "",
  type: "",
  dateStart: "",
  dateEnd: "",
  kva: "",
  maximumInputCapacity: "",
  climateChangeLevy: "",
  fossilFuelLevy: "",
  rateUnits: "",
  rateUnits1Split: "",
  rateFixed: "",
  rateFixedPerDay: false,
  rateKva: "",
  rateKva2: "",
  rateKvaPerDay: false,
  rateKvaSplit: "",
  rateMd: "",
  rateMd2: "",
  rateMdSplit: "",
  rateTransportation: "",
  rateTransportationPerKwh: false,
  rateMetering: "",
  rateMeteringPerDay: false,
  rateSettlements: "",
  rateSettlementsPerDay: false,
  rateTriad: "",
  rateGreen: "",
  rateGreenPercent: "",
  rateFit: "",
  rateRoc: "",
  kwhSplit1: "",
  kwhSplit1CostRate: "",
  kwhSplit2: "",
  kwhSplit2CostRate: "",
  kwhSplit3: "",
  kwhSplit3CostRate: "",
  kwhSplit4: "",
  kwhSplit4CostRate: "",
  kwhSplit5: "",
  kwhSplit5CostRate: "",
  kwhSplit6: "",
  kwhSplit6CostRate: "",
  reactivePower1Rate: "",
  reactivePower1Split: "",
  reactivePower2Rate: "",
  reactivePower2Split: "",
  kvarhDefault: "",
  vat1Rate: "",
  vat2Rate: "",
  vatSplit: "",
  lossAdjustment: false,
  tuos: false,
  useOfSystem: false,
  useDistributorCapacity: false,
  useDistributorReactivePower: false,
  bankHolidays: "",
  billingPoint: "",
  clock: false,
  batch: "",
};

function contractToFormValues(c: Contract) {
  const toStr = (v: any) => (v != null ? String(v) : "");
  const toDate = (v: any) => {
    if (!v) return "";
    try { return new Date(v).toISOString().split("T")[0]; } catch { return ""; }
  };
  return {
    dataSetId: c.dataSetId,
    supplier: c.supplier || "",
    referenceNumber: c.referenceNumber || "",
    type: c.type || "",
    dateStart: toDate(c.dateStart),
    dateEnd: toDate(c.dateEnd),
    kva: toStr(c.kva),
    maximumInputCapacity: toStr(c.maximumInputCapacity),
    climateChangeLevy: toStr(c.climateChangeLevy),
    fossilFuelLevy: toStr(c.fossilFuelLevy),
    rateUnits: toStr(c.rateUnits),
    rateUnits1Split: toStr(c.rateUnits1Split),
    rateFixed: toStr(c.rateFixed),
    rateFixedPerDay: c.rateFixedPerDay ?? false,
    rateKva: toStr(c.rateKva),
    rateKva2: toStr(c.rateKva2),
    rateKvaPerDay: c.rateKvaPerDay ?? false,
    rateKvaSplit: toStr(c.rateKvaSplit),
    rateMd: toStr(c.rateMd),
    rateMd2: toStr(c.rateMd2),
    rateMdSplit: toStr(c.rateMdSplit),
    rateTransportation: toStr(c.rateTransportation),
    rateTransportationPerKwh: c.rateTransportationPerKwh ?? false,
    rateMetering: toStr(c.rateMetering),
    rateMeteringPerDay: c.rateMeteringPerDay ?? false,
    rateSettlements: toStr(c.rateSettlements),
    rateSettlementsPerDay: c.rateSettlementsPerDay ?? false,
    rateTriad: toStr(c.rateTriad),
    rateGreen: toStr(c.rateGreen),
    rateGreenPercent: toStr(c.rateGreenPercent),
    rateFit: toStr(c.rateFit),
    rateRoc: toStr(c.rateRoc),
    kwhSplit1: toStr(c.kwhSplit1),
    kwhSplit1CostRate: toStr(c.kwhSplit1CostRate),
    kwhSplit2: toStr(c.kwhSplit2),
    kwhSplit2CostRate: toStr(c.kwhSplit2CostRate),
    kwhSplit3: toStr(c.kwhSplit3),
    kwhSplit3CostRate: toStr(c.kwhSplit3CostRate),
    kwhSplit4: toStr(c.kwhSplit4),
    kwhSplit4CostRate: toStr(c.kwhSplit4CostRate),
    kwhSplit5: toStr(c.kwhSplit5),
    kwhSplit5CostRate: toStr(c.kwhSplit5CostRate),
    kwhSplit6: toStr(c.kwhSplit6),
    kwhSplit6CostRate: toStr(c.kwhSplit6CostRate),
    reactivePower1Rate: toStr(c.reactivePower1Rate),
    reactivePower1Split: toStr(c.reactivePower1Split),
    reactivePower2Rate: toStr(c.reactivePower2Rate),
    reactivePower2Split: toStr(c.reactivePower2Split),
    kvarhDefault: toStr(c.kvarhDefault),
    vat1Rate: toStr(c.vat1Rate),
    vat2Rate: toStr(c.vat2Rate),
    vatSplit: toStr(c.vatSplit),
    lossAdjustment: c.lossAdjustment ?? false,
    tuos: c.tuos ?? false,
    useOfSystem: c.useOfSystem ?? false,
    useDistributorCapacity: c.useDistributorCapacity ?? false,
    useDistributorReactivePower: c.useDistributorReactivePower ?? false,
    bankHolidays: toStr(c.bankHolidays),
    billingPoint: toStr(c.billingPoint),
    clock: c.clock ?? false,
    batch: toStr(c.batch),
  };
}

export default function ContractsPage() {
  const [sortField, setSortField] = useState<SortField>("dateEnd");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: dataSets } = useQuery<DataSet[]>({
    queryKey: ["/api/data-sets"],
  });

  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const form = useForm({ defaultValues: defaultFormValues });

  useEffect(() => {
    if (editingContract) {
      form.reset(contractToFormValues(editingContract));
    }
  }, [editingContract, form]);

  const getUtilityName = (dataSetId: number) => {
    const ds = dataSets?.find(d => d.id === dataSetId);
    if (!ds) return "—";
    const names: Record<number, string> = { 1: "Electricity", 2: "Gas", 3: "Water", 4: "Oil", 5: "Solid Fuel" };
    return names[ds.utilityTypeId] || `Unknown (${ds.utilityTypeId})`;
  };

  const getMeterName = (dataSetId: number) => {
    const ds = dataSets?.find(d => d.id === dataSetId);
    return ds?.name || ds?.mpanCoreMprn || `Meter ${dataSetId}`;
  };

  const getSiteName = (dataSetId: number) => {
    const ds = dataSets?.find(d => d.id === dataSetId);
    if (!ds) return "";
    const site = sites?.find(s => s.id === ds.siteId);
    return site?.name || "";
  };

  const cleanValues = (values: any) => {
    const cleaned: any = {
      dataSetId: Number(values.dataSetId),
      supplier: values.supplier || null,
      referenceNumber: values.referenceNumber || null,
      type: values.type || null,
      dateStart: values.dateStart || null,
      dateEnd: values.dateEnd || null,
      rateFixedPerDay: values.rateFixedPerDay ?? false,
      rateKvaPerDay: values.rateKvaPerDay ?? false,
      rateTransportationPerKwh: values.rateTransportationPerKwh ?? false,
      rateMeteringPerDay: values.rateMeteringPerDay ?? false,
      rateSettlementsPerDay: values.rateSettlementsPerDay ?? false,
      lossAdjustment: values.lossAdjustment ?? false,
      tuos: values.tuos ?? false,
      useOfSystem: values.useOfSystem ?? false,
      useDistributorCapacity: values.useDistributorCapacity ?? false,
      useDistributorReactivePower: values.useDistributorReactivePower ?? false,
      clock: values.clock ?? false,
    };
    const numericFields = [
      "kva", "maximumInputCapacity", "climateChangeLevy", "fossilFuelLevy",
      "rateUnits", "rateUnits1Split", "rateFixed", "rateKva", "rateKva2", "rateKvaSplit",
      "rateMd", "rateMd2", "rateMdSplit", "rateTransportation", "rateMetering",
      "rateSettlements", "rateTriad", "rateGreen", "rateGreenPercent", "rateFit", "rateRoc",
      "kwhSplit1", "kwhSplit1CostRate", "kwhSplit2", "kwhSplit2CostRate",
      "kwhSplit3", "kwhSplit3CostRate", "kwhSplit4", "kwhSplit4CostRate",
      "kwhSplit5", "kwhSplit5CostRate", "kwhSplit6", "kwhSplit6CostRate",
      "reactivePower1Rate", "reactivePower1Split", "reactivePower2Rate", "reactivePower2Split",
      "kvarhDefault", "vat1Rate", "vat2Rate", "vatSplit",
    ];
    const intFields = ["bankHolidays", "billingPoint", "batch"];
    numericFields.forEach(f => { cleaned[f] = values[f] ? Number(values[f]) : null; });
    intFields.forEach(f => { cleaned[f] = values[f] ? parseInt(values[f]) : null; });
    return cleaned;
  };

  const createContractMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!values.dataSetId || Number(values.dataSetId) === 0) {
        throw new Error("Please select a meter");
      }
      const res = await apiRequest("POST", "/api/contracts", cleanValues(values));
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create contract");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Success", description: "Contract created successfully" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create contract", variant: "destructive" });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const res = await apiRequest("PATCH", `/api/contracts/${id}`, cleanValues(values));
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update contract");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Success", description: "Contract updated successfully" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update contract", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingContract(null);
    form.reset(defaultFormValues);
  };

  const openNewDialog = () => {
    setEditingContract(null);
    form.reset(defaultFormValues);
    setIsDialogOpen(true);
  };

  const openEditDialog = (contract: Contract) => {
    setEditingContract(contract);
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: any) => {
    if (editingContract) {
      updateContractMutation.mutate({ id: editingContract.id, values });
    } else {
      createContractMutation.mutate(values);
    }
  };

  const isSaving = createContractMutation.isPending || updateContractMutation.isPending;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedContracts = useMemo(() => {
    if (!contracts) return [];
    return [...contracts].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "dateStart": {
          const aVal = a.dateStart ? new Date(a.dateStart).getTime() : 0;
          const bVal = b.dateStart ? new Date(b.dateStart).getTime() : 0;
          cmp = aVal - bVal;
          break;
        }
        case "dateEnd": {
          const aVal = a.dateEnd ? new Date(a.dateEnd).getTime() : 0;
          const bVal = b.dateEnd ? new Date(b.dateEnd).getTime() : 0;
          cmp = aVal - bVal;
          break;
        }
        case "utility": {
          cmp = getUtilityName(a.dataSetId).localeCompare(getUtilityName(b.dataSetId));
          break;
        }
        case "supplier": {
          cmp = (a.supplier || "").localeCompare(b.supplier || "");
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [contracts, dataSets, sortField, sortDir]);

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    try { return format(new Date(date), "dd/MM/yyyy"); } catch { return "—"; }
  };

  const textField = (name: string, label: string, placeholder?: string) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }: any) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl><Input {...field} placeholder={placeholder} data-testid={`input-${name}`} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const numberField = (name: string, label: string, placeholder?: string) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }: any) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl><Input {...field} type="number" step="any" placeholder={placeholder} data-testid={`input-${name}`} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const switchField = (name: string, label: string) => (
    <FormField
      control={form.control}
      name={name as any}
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

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
      data-testid={`sort-${field}`}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-primary" : "text-muted-foreground/50"}`} />
        {sortField === field && (
          <span className="text-xs text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </div>
    </TableHead>
  );

  const formFields = (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="dataSetId"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Meter *</FormLabel>
            <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
              <FormControl>
                <SelectTrigger data-testid="select-dataSetId">
                  <SelectValue placeholder="Select a meter" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {dataSets?.map(ds => (
                  <SelectItem key={ds.id} value={ds.id.toString()}>
                    {ds.name || ds.mpanCoreMprn || `Meter ${ds.id}`}
                    {" — "}
                    {getSiteName(ds.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {textField("supplier", "Supplier")}
      {textField("referenceNumber", "Reference Number")}
      <FormField
        control={form.control}
        name="type"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Contract Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Fixed">Fixed</SelectItem>
                <SelectItem value="Variable">Variable</SelectItem>
                <SelectItem value="Flex">Flex</SelectItem>
                <SelectItem value="Deemed">Deemed</SelectItem>
                <SelectItem value="Out of Contract">Out of Contract</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="dateStart"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Start Date</FormLabel>
            <FormControl><Input type="date" {...field} data-testid="input-dateStart" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="dateEnd"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>End Date</FormLabel>
            <FormControl><Input type="date" {...field} data-testid="input-dateEnd" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {sectionHeader("Capacity & Levies")}
      {numberField("kva", "kVA")}
      {numberField("maximumInputCapacity", "Maximum Input Capacity")}
      {numberField("climateChangeLevy", "Climate Change Levy (p)")}
      {numberField("fossilFuelLevy", "Fossil Fuel Levy (p)")}

      {sectionHeader("Rates")}
      {numberField("rateUnits", "Unit Rate (p)")}
      {numberField("rateUnits1Split", "Unit Rate Split")}
      <div className="flex items-end gap-3">
        {numberField("rateFixed", "Fixed Rate (p)")}
      </div>
      {switchField("rateFixedPerDay", "Fixed Rate Per Day")}
      {numberField("rateKva", "kVA Rate (p)")}
      {numberField("rateKva2", "kVA Rate 2 (p)")}
      {switchField("rateKvaPerDay", "kVA Per Day")}
      {numberField("rateKvaSplit", "kVA Split")}
      {numberField("rateMd", "MD Rate (p)")}
      {numberField("rateMd2", "MD Rate 2 (p)")}
      {numberField("rateMdSplit", "MD Split")}
      {numberField("rateTransportation", "Transportation (p)")}
      {switchField("rateTransportationPerKwh", "Transportation Per kWh")}
      {numberField("rateMetering", "Metering (p)")}
      {switchField("rateMeteringPerDay", "Metering Per Day")}
      {numberField("rateSettlements", "Settlements (p)")}
      {switchField("rateSettlementsPerDay", "Settlements Per Day")}
      {numberField("rateTriad", "TRIAD Rate (p)")}
      {numberField("rateGreen", "Green Rate (p)")}
      {numberField("rateGreenPercent", "Green %")}
      {numberField("rateFit", "FIT Rate (p)")}
      {numberField("rateRoc", "ROC Rate (p)")}

      {sectionHeader("kWh Splits")}
      {numberField("kwhSplit1", "Split 1 kWh")}
      {numberField("kwhSplit1CostRate", "Split 1 Cost Rate (p)")}
      {numberField("kwhSplit2", "Split 2 kWh")}
      {numberField("kwhSplit2CostRate", "Split 2 Cost Rate (p)")}
      {numberField("kwhSplit3", "Split 3 kWh")}
      {numberField("kwhSplit3CostRate", "Split 3 Cost Rate (p)")}
      {numberField("kwhSplit4", "Split 4 kWh")}
      {numberField("kwhSplit4CostRate", "Split 4 Cost Rate (p)")}
      {numberField("kwhSplit5", "Split 5 kWh")}
      {numberField("kwhSplit5CostRate", "Split 5 Cost Rate (p)")}
      {numberField("kwhSplit6", "Split 6 kWh")}
      {numberField("kwhSplit6CostRate", "Split 6 Cost Rate (p)")}

      {sectionHeader("Reactive Power")}
      {numberField("reactivePower1Rate", "Reactive Power 1 Rate (p)")}
      {numberField("reactivePower1Split", "Reactive Power 1 Split")}
      {numberField("reactivePower2Rate", "Reactive Power 2 Rate (p)")}
      {numberField("reactivePower2Split", "Reactive Power 2 Split")}
      {numberField("kvarhDefault", "kVArh Default")}

      {sectionHeader("VAT")}
      {numberField("vat1Rate", "VAT Rate 1 (%)")}
      {numberField("vat2Rate", "VAT Rate 2 (%)")}
      {numberField("vatSplit", "VAT Split")}

      {sectionHeader("Flags & Other")}
      <div className="col-span-2 flex flex-wrap gap-6 pt-1">
        {switchField("lossAdjustment", "Loss Adjustment")}
        {switchField("tuos", "TUoS")}
        {switchField("useOfSystem", "Use of System")}
        {switchField("useDistributorCapacity", "Distributor Capacity")}
        {switchField("useDistributorReactivePower", "Distributor Reactive Power")}
        {switchField("clock", "Clock")}
      </div>
      {numberField("bankHolidays", "Bank Holidays")}
      {numberField("billingPoint", "Billing Point")}
      {numberField("batch", "Batch")}
    </div>
  );

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Contracts</h1>
          <p className="text-muted-foreground">Manage supply contracts across all meters</p>
        </div>
        <Button data-testid="button-new-contract" className="gap-2" onClick={openNewDialog}>
          <Plus className="h-4 w-4" />
          New Contract
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            All Contracts
            {contracts && (
              <span className="text-muted-foreground font-normal text-sm">({contracts.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedContracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No contracts found</p>
              <p className="text-sm mt-1">Click "New Contract" to add your first supply contract.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader field="dateStart" label="Start Date" />
                    <SortHeader field="dateEnd" label="End Date" />
                    <SortHeader field="utility" label="Utility" />
                    <SortHeader field="supplier" label="Supplier" />
                    <TableHead>Meter</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedContracts.map((contract) => (
                    <ContextMenu key={contract.id}>
                      <ContextMenuTrigger asChild>
                        <TableRow data-testid={`row-contract-${contract.id}`} className="cursor-pointer hover:bg-muted/50">
                          <TableCell data-testid={`text-start-${contract.id}`}>{formatDate(contract.dateStart)}</TableCell>
                          <TableCell data-testid={`text-end-${contract.id}`}>{formatDate(contract.dateEnd)}</TableCell>
                          <TableCell data-testid={`text-utility-${contract.id}`}>{getUtilityName(contract.dataSetId)}</TableCell>
                          <TableCell data-testid={`text-supplier-${contract.id}`}>{contract.supplier || "—"}</TableCell>
                          <TableCell data-testid={`text-meter-${contract.id}`}>{getMeterName(contract.dataSetId)}</TableCell>
                          <TableCell data-testid={`text-ref-${contract.id}`}>{contract.referenceNumber || "—"}</TableCell>
                          <TableCell data-testid={`text-type-${contract.id}`}>{contract.type || "—"}</TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => openEditDialog(contract)}
                          data-testid={`menu-edit-${contract.id}`}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Contract
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? "Edit Contract" : "New Contract"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {formFields}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} data-testid="button-save-contract">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingContract ? "Save Changes" : "Create Contract"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
