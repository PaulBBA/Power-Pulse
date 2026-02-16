import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, Plus, Loader2, FileSignature } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Contract, DataSet } from "@shared/schema";
import { format } from "date-fns";

type SortField = "dateStart" | "dateEnd" | "utility" | "supplier";
type SortDir = "asc" | "desc";

export default function ContractsPage() {
  const [sortField, setSortField] = useState<SortField>("dateEnd");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: dataSets } = useQuery<DataSet[]>({
    queryKey: ["/api/data-sets"],
  });

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
          const aVal = getUtilityName(a.dataSetId);
          const bVal = getUtilityName(b.dataSetId);
          cmp = aVal.localeCompare(bVal);
          break;
        }
        case "supplier": {
          const aVal = a.supplier || "";
          const bVal = b.supplier || "";
          cmp = aVal.localeCompare(bVal);
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [contracts, dataSets, sortField, sortDir]);

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

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

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Contracts</h1>
          <p className="text-muted-foreground">Manage supply contracts across all meters</p>
        </div>
        <Button data-testid="button-new-contract" className="gap-2">
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
                    <TableRow key={contract.id} data-testid={`row-contract-${contract.id}`} className="cursor-pointer hover:bg-muted/50">
                      <TableCell data-testid={`text-start-${contract.id}`}>{formatDate(contract.dateStart)}</TableCell>
                      <TableCell data-testid={`text-end-${contract.id}`}>{formatDate(contract.dateEnd)}</TableCell>
                      <TableCell data-testid={`text-utility-${contract.id}`}>{getUtilityName(contract.dataSetId)}</TableCell>
                      <TableCell data-testid={`text-supplier-${contract.id}`}>{contract.supplier || "—"}</TableCell>
                      <TableCell data-testid={`text-meter-${contract.id}`}>{getMeterName(contract.dataSetId)}</TableCell>
                      <TableCell data-testid={`text-ref-${contract.id}`}>{contract.referenceNumber || "—"}</TableCell>
                      <TableCell data-testid={`text-type-${contract.id}`}>{contract.type || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
