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
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
