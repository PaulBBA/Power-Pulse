import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ImportPage from "@/pages/import-page";
import AdminPage from "@/pages/admin-page";
import MetersPage from "@/pages/meters-page";
import SitesPage from "@/pages/sites-page";
import GroupsPage from "@/pages/groups-page";
import ContractsPage from "@/pages/contracts-page";
import MeterDetailPage from "@/pages/meter-detail-page";
import ReportsPage from "@/pages/reports-page";
import AnalysisPage from "@/pages/analysis-page";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/groups" component={GroupsPage} />
      <ProtectedRoute path="/sites" component={SitesPage} />
      <ProtectedRoute path="/meters/:id" component={MeterDetailPage} />
      <ProtectedRoute path="/meters" component={MetersPage} />
      <ProtectedRoute path="/contracts" component={ContractsPage} />
      <ProtectedRoute path="/analysis" component={AnalysisPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/import" component={ImportPage} allowedRoles={["admin", "editor"]} />
      <ProtectedRoute path="/admin" component={AdminPage} allowedRoles={["admin"]} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
