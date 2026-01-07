import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ImportPage from "@/pages/import-page";
import AdminPage from "@/pages/admin-page";
import MetersPage from "@/pages/meters-page";
import SitesPage from "@/pages/sites-page";
import GroupsPage from "@/pages/groups-page";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/groups" component={GroupsPage} />
      <Route path="/sites" component={SitesPage} />
      <Route path="/meters" component={MetersPage} />
      <Route path="/import" component={ImportPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/analysis" component={Dashboard} /> {/* Placeholder */}
      <Route path="/reports" component={Dashboard} /> {/* Placeholder */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;