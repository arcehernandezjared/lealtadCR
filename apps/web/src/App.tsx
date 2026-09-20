import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingPage } from "./routes/landing/LandingPage";
import { LoginPage } from "./routes/auth/LoginPage";
import { RegisterPage } from "./routes/auth/RegisterPage";
import { DashboardLayout } from "./routes/dashboard/DashboardLayout";
import { DashboardHome } from "./routes/dashboard/DashboardHome";
import { BranchesPage } from "./routes/dashboard/BranchesPage";
import { TeamPage } from "./routes/dashboard/TeamPage";
import { SettingsPage } from "./routes/dashboard/SettingsPage";
import { ProgramsPage } from "./routes/dashboard/programs/ProgramsPage";
import { ProgramDetailPage } from "./routes/dashboard/programs/ProgramDetailPage";
import { CustomersPage } from "./routes/dashboard/customers/CustomersPage";
import { CustomerDetailPage } from "./routes/dashboard/customers/CustomerDetailPage";
import { PosPage } from "./routes/dashboard/pos/PosPage";
import { CampaignsPage } from "./routes/dashboard/campaigns/CampaignsPage";
import { AutomationsPage } from "./routes/dashboard/automations/AutomationsPage";
import { CustomerPortalPage } from "./routes/portal/CustomerPortalPage";
import { AdminLayout } from "./routes/admin/AdminLayout";
import { AdminOverviewPage } from "./routes/admin/AdminOverviewPage";
import { AdminBusinessesPage } from "./routes/admin/AdminBusinessesPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/portal/:qrCode" element={<CustomerPortalPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="programs/:programId" element={<ProgramDetailPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="automations" element={<AutomationsPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="businesses" element={<AdminBusinessesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
