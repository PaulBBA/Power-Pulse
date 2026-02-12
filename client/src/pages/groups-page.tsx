import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, ChevronDown, Search, Loader2, Building2, Zap, 
  Flame, Droplets, Fuel, Package, FolderOpen, Plus
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

interface MeterNode {
  id: number;
  name: string | null;
  mpanCoreMprn: string | null;
  utilityName: string;
  utilityCode: string;
  utilityTypeId: number;
  meterSerial1: string | null;
  mpanProfile: string | null;
}

interface SiteNode {
  id: number;
  name: string;
  address: string | null;
  town: string | null;
  postcode: string | null;
  meters: MeterNode[];
}

interface GroupNode {
  id: number;
  name: string;
  sites: SiteNode[];
}

interface HierarchyData {
  groups: GroupNode[];
  unassigned: SiteNode[];
}

function getUtilityIcon(utilityCode: string) {
  switch (utilityCode) {
    case "E": return <Zap className="h-4 w-4 text-amber-500" />;
    case "G": return <Flame className="h-4 w-4 text-orange-500" />;
    case "W": return <Droplets className="h-4 w-4 text-blue-500" />;
    default: return <Package className="h-4 w-4 text-gray-500" />;
  }
}

function MeterItem({ meter }: { meter: MeterNode }) {
  const displayName = meter.mpanCoreMprn || meter.name || `Meter ${meter.id}`;
  return (
    <div 
      className="flex items-center gap-2 py-1.5 px-2 ml-12 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors"
      data-testid={`meter-item-${meter.id}`}
    >
      {getUtilityIcon(meter.utilityCode)}
      <span className="text-sm text-foreground">{displayName}</span>
    </div>
  );
}

function SiteItem({ site, defaultExpanded = false }: { site: SiteNode; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const addressParts = [site.address, site.town, site.postcode].filter(Boolean);
  const displayAddress = addressParts.length > 0 ? addressParts.join(", ") : "";
  const displayName = displayAddress ? `${site.name}, ${displayAddress}` : site.name;

  return (
    <div data-testid={`site-item-${site.id}`}>
      <div 
        className="flex items-center gap-2 py-1.5 px-2 ml-6 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {site.meters.length > 0 ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm text-foreground truncate">{displayName}</span>
        {site.meters.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {site.meters.length} meter{site.meters.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {expanded && site.meters.map(meter => (
        <MeterItem key={meter.id} meter={meter} />
      ))}
    </div>
  );
}

function GroupItem({ group, defaultExpanded = false }: { group: GroupNode; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div data-testid={`group-item-${group.id}`}>
      <div 
        className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors font-medium"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <FolderOpen className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm">{group.name}</span>
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {group.sites.length} site{group.sites.length !== 1 ? "s" : ""}
        </span>
      </div>
      {expanded && group.sites.map(site => (
        <SiteItem key={site.id} site={site} />
      ))}
    </div>
  );
}

function UnassignedSection({ sites, defaultExpanded = true }: { sites: SiteNode[]; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div data-testid="unassigned-section">
      <div 
        className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors font-medium"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">Unassigned</span>
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {sites.length} site{sites.length !== 1 ? "s" : ""}
        </span>
      </div>
      {expanded && sites.map(site => (
        <SiteItem key={site.id} site={site} defaultExpanded={false} />
      ))}
    </div>
  );
}

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: hierarchy, isLoading } = useQuery<HierarchyData>({
    queryKey: ["/api/groups/hierarchy"],
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/groups", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups/hierarchy"] });
      setShowNewGroupDialog(false);
      setNewGroupName("");
    },
  });

  const filteredHierarchy = useMemo(() => {
    if (!hierarchy) return null;
    const lowerSearch = search.toLowerCase();

    const matchesMeter = (m: MeterNode) => {
      if (!search) return true;
      return (
        (m.mpanCoreMprn || "").toLowerCase().includes(lowerSearch) ||
        (m.name || "").toLowerCase().includes(lowerSearch) ||
        (m.utilityName || "").toLowerCase().includes(lowerSearch)
      );
    };

    const matchesSite = (s: SiteNode) => {
      if (!search) return true;
      const siteMatch = s.name.toLowerCase().includes(lowerSearch) ||
        (s.address || "").toLowerCase().includes(lowerSearch) ||
        (s.postcode || "").toLowerCase().includes(lowerSearch) ||
        (s.town || "").toLowerCase().includes(lowerSearch);
      if (siteMatch) return true;
      return s.meters.some(matchesMeter);
    };

    let groups = hierarchy.groups;
    let unassigned = hierarchy.unassigned;

    if (selectedGroup !== "all") {
      groups = groups.filter(g => g.id.toString() === selectedGroup);
      unassigned = [];
    }

    if (search) {
      groups = groups.map(g => ({
        ...g,
        sites: g.sites.filter(matchesSite),
      })).filter(g => g.name.toLowerCase().includes(lowerSearch) || g.sites.length > 0);

      if (selectedGroup === "all") {
        unassigned = unassigned.filter(matchesSite);
      }
    }

    return { groups, unassigned };
  }, [hierarchy, search, selectedGroup]);

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Groups</h1>
            <p className="text-muted-foreground">Manage and view your energy reporting hierarchy.</p>
          </div>
          {isAdmin && (
            <Button 
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => setShowNewGroupDialog(true)}
              data-testid="button-new-group"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Group
            </Button>
          )}
        </div>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-sidebar text-sidebar-foreground py-3">
          <CardTitle className="text-lg font-bold uppercase tracking-wider">Site Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 bg-card border-b flex flex-wrap items-center gap-4">
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-[200px] h-9" data-testid="select-group-filter">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {hierarchy?.groups.map(g => (
                  <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9 h-9" 
                placeholder="Search..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>

          <div className="p-4 min-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredHierarchy ? (
              <div className="space-y-1">
                {filteredHierarchy.groups.map(group => (
                  <GroupItem key={group.id} group={group} />
                ))}
                {filteredHierarchy.unassigned.length > 0 && (
                  <UnassignedSection sites={filteredHierarchy.unassigned} />
                )}
                {filteredHierarchy.groups.length === 0 && filteredHierarchy.unassigned.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No results found
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              data-testid="input-new-group-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createGroupMutation.mutate(newGroupName)}
              disabled={!newGroupName.trim() || createGroupMutation.isPending}
              data-testid="button-save-group"
            >
              {createGroupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
