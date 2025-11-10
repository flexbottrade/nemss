import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Auth from "./pages/Auth";
import AuthConfirm from "./pages/AuthConfirm";
import Index from "./pages/Index";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import Events from "./pages/Events";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Members from "./pages/admin/Members";
import Transactions from "./pages/admin/Transactions";
import PaymentAccounts from "./pages/admin/PaymentAccounts";
import Finance from "./pages/admin/Finance";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminEvents from "./pages/admin/AdminEvents";
import Donations from "./pages/admin/Donations";
import Reports from "./pages/admin/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/events" element={<Events />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/members" element={<Members />} />
          <Route path="/admin/transactions" element={<Transactions />} />
          <Route path="/admin/accounts" element={<PaymentAccounts />} />
          <Route path="/admin/finance" element={<Finance />} />
          <Route path="/admin/donations" element={<Donations />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
