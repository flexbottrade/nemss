import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Calendar, Vote, Settings, FileText, LogOut, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [stats, setStats] = useState({
    totalMembers: 0,
    pendingPayments: 0,
    totalBalance: 0,
    activeEvents: 0,
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
    const { count: membersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: pendingCount } = await supabase
      .from("dues_payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: eventsCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("event_date", new Date().toISOString());

    setStats({
      totalMembers: membersCount || 0,
      pendingPayments: pendingCount || 0,
      totalBalance: 0,
      activeEvents: eventsCount || 0,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary p-4 md:p-8">
      <div className="container mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Manage NEMSS09 Set</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <DollarSign className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Calendar className="w-4 h-4 text-highlight" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeEvents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{stats.totalBalance.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/admin/members")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle>Members</CardTitle>
                  <p className="text-sm text-muted-foreground">View all members</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/admin/transactions")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-accent" />
                <div>
                  <CardTitle>Transactions</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage payments</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/admin/accounts")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-highlight" />
                <div>
                  <CardTitle>Payment Accounts</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage bank accounts</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/admin/finance")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle>Finance</CardTitle>
                  <p className="text-sm text-muted-foreground">Track inflow & outflow</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/admin/events")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-accent" />
                <div>
                  <CardTitle>Events</CardTitle>
                  <p className="text-sm text-muted-foreground">Create & manage events</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/admin/elections")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Vote className="w-8 h-8 text-highlight" />
                <div>
                  <CardTitle>Elections</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage voting</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/admin/settings")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle>Settings</CardTitle>
                  <p className="text-sm text-muted-foreground">Dues & configurations</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/admin/reports")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-accent" />
                <div>
                  <CardTitle>Reports</CardTitle>
                  <p className="text-sm text-muted-foreground">Generate PDF reports</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
