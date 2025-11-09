import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Calendar, TrendingUp, TrendingDown, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [stats, setStats] = useState({
    totalMembers: 0,
    pendingPayments: 0,
    totalBalance: 0,
    activeEvents: 0,
    totalInflow: 0,
    totalOutflow: 0,
    membersOwing: 0,
    membersUpToDate: 0,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin]);

  const loadStats = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    const membersCount = profiles?.length || 0;

    // Count pending payments across all payment types
    const { count: pendingDuesCount } = await supabase
      .from("dues_payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: pendingEventCount } = await supabase
      .from("event_payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: pendingDonationCount } = await supabase
      .from("donation_payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const totalPendingPayments = (pendingDuesCount || 0) + (pendingEventCount || 0) + (pendingDonationCount || 0);

    const { count: eventsCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("event_date", new Date().toISOString());

    // Calculate total inflow (approved dues + event payments + donation payments)
    const { data: approvedDues } = await supabase
      .from("dues_payments")
      .select("amount")
      .eq("status", "approved");

    const { data: approvedEventPayments } = await supabase
      .from("event_payments")
      .select("amount")
      .eq("status", "approved");

    const { data: approvedDonationPayments } = await supabase
      .from("donation_payments")
      .select("amount")
      .eq("status", "approved");

    const { data: adjustments } = await supabase
      .from("finance_adjustments")
      .select("amount, adjustment_type");

    const totalDuesInflow = approvedDues?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalEventInflow = approvedEventPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalDonationInflow = approvedDonationPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    
    let totalOutflow = 0;
    let totalInflow = totalDuesInflow + totalEventInflow + totalDonationInflow;
    
    adjustments?.forEach(adj => {
      if (adj.adjustment_type === 'expense') {
        totalOutflow += Number(adj.amount);
      } else if (adj.adjustment_type === 'income') {
        totalInflow += Number(adj.amount);
      }
    });

    const totalBalance = totalInflow - totalOutflow;

    // Calculate owing status for members
    const { data: settings } = await supabase.from("settings").select("monthly_dues_amount").single();
    const monthlyDues = settings?.monthly_dues_amount || 3000;

    const { data: allDuesPayments } = await supabase
      .from("dues_payments")
      .select("*")
      .eq("status", "approved");

    const { data: allEventPayments } = await supabase
      .from("event_payments")
      .select("*, events(amount)")
      .eq("status", "approved");

    let owingCount = 0;
    let upToDateCount = 0;

    profiles?.forEach(member => {
      const memberDues = allDuesPayments?.filter(p => p.user_id === member.id) || [];
      const totalDuesPaid = memberDues.reduce((sum, p) => sum + Number(p.amount), 0);
      
      const monthsSinceJoin = Math.floor(
        (new Date().getTime() - new Date(member.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const expectedDues = monthsSinceJoin * monthlyDues;
      const duesOwing = expectedDues - totalDuesPaid;

      const memberEvents = allEventPayments?.filter(p => p.user_id === member.id) || [];
      const totalEventsPaid = memberEvents.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalEventsExpected = memberEvents.reduce((sum, p) => sum + Number(p.events?.amount || 0), 0);
      const eventsOwing = totalEventsExpected - totalEventsPaid;

      const totalOwing = (duesOwing > 0 ? duesOwing : 0) + (eventsOwing > 0 ? eventsOwing : 0);

      if (totalOwing > 0) {
        owingCount++;
      } else {
        upToDateCount++;
      }
    });

    setStats({
      totalMembers: membersCount,
      pendingPayments: totalPendingPayments,
      totalBalance,
      activeEvents: eventsCount || 0,
      totalInflow,
      totalOutflow,
      membersOwing: owingCount,
      membersUpToDate: upToDateCount,
    });
  };

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8 ml-0 md:ml-0">
        <div className="max-w-7xl mx-auto">
          <header className="mb-4 md:mb-8 pl-12 md:pl-0">
            <h1 className="text-xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage NEMSS09 Set</p>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-card-foreground">Total Members</CardTitle>
                <Users className="w-3 h-3 md:w-4 md:h-4 text-accent" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold text-accent">{stats.totalMembers}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-card-foreground">Pending Payments</CardTitle>
                <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-warning" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold text-warning">{stats.pendingPayments}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-card-foreground">Active Events</CardTitle>
                <Calendar className="w-3 h-3 md:w-4 md:h-4 text-accent" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold text-accent">{stats.activeEvents}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-card-foreground">Total Balance</CardTitle>
                <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-accent" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold text-accent">₦{stats.totalBalance.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-card-foreground">Total Inflow</CardTitle>
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-success" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold text-success">₦{stats.totalInflow.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-card-foreground">Total Outflow</CardTitle>
                <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold text-destructive">₦{stats.totalOutflow.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-card-foreground">Members Up-to-Date</CardTitle>
                <UserCheck className="w-3 h-3 md:w-4 md:h-4 text-success" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold text-success">{stats.membersUpToDate}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-card-foreground">Members Owing</CardTitle>
                <UserX className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold text-destructive">{stats.membersOwing}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
