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
import { ArrowUpDown, Plus, Loader2, FileSignature, Pencil, Eye } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Contract, DataSet, Site, Group } from "@shared/schema";
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

function ContractViewDialog({ contract, open, onClose }: { contract: Contract | null; open: boolean; onClose: () => void }) {
  const { data: contractDataRows } = useQuery<any[]>({
    queryKey: [`/api/contracts/${contract?.id}/data`],
    enabled: !!contract?.id && open,
  });

  if (!contract) return null;

  const fmtDate = (v: any) => {
    if (!v) return "-";
    try { return format(new Date(v), "dd/MM/yyyy"); } catch { return "-"; }
  };
  const fmtNum = (v: any, dp = 2) => (v != null && v !== 0 ? Number(v).toFixed(dp) : "-");
  const fmtBool = (v: any) => (v ? "Yes" : "No");

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-1.5 border-b border-muted/40 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <div className="pt-3 pb-1">
      <Separator className="mb-2" />
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
    </div>
  );

  const hasSplits = [contract.kwhSplit1, contract.kwhSplit2, contract.kwhSplit3, contract.kwhSplit4, contract.kwhSplit5, contract.kwhSplit6].some((v: any) => v != null && v !== 0);
  const hasReactive = [contract.reactivePower1Rate, contract.reactivePower2Rate].some((v: any) => v != null && v !== 0);
  const hasContractData = contractDataRows && contractDataRows.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-contract-view-title">Contract Details</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {contract.supplier || "Unknown Supplier"} — {contract.referenceNumber || "No Reference"}
          </p>
        </DialogHeader>

        <div className="space-y-0">
          <DetailRow label="Supplier" value={contract.supplier || "-"} />
          <DetailRow label="Reference Number" value={contract.referenceNumber || "-"} />
          <DetailRow label="Contract Type" value={contract.type || "-"} />
          <DetailRow label="Start Date" value={fmtDate(contract.dateStart)} />
          <DetailRow label="End Date" value={fmtDate(contract.dateEnd)} />

          {hasContractData && (
            <>
              <SectionTitle title="Unit Rates" />
              <div className="border rounded-md overflow-hidden mt-1">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium text-xs">Description</th>
                      <th className="text-right p-2 font-medium text-xs">Rate (p)</th>
                      <th className="text-left p-2 font-medium text-xs">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractDataRows!.map((cd: any) => (
                      <tr key={cd.id} className="border-t" data-testid={`row-contract-data-${cd.id}`}>
                        <td className="p-2">{cd.description || `Rate ${cd.meter}`}</td>
                        <td className="p-2 text-right font-mono">{cd.costRate != null ? Number(cd.costRate).toFixed(4) : "-"}</td>
                        <td className="p-2 text-muted-foreground">{cd.timeStart || ""} – {cd.timeFinish || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <SectionTitle title="Capacity & Levies" />
          <DetailRow label="kVA" value={fmtNum(contract.kva)} />
          <DetailRow label="Maximum Input Capacity" value={fmtNum(contract.maximumInputCapacity)} />
          <DetailRow label="Climate Change Levy (p)" value={fmtNum(contract.climateChangeLevy, 4)} />
          <DetailRow label="Fossil Fuel Levy (p)" value={fmtNum(contract.fossilFuelLevy, 4)} />

          <SectionTitle title="Rates" />
          <DetailRow label="Unit Rate (p)" value={fmtNum(contract.rateUnits, 4)} />
          <DetailRow label="Unit Rate Split" value={fmtNum(contract.rateUnits1Split)} />
          <DetailRow label="Standing Charge (p)" value={fmtNum(contract.rateFixed, 4)} />
          <DetailRow label="Standing Charge Per Day" value={fmtBool(contract.rateFixedPerDay)} />
          <DetailRow label="kVA Rate (p)" value={fmtNum(contract.rateKva, 4)} />
          <DetailRow label="kVA Rate 2 (p)" value={fmtNum(contract.rateKva2, 4)} />
          <DetailRow label="kVA Per Day" value={fmtBool(contract.rateKvaPerDay)} />
          <DetailRow label="kVA Split" value={fmtNum(contract.rateKvaSplit)} />
          <DetailRow label="MD Rate (p)" value={fmtNum(contract.rateMd, 4)} />
          <DetailRow label="MD Rate 2 (p)" value={fmtNum(contract.rateMd2, 4)} />
          <DetailRow label="MD Split" value={fmtNum(contract.rateMdSplit)} />
          <DetailRow label="Transportation (p)" value={fmtNum(contract.rateTransportation, 4)} />
          <DetailRow label="Transportation Per kWh" value={fmtBool(contract.rateTransportationPerKwh)} />
          <DetailRow label="Metering (p)" value={fmtNum(contract.rateMetering, 4)} />
          <DetailRow label="Metering Per Day" value={fmtBool(contract.rateMeteringPerDay)} />
          <DetailRow label="Settlements (p)" value={fmtNum(contract.rateSettlements, 4)} />
          <DetailRow label="Settlements Per Day" value={fmtBool(contract.rateSettlementsPerDay)} />
          <DetailRow label="TRIAD Rate (p)" value={fmtNum(contract.rateTriad, 4)} />
          <DetailRow label="Green Rate (p)" value={fmtNum(contract.rateGreen, 4)} />
          <DetailRow label="Green %" value={fmtNum(contract.rateGreenPercent)} />
          <DetailRow label="FIT Rate (p)" value={fmtNum(contract.rateFit, 4)} />
          <DetailRow label="ROC Rate (p)" value={fmtNum(contract.rateRoc, 4)} />

          {hasSplits && (
            <>
              <SectionTitle title="kWh Splits" />
              <DetailRow label="Split 1 kWh" value={fmtNum(contract.kwhSplit1)} />
              <DetailRow label="Split 1 Cost Rate (p)" value={fmtNum(contract.kwhSplit1CostRate, 4)} />
              <DetailRow label="Split 2 kWh" value={fmtNum(contract.kwhSplit2)} />
              <DetailRow label="Split 2 Cost Rate (p)" value={fmtNum(contract.kwhSplit2CostRate, 4)} />
              <DetailRow label="Split 3 kWh" value={fmtNum(contract.kwhSplit3)} />
              <DetailRow label="Split 3 Cost Rate (p)" value={fmtNum(contract.kwhSplit3CostRate, 4)} />
              <DetailRow label="Split 4 kWh" value={fmtNum(contract.kwhSplit4)} />
              <DetailRow label="Split 4 Cost Rate (p)" value={fmtNum(contract.kwhSplit4CostRate, 4)} />
              <DetailRow label="Split 5 kWh" value={fmtNum(contract.kwhSplit5)} />
              <DetailRow label="Split 5 Cost Rate (p)" value={fmtNum(contract.kwhSplit5CostRate, 4)} />
              <DetailRow label="Split 6 kWh" value={fmtNum(contract.kwhSplit6)} />
              <DetailRow label="Split 6 Cost Rate (p)" value={fmtNum(contract.kwhSplit6CostRate, 4)} />
            </>
          )}

          {hasReactive && (
            <>
              <SectionTitle title="Reactive Power" />
              <DetailRow label="Reactive Power 1 Rate (p)" value={fmtNum(contract.reactivePower1Rate, 4)} />
              <DetailRow label="Reactive Power 1 Split" value={fmtNum(contract.reactivePower1Split)} />
              <DetailRow label="Reactive Power 2 Rate (p)" value={fmtNum(contract.reactivePower2Rate, 4)} />
              <DetailRow label="Reactive Power 2 Split" value={fmtNum(contract.reactivePower2Split)} />
              <DetailRow label="kVArh Default" value={fmtNum(contract.kvarhDefault)} />
            </>
          )}

          <SectionTitle title="VAT" />
          <DetailRow label="VAT Rate 1 (%)" value={fmtNum(contract.vat1Rate)} />
          <DetailRow label="VAT Rate 2 (%)" value={fmtNum(contract.vat2Rate)} />
          <DetailRow label="VAT Split" value={fmtNum(contract.vatSplit)} />

          <SectionTitle title="Flags & Other" />
          <DetailRow label="Loss Adjustment" value={fmtBool(contract.lossAdjustment)} />
          <DetailRow label="TUoS" value={fmtBool(contract.tuos)} />
          <DetailRow label="Use of System" value={fmtBool(contract.useOfSystem)} />
          <DetailRow label="Distributor Capacity" value={fmtBool(contract.useDistributorCapacity)} />
          <DetailRow label="Distributor Reactive Power" value={fmtBool(contract.useDistributorReactivePower)} />
          <DetailRow label="Clock" value={fmtBool(contract.clock)} />
          <DetailRow label="Bank Holidays" value={fmtNum(contract.bankHolidays, 0)} />
          <DetailRow label="Billing Point" value={fmtNum(contract.billingPoint, 0)} />
          <DetailRow label="Batch" value={fmtNum(contract.batch, 0)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ContractsPage() {
  const [sortField, setSortField] = useState<SortField>("dateEnd");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
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

  const { data: groups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const { data: siteGroupMappings } = useQuery<{ id: number; siteId: number; groupId: number }[]>({
    queryKey: ["/api/site-groups"],
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

  const getGroupIdsForContract = (dataSetId: number): number[] => {
    const ds = dataSets?.find(d => d.id === dataSetId);
    if (!ds || !siteGroupMappings) return [];
    return siteGroupMappings.filter(sg => sg.siteId === ds.siteId).map(sg => sg.groupId);
  };

  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    if (selectedGroupId === "all") return contracts;
    const gid = parseInt(selectedGroupId);
    return contracts.filter(c => getGroupIdsForContract(c.dataSetId).includes(gid));
  }, [contracts, dataSets, siteGroupMappings, selectedGroupId]);

  const sortedContracts = useMemo(() => {
    if (!filteredContracts.length) return [];
    return [...filteredContracts].sort((a, b) => {
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
  }, [filteredContracts, dataSets, sortField, sortDir]);

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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              {selectedGroupId === "all" ? "All Contracts" : `Contracts — ${groups?.find(g => g.id === parseInt(selectedGroupId))?.name || "Group"}`}
              <span className="text-muted-foreground font-normal text-sm">({filteredContracts.length})</span>
            </CardTitle>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="w-[220px]" data-testid="select-group-filter">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectItem value="all">All Groups</SelectItem>
                {groups?.sort((a, b) => a.name.localeCompare(b.name)).map(g => (
                  <SelectItem key={g.id} value={g.id.toString()} data-testid={`option-group-${g.id}`}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                    <TableHead>Site</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedContracts.map((contract) => (
                    <ContextMenu key={contract.id}>
                      <ContextMenuTrigger asChild>
                        <TableRow
                          data-testid={`row-contract-${contract.id}`}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setViewingContract(contract)}
                        >
                          <TableCell data-testid={`text-start-${contract.id}`}>{formatDate(contract.dateStart)}</TableCell>
                          <TableCell data-testid={`text-end-${contract.id}`}>{formatDate(contract.dateEnd)}</TableCell>
                          <TableCell data-testid={`text-utility-${contract.id}`}>{getUtilityName(contract.dataSetId)}</TableCell>
                          <TableCell data-testid={`text-supplier-${contract.id}`}>{contract.supplier || "—"}</TableCell>
                          <TableCell data-testid={`text-meter-${contract.id}`}>{getMeterName(contract.dataSetId)}</TableCell>
                          <TableCell data-testid={`text-site-${contract.id}`}>{getSiteName(contract.dataSetId) || "—"}</TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => setViewingContract(contract)}
                          data-testid={`menu-view-${contract.id}`}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </ContextMenuItem>
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

      <ContractViewDialog
        contract={viewingContract}
        open={!!viewingContract}
        onClose={() => setViewingContract(null)}
      />
    </Layout>
  );
}
