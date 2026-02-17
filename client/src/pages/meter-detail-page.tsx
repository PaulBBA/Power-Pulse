import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Zap, Flame, Droplets, Package, Loader2,
  FileText, Gauge, BarChart3, Clock, Building2, ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { format } from "date-fns";

function getUtilityIcon(code: string, size = "h-5 w-5") {
  switch (code) {
    case "E": return <Zap className={`${size} text-amber-500`} />;
    case "G": return <Flame className={`${size} text-orange-500`} />;
    case "W": return <Droplets className={`${size} text-blue-500`} />;
    default: return <Package className={`${size} text-gray-500`} />;
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return "";
  try { return format(new Date(d), "dd/MM/yyyy"); } catch { return ""; }
}

function DetailField({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div data-testid={`field-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</p>
    </div>
  );
}

function MeterDetailsHeader({ meter }: { meter: any }) {
  const utilityCode = meter.utility?.code || "";
  const utilityName = meter.utility?.name || "Unknown";

  const elecFields = utilityCode === "E" ? [
    { label: "MPAN Profile", value: meter.mpanProfile },
    { label: "MPAN Core", value: meter.mpanCoreMprn },
    { label: "Meter Serial", value: meter.meterSerial1 },
    { label: "Meter Operator", value: meter.meterOperator },
    { label: "Meter Type", value: meter.meterType },
    { label: "KVA", value: meter.kva },
    { label: "Voltage", value: meter.voltage },
    { label: "Power Factor", value: meter.powerFactor },
    { label: "EAC", value: meter.eac },
    { label: "Annual Quantity", value: meter.annualQuantity },
    { label: "Profile Meter", value: meter.profileMeter },
    { label: "MHHS Applied", value: meter.mhhsApplied },
    { label: "VAT Rate %", value: meter.vatRate },
    { label: "CCL Rate", value: meter.tariffCclRate },
  ] : utilityCode === "G" ? [
    { label: "MPRN", value: meter.mpanCoreMprn },
    { label: "Meter Serial", value: meter.meterSerial1 },
    { label: "Gas Meter Size", value: meter.gasMeterSize },
    { label: "Annual Quantity", value: meter.annualQuantity },
    { label: "Nominated SOQ", value: meter.nominatedSoq },
    { label: "SOQ Peak", value: meter.soqPeak },
    { label: "kWh Factor", value: meter.kwhFactor },
    { label: "VAT Rate %", value: meter.vatRate },
    { label: "CCL Rate", value: meter.tariffCclRate },
  ] : [
    { label: "Reference", value: meter.mpanCoreMprn },
    { label: "Meter Serial", value: meter.meterSerial1 },
    { label: "Meter Size", value: meter.meterSize },
    { label: "Annual Quantity", value: meter.annualQuantity },
    { label: "Return to Sewer %", value: meter.returnToSewer },
    { label: "Highway Drainage", value: meter.highwayDrainage },
    { label: "Surface Water", value: meter.surfaceWater },
    { label: "VAT Rate %", value: meter.vatRate },
  ];

  const commonFields = [
    { label: "Location", value: meter.location },
    { label: "Tariff Name", value: meter.tariffName },
    { label: "Bill Frequency", value: meter.billFrequency },
    { label: "Sub-Meter", value: meter.subMeter },
    { label: "Virtual Meter", value: meter.isVirtual },
    { label: "Active", value: meter.isActive },
    { label: "Date Closed", value: meter.dateClosed ? formatDate(meter.dateClosed) : null },
  ];

  const allFields = [...elecFields, ...commonFields].filter(f => f.value !== null && f.value !== undefined && f.value !== "");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {getUtilityIcon(utilityCode)}
          <div>
            <CardTitle className="text-xl" data-testid="text-meter-title">
              {meter.mpanCoreMprn || meter.name || `Meter ${meter.id}`}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{utilityName}</Badge>
              {meter.site && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {meter.site.name}
                  {meter.site.postcode && `, ${meter.site.postcode}`}
                </span>
              )}
              {meter.isActive === false && (
                <Badge variant="destructive" className="text-xs">Closed</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-3">
          {allFields.map((f, i) => (
            <DetailField key={i} label={f.label} value={f.value} />
          ))}
        </div>
        {meter.comments && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">Comments</p>
            <p className="text-sm">{meter.comments}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type SortDir = "asc" | "desc";
type ContractSortKey = "supplier" | "referenceNumber" | "type" | "dateStart" | "dateEnd" | "kwhSplit1CostRate" | "kwhSplit2CostRate" | "rateFixed";
type InvoiceSortKey = "date" | "previousDate" | "units" | "cost" | "standingCharge" | "otherCharge" | "vat";

function SortableHeader<T extends string>({ label, sortKey, currentSort, currentDir, onSort, align = "left" }: {
  label: string; sortKey: T; currentSort: T; currentDir: SortDir;
  onSort: (key: T) => void; align?: "left" | "right";
}) {
  const active = currentSort === sortKey;
  const Icon = active ? (currentDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={`${align === "right" ? "text-right" : "text-left"} p-2 font-medium cursor-pointer select-none hover:bg-muted/80 transition-colors`}
      onClick={() => onSort(sortKey)}
      data-testid={`sort-${sortKey}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={`h-3 w-3 ${active ? "text-foreground" : "text-muted-foreground/50"}`} />
      </span>
    </th>
  );
}

function ContractDetailDialog({ contract, open, onClose }: { contract: any; open: boolean; onClose: () => void }) {
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


  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-contract-detail-title">
            Contract Details
          </DialogTitle>
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

          <SectionTitle title="Capacity & Levies" />
          <DetailRow label="kVA" value={fmtNum(contract.kva)} />
          <DetailRow label="Maximum Input Capacity" value={fmtNum(contract.maximumInputCapacity)} />
          <DetailRow label="Climate Change Levy (p)" value={fmtNum(contract.climateChangeLevy, 4)} />
          <DetailRow label="Fossil Fuel Levy (p)" value={fmtNum(contract.fossilFuelLevy, 4)} />

          <SectionTitle title="Rates" />
          <DetailRow label="Rate 1 (p)" value={fmtNum(contract.kwhSplit1CostRate, 4)} />
          <DetailRow label="Rate 2 (p)" value={fmtNum(contract.kwhSplit2CostRate, 4)} />
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

          <SectionTitle title="Reactive Power" />
          <DetailRow label="Reactive Power 1 Rate (p)" value={fmtNum(contract.reactivePower1Rate, 4)} />
          <DetailRow label="Reactive Power 1 Split" value={fmtNum(contract.reactivePower1Split)} />
          <DetailRow label="Reactive Power 2 Rate (p)" value={fmtNum(contract.reactivePower2Rate, 4)} />
          <DetailRow label="Reactive Power 2 Split" value={fmtNum(contract.reactivePower2Split)} />
          <DetailRow label="kVArh Default" value={fmtNum(contract.kvarhDefault)} />

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

function ContractsTab({ meterId }: { meterId: number }) {
  const { data: contracts, isLoading } = useQuery<any[]>({
    queryKey: [`/api/data-sets/${meterId}/contracts`],
  });
  const [sortKey, setSortKey] = useState<ContractSortKey>("dateEnd");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const handleSort = (key: ContractSortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "dateEnd" || key === "dateStart" ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    if (!contracts) return [];
    return [...contracts].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "dateStart" || sortKey === "dateEnd") {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else if (sortKey === "kwhSplit1CostRate" || sortKey === "kwhSplit2CostRate" || sortKey === "rateFixed") {
        av = av ?? -Infinity;
        bv = bv ?? -Infinity;
      } else {
        av = (av || "").toString().toLowerCase();
        bv = (bv || "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [contracts, sortKey, sortDir]);

  if (isLoading) return <LoadingState />;
  if (!contracts || contracts.length === 0) return <EmptyState message="No supply contracts found for this meter." />;

  const hp = { currentSort: sortKey, currentDir: sortDir, onSort: handleSort };

  return (
    <>
      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <SortableHeader label="Supplier" sortKey="supplier" {...hp} />
              <SortableHeader label="Reference" sortKey="referenceNumber" {...hp} />
              <SortableHeader label="Type" sortKey="type" {...hp} />
              <SortableHeader label="Start" sortKey="dateStart" {...hp} />
              <SortableHeader label="End" sortKey="dateEnd" {...hp} />
              <SortableHeader label="Rate 1 (p)" sortKey="kwhSplit1CostRate" align="right" {...hp} />
              <SortableHeader label="Rate 2 (p)" sortKey="kwhSplit2CostRate" align="right" {...hp} />
              <SortableHeader label="Standing Charge (p)" sortKey="rateFixed" align="right" {...hp} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c: any) => (
              <tr
                key={c.id}
                className="border-t hover:bg-muted/30 cursor-pointer"
                data-testid={`row-contract-${c.id}`}
                onClick={() => setSelectedContract(c)}
              >
                <td className="p-2">{c.supplier || "-"}</td>
                <td className="p-2 font-mono text-xs">{c.referenceNumber || "-"}</td>
                <td className="p-2">{c.type || "-"}</td>
                <td className="p-2">{formatDate(c.dateStart)}</td>
                <td className="p-2">{formatDate(c.dateEnd)}</td>
                <td className="p-2 text-right">{c.kwhSplit1CostRate ? Number(c.kwhSplit1CostRate).toFixed(4) : "-"}</td>
                <td className="p-2 text-right">{c.kwhSplit2CostRate ? Number(c.kwhSplit2CostRate).toFixed(4) : "-"}</td>
                <td className="p-2 text-right">{c.rateFixed ? Number(c.rateFixed).toFixed(2) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ContractDetailDialog
        contract={selectedContract}
        open={!!selectedContract}
        onClose={() => setSelectedContract(null)}
      />
    </>
  );
}

function InvoicesTab({ meterId }: { meterId: number }) {
  const { data: records, isLoading } = useQuery<any[]>({
    queryKey: [`/api/data-sets/${meterId}/records`],
  });
  const [sortKey, setSortKey] = useState<InvoiceSortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: InvoiceSortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "previousDate" ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    if (!records) return [];
    return [...records].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "date" || sortKey === "previousDate") {
        av = a[sortKey] ? new Date(a[sortKey]).getTime() : 0;
        bv = b[sortKey] ? new Date(b[sortKey]).getTime() : 0;
      } else {
        av = a[sortKey] ?? -Infinity;
        bv = b[sortKey] ?? -Infinity;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [records, sortKey, sortDir]);

  if (isLoading) return <LoadingState />;
  if (!records || records.length === 0) return <EmptyState message="No invoice/billing records found for this meter." />;

  const hp = { currentSort: sortKey, currentDir: sortDir, onSort: handleSort };

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <SortableHeader label="Date" sortKey="date" {...hp} />
            <SortableHeader label="Previous Date" sortKey="previousDate" {...hp} />
            <SortableHeader label="Units" sortKey="units" align="right" {...hp} />
            <SortableHeader label="Cost (p)" sortKey="cost" align="right" {...hp} />
            <SortableHeader label="Standing (p)" sortKey="standingCharge" align="right" {...hp} />
            <SortableHeader label="Other (p)" sortKey="otherCharge" align="right" {...hp} />
            <SortableHeader label="VAT (p)" sortKey="vat" align="right" {...hp} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r: any) => (
            <tr key={r.id} className="border-t hover:bg-muted/30" data-testid={`row-record-${r.id}`}>
              <td className="p-2">{formatDate(r.date)}</td>
              <td className="p-2">{formatDate(r.previousDate)}</td>
              <td className="p-2 text-right">{r.units != null ? Number(r.units).toLocaleString() : "-"}</td>
              <td className="p-2 text-right">{r.cost != null ? Number(r.cost).toFixed(2) : "-"}</td>
              <td className="p-2 text-right">{r.standingCharge != null ? Number(r.standingCharge).toFixed(2) : "-"}</td>
              <td className="p-2 text-right">{r.otherCharge != null ? Number(r.otherCharge).toFixed(2) : "-"}</td>
              <td className="p-2 text-right">{r.vat != null ? Number(r.vat).toFixed(2) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetersTab({ meterId, meter }: { meterId: number; meter: any }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">Physical meters and sub-meters associated with this data set.</p>
      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">Serial Number</th>
              <th className="text-left p-2 font-medium">Meter Type</th>
              <th className="text-left p-2 font-medium">Sub-Meter</th>
              <th className="text-left p-2 font-medium">Virtual</th>
              <th className="text-left p-2 font-medium">Digits</th>
              <th className="text-left p-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t hover:bg-muted/30" data-testid={`row-physical-meter-${meterId}`}>
              <td className="p-2 font-mono">{meter.meterSerial1 || "-"}</td>
              <td className="p-2">{meter.meterType || "-"}</td>
              <td className="p-2">{meter.subMeter ? "Yes" : "No"}</td>
              <td className="p-2">{meter.isVirtual ? "Yes" : "No"}</td>
              <td className="p-2">{meter.meterDigits ?? "-"}</td>
              <td className="p-2">
                {meter.isActive !== false ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">Active</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Closed</Badge>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReadingsTab({ meterId }: { meterId: number }) {
  const { data: records, isLoading } = useQuery<any[]>({
    queryKey: [`/api/data-sets/${meterId}/records`],
  });

  if (isLoading) return <LoadingState />;
  if (!records || records.length === 0) return <EmptyState message="No direct reading data found for this meter." />;

  const withReadings = records.filter((r: any) => r.meterReadingPresent != null || r.meterReadingPrevious != null);
  if (withReadings.length === 0) return <EmptyState message="No meter readings recorded. Only invoice data available." />;

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-2 font-medium">Date</th>
            <th className="text-right p-2 font-medium">Previous Reading</th>
            <th className="text-right p-2 font-medium">Present Reading</th>
            <th className="text-right p-2 font-medium">Units Used</th>
            <th className="text-right p-2 font-medium">kWh</th>
          </tr>
        </thead>
        <tbody>
          {withReadings.map((r: any) => (
            <tr key={r.id} className="border-t hover:bg-muted/30" data-testid={`row-reading-${r.id}`}>
              <td className="p-2">{formatDate(r.date)}</td>
              <td className="p-2 text-right">{r.meterReadingPrevious != null ? Number(r.meterReadingPrevious).toLocaleString() : "-"}</td>
              <td className="p-2 text-right">{r.meterReadingPresent != null ? Number(r.meterReadingPresent).toLocaleString() : "-"}</td>
              <td className="p-2 text-right">{r.unitsUsed != null ? Number(r.unitsUsed).toLocaleString() : "-"}</td>
              <td className="p-2 text-right">{r.kwh != null ? Number(r.kwh).toLocaleString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfilesTab({ meterId }: { meterId: number }) {
  const { data, isLoading } = useQuery<{ profiles: any[]; total: number }>({
    queryKey: [`/api/data-sets/${meterId}/profiles`],
  });

  if (isLoading) return <LoadingState />;
  if (!data || data.profiles.length === 0) return <EmptyState message="No half-hourly profile data found for this meter." />;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">{data.total.toLocaleString()} profile days total (showing latest 100)</p>
      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">Date</th>
              <th className="text-right p-2 font-medium">Day Total (kWh)</th>
              <th className="text-left p-2 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {data.profiles.map((p: any) => (
              <tr key={p.id} className="border-t hover:bg-muted/30" data-testid={`row-profile-${p.id}`}>
                <td className="p-2">{formatDate(p.date)}</td>
                <td className="p-2 text-right">{p.dayTotal != null ? Number(p.dayTotal).toLocaleString() : "-"}</td>
                <td className="p-2">{p.type === 0 ? "Actual" : `Type ${p.type}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoryTab({ meterId, meter }: { meterId: number; meter: any }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">Audit trail and change history for this meter.</p>
      <div className="space-y-3">
        {meter.lastUpdate && (
          <div className="flex items-start gap-3 p-3 border rounded-md">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Last Updated</p>
              <p className="text-xs text-muted-foreground">{formatDate(meter.lastUpdate)}</p>
            </div>
          </div>
        )}
        <div className="text-center py-8 text-muted-foreground text-sm">
          Detailed change history will be available in a future update.
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground text-sm">
      {message}
    </div>
  );
}

export default function MeterDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/meters/:id");
  const meterId = params?.id ? parseInt(params.id) : 0;

  const { data: meter, isLoading, error } = useQuery<any>({
    queryKey: [`/api/data-sets/${meterId}`],
    enabled: meterId > 0,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !meter) {
    return (
      <Layout>
        <div className="text-center py-24">
          <p className="text-muted-foreground">Meter not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/groups")} data-testid="button-back-error">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>

      <MeterDetailsHeader meter={meter} />

      <Tabs defaultValue="contracts" className="mt-4">
        <TabsList className="w-full justify-start" data-testid="tabs-meter-detail">
          <TabsTrigger value="contracts" data-testid="tab-contracts">
            <FileText className="mr-1.5 h-4 w-4" />
            Supply Contracts
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <FileText className="mr-1.5 h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="meters" data-testid="tab-meters">
            <Gauge className="mr-1.5 h-4 w-4" />
            Meters
          </TabsTrigger>
          <TabsTrigger value="readings" data-testid="tab-readings">
            <Gauge className="mr-1.5 h-4 w-4" />
            Readings
          </TabsTrigger>
          <TabsTrigger value="profiles" data-testid="tab-profiles">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Profile Data
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Clock className="mr-1.5 h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <Card className="mt-3">
          <CardContent className="pt-6">
            <TabsContent value="contracts" className="mt-0">
              <ContractsTab meterId={meterId} />
            </TabsContent>
            <TabsContent value="invoices" className="mt-0">
              <InvoicesTab meterId={meterId} />
            </TabsContent>
            <TabsContent value="meters" className="mt-0">
              <MetersTab meterId={meterId} meter={meter} />
            </TabsContent>
            <TabsContent value="readings" className="mt-0">
              <ReadingsTab meterId={meterId} />
            </TabsContent>
            <TabsContent value="profiles" className="mt-0">
              <ProfilesTab meterId={meterId} />
            </TabsContent>
            <TabsContent value="history" className="mt-0">
              <HistoryTab meterId={meterId} meter={meter} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </Layout>
  );
}
