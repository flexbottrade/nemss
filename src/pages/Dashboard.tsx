import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Calendar, TrendingUp, LogOut } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalDuesPaid: 0,
    totalEventContributions: 0,
    outstandingDues: 0,
    outstandingEvents: 0,
  });
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    loadProfile();
    loadStats();
    loadPaymentHistory();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
  };

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get approved dues payments
    const { data: duesPayments } = await supabase
      .from("dues_payments")
      .select("amount")
      .eq("user_id", user.id)
      .eq("status", "approved");

    // Get approved event payments
    const { data: eventPayments } = await supabase
      .from("event_payments")
      .select("amount")
      .eq("user_id", user.id)
      .eq("status", "approved");

    const totalDues = duesPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalEvents = eventPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setStats({
      totalDuesPaid: totalDues,
      totalEventContributions: totalEvents,
      outstandingDues: 0,
      outstandingEvents: 0,
    });
    setLoading(false);
  };

  const loadPaymentHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get all payments (dues + events)
    const { data: duesPayments } = await supabase
      .from("dues_payments")
      .select("*, created_at, amount, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: eventPayments } = await supabase
      .from("event_payments")
      .select("*, created_at, amount, status, events(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const allPayments = [
      ...(duesPayments || []).map(p => ({ ...p, type: 'dues' as const })),
      ...(eventPayments || []).map(p => ({ ...p, type: 'event' as const }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setPaymentHistory(allPayments);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (!profile || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  const paginatedHistory = paymentHistory.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const totalPages = Math.ceil(paymentHistory.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary pb-20 md:pb-8">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground p-4 md:p-6 rounded-b-3xl shadow-lg">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div>
              <h1 className="text-lg md:text-2xl font-bold">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-xs md:text-sm text-primary-foreground/80">ID: {profile.member_id}</p>
              {profile.position && (
                <p className="text-xs md:text-sm bg-accent text-accent-foreground px-2 py-1 rounded-full inline-block mt-1">
                  {profile.position}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8 md:h-10 md:w-10"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 mt-4 md:-mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Total Dues Paid
              </CardTitle>
              <Wallet className="w-3 h-3 md:w-4 md:h-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold">₦{stats.totalDuesPaid.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Event Contributions
              </CardTitle>
              <Calendar className="w-3 h-3 md:w-4 md:h-4 text-accent" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold">₦{stats.totalEventContributions.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Outstanding Dues
              </CardTitle>
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold text-destructive">
                ₦{stats.outstandingDues.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Outstanding Events
              </CardTitle>
              <Calendar className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold text-destructive">
                ₦{stats.outstandingEvents.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-6 md:mt-8">
          <Button
            className="h-16 md:h-24 bg-gradient-to-r from-primary to-primary-dark hover:opacity-90"
            onClick={() => navigate("/payments")}
          >
            <div className="flex flex-col items-center gap-1 md:gap-2">
              <Wallet className="w-4 h-4 md:w-6 md:h-6" />
              <span className="text-sm md:text-base">Pay Dues</span>
            </div>
          </Button>

          <Button
            className="h-16 md:h-24 bg-gradient-to-r from-accent to-highlight hover:opacity-90"
            onClick={() => navigate("/events")}
          >
            <div className="flex flex-col items-center gap-1 md:gap-2">
              <Calendar className="w-4 h-4 md:w-6 md:h-6" />
              <span className="text-sm md:text-base">View Events</span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-16 md:h-24 border-border/50"
            onClick={() => navigate("/profile")}
          >
            <div className="flex flex-col items-center gap-1 md:gap-2">
              <TrendingUp className="w-4 h-4 md:w-6 md:h-6" />
              <span className="text-sm md:text-base">Profile</span>
            </div>
          </Button>
        </div>

        {/* Payment History */}
        <Card className="mt-6 md:mt-8">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Recent Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {paymentHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payment history yet</p>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedHistory.map((payment, index) => (
                    <div
                      key={`${payment.type}-${payment.id}-${index}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {payment.type === 'dues' 
                            ? `Dues Payment (${payment.start_month}/${payment.start_year})`
                            : payment.events?.title || 'Event Payment'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">₦{Number(payment.amount).toLocaleString()}</p>
                        <p className={`text-xs ${
                          payment.status === 'approved' ? 'text-success' : 
                          payment.status === 'pending' ? 'text-warning' : 
                          'text-destructive'
                        }`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage === totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;