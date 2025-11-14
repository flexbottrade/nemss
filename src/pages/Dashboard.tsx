import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Calendar, TrendingUp, LogOut, Gift, Shield } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { DonationSection } from "@/components/DonationSection";
import { useRole } from "@/hooks/useRole";
import { Spinner } from "@/components/ui/spinner";
import { formatDateDDMMYY } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
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
    const initializeData = async () => {
      await Promise.all([loadProfile(), loadStats(), loadPaymentHistory()]);
    };
    initializeData();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
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

    // Parallel fetch all data
    const [duesPaymentsResult, eventPaymentsResult, variableDuesResult, eventsResult, userEventPaymentsResult] = await Promise.all([
      supabase
        .from("dues_payments")
        .select("amount, status, is_manually_updated")
        .eq("user_id", user.id)
        .or("status.eq.approved,is_manually_updated.eq.true"),
      supabase
        .from("event_payments")
        .select("amount, status, is_manually_updated")
        .eq("user_id", user.id)
        .or("status.eq.approved,is_manually_updated.eq.true"),
      supabase.from("variable_dues_settings").select("*"),
      supabase.from("events").select("id, amount, event_date").gte("event_date", new Date().toISOString()),
      supabase.from("event_payments").select("event_id, status, is_manually_updated").eq("user_id", user.id)
    ]);

    const duesPayments = duesPaymentsResult.data;
    const eventPayments = eventPaymentsResult.data;
    const variableDues = variableDuesResult.data;
    const allEvents = eventsResult.data;
    const userEventPayments = userEventPaymentsResult.data;

    const totalDues = duesPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalEvents = eventPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Calculate outstanding dues
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    let totalDuesExpected = 0;
    for (let year = 2023; year <= currentYear; year++) {
      const dueSetting = variableDues?.find(d => d.year === year);
      if (!dueSetting?.is_waived) {
        const monthlyAmount = dueSetting?.monthly_amount || 3000;
        const monthsInYear = year === currentYear ? currentMonth : 12;
        totalDuesExpected += monthlyAmount * monthsInYear;
      }
    }

    const unpaidEvents = allEvents?.filter(event => {
      const payment = userEventPayments?.find(p => p.event_id === event.id);
      return !payment || (payment.status !== "approved" && !payment.is_manually_updated);
    }) || [];

    const totalEventsOwed = unpaidEvents.reduce((sum, e) => sum + Number(e.amount), 0);

    setStats({
      totalDuesPaid: totalDues,
      totalEventContributions: totalEvents,
      outstandingDues: Math.max(0, totalDuesExpected - totalDues),
      outstandingEvents: totalEventsOwed,
    });
    setLoading(false);
  };

  const loadPaymentHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Parallel fetch payment history
    const [duesResult, eventResult, donationResult] = await Promise.all([
      supabase.from("dues_payments").select("*, created_at, amount, status").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("event_payments").select("*, created_at, amount, status, events(title)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("donation_payments").select("*, created_at, amount, status, donations(title)").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

    const allPayments = [
      ...(duesResult.data || []).map(p => ({ ...p, type: 'dues' as const })),
      ...(eventResult.data || []).map(p => ({ ...p, type: 'event' as const })),
      ...(donationResult.data || []).map(p => ({ ...p, type: 'donation' as const }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setPaymentHistory(allPayments);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/home");
  };

  if (!profile || loading) {
    return <Spinner size="lg" />;
  }

  const paginatedHistory = paymentHistory.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const totalPages = Math.ceil(paymentHistory.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <header className="bg-accent text-accent-foreground p-3 md:p-4 rounded-b-3xl shadow-lg">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <div>
              <h1 className="text-base md:text-xl font-bold">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-xs md:text-sm text-primary-foreground/80">ID: {profile.member_id}</p>
              {profile.position && (
                <p className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full inline-block mt-1">
                  {profile.position}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/admin")}
                  className="text-primary-foreground hover:bg-primary-foreground/10 h-7 w-7 md:h-9 md:w-9"
                  title="Admin Dashboard"
                >
                  <Shield className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-primary-foreground hover:bg-primary-foreground/10 h-7 w-7 md:h-9 md:w-9"
              >
                <LogOut className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 mt-3 md:-mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-0.5 p-2 md:p-4 md:pb-1">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Total Dues Paid
              </CardTitle>
              <Wallet className="w-3 h-3 md:w-4 md:h-4 text-primary" />
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <div className="text-base md:text-xl font-bold">₦{stats.totalDuesPaid.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-0.5 p-2 md:p-4 md:pb-1">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Event Contributions
              </CardTitle>
              <Calendar className="w-3 h-3 md:w-4 md:h-4 text-accent" />
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <div className="text-base md:text-xl font-bold">₦{stats.totalEventContributions.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-0.5 p-2 md:p-4 md:pb-1">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Outstanding Dues
              </CardTitle>
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <div className="text-base md:text-xl font-bold text-destructive">
                ₦{stats.outstandingDues.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-0.5 p-2 md:p-4 md:pb-1">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Outstanding Events
              </CardTitle>
              <Calendar className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <div className="text-base md:text-xl font-bold text-destructive">
                ₦{stats.outstandingEvents.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mt-4 md:mt-6">
          <Button
            className="h-12 md:h-16 bg-primary hover:bg-primary/90 text-sm md:text-base"
            onClick={() => navigate("/payments")}
          >
            <div className="flex flex-col items-center gap-1">
              <Wallet className="w-3 h-3 md:w-4 md:h-4" />
              <span>Pay Dues</span>
            </div>
          </Button>

          <Button
            className="h-12 md:h-16 bg-primary hover:bg-primary/90 text-sm md:text-base"
            onClick={() => navigate("/events")}
          >
            <div className="flex flex-col items-center gap-1">
              <Calendar className="w-3 h-3 md:w-4 md:h-4" />
              <span>View Events</span>
            </div>
          </Button>

          <Button
            className="h-12 md:h-16 bg-primary hover:bg-primary/90 text-sm md:text-base"
            onClick={() => navigate("/profile")}
          >
            <div className="flex flex-col items-center gap-1">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
              <span>Profile</span>
            </div>
          </Button>
        </div>

        <DonationSection />

        <Card className="mt-4 md:mt-6">
          <CardHeader className="p-2 md:p-3">
            <CardTitle className="text-sm md:text-base">Recent Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-3 pt-0">
            {paymentHistory.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4 md:py-6">No payment history yet</p>
            ) : (
              <>
                <div className="space-y-1.5 md:space-y-2">
                  {paginatedHistory.map((payment, index) => {
                    const getDuesLabel = () => {
                      if (payment.type !== 'dues') return '';
                      
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      if (payment.months_paid === 1) {
                        return `${months[payment.start_month - 1]} ${payment.start_year}`;
                      }
                      const endMonth = ((payment.start_month - 1 + payment.months_paid - 1) % 12);
                      return `${months[payment.start_month - 1]} - ${months[endMonth]} ${payment.start_year}`;
                    };
                    
                    return (
                      <div
                        key={`${payment.type}-${payment.id}-${index}`}
                        className="flex items-center justify-between p-1.5 md:p-2 rounded-lg bg-card border border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm font-medium text-foreground truncate">
                            {payment.type === 'dues' 
                              ? `Dues: ${getDuesLabel()}`
                              : payment.type === 'event'
                              ? payment.events?.title || 'Event Payment'
                              : payment.donations?.title || 'Donation'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateDDMMYY(payment.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs md:text-sm font-bold text-foreground">₦{Number(payment.amount).toLocaleString()}</p>
                          <p className={`text-xs ${
                            payment.status === 'approved' ? 'text-green-500' : 
                            payment.status === 'pending' ? 'text-yellow-500' : 
                            'text-red-500'
                          }`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-2 md:mt-3 pt-2 md:pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 md:h-7 text-xs"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 md:h-7 text-xs"
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
