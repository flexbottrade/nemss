import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  amount: number;
  created_at: string;
}

interface EventPayment {
  id: string;
  event_id: string;
  amount: number;
  status: string;
  payment_proof_url: string | null;
  admin_note: string | null;
  created_at: string;
  events: {
    title: string;
    event_date: string;
  };
}

interface PaymentAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
}

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventPayments, setEventPayments] = useState<EventPayment[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setUserId(user.id);
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load upcoming events
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString().split('T')[0])
      .order("event_date", { ascending: true });

    if (eventsData) setEvents(eventsData);

    // Load payment accounts
    const { data: accounts } = await supabase
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (accounts) setPaymentAccounts(accounts);

    // Load user's event payments
    const { data: payments } = await supabase
      .from("event_payments")
      .select(`
        *,
        events (
          title,
          event_date
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (payments) setEventPayments(payments as any);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !proofFile || !selectedEvent) {
      toast.error("Please select an event and upload payment proof");
      return;
    }

    const event = events.find(e => e.id === selectedEvent);
    if (!event) return;

    setLoading(true);
    try {
      // Upload payment proof
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, proofFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      // Create payment record
      const { error: insertError } = await supabase
        .from("event_payments")
        .insert({
          user_id: userId,
          event_id: selectedEvent,
          amount: event.amount,
          payment_proof_url: publicUrl,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast.success("Payment submitted successfully! Awaiting admin approval.");
      setProofFile(null);
      setSelectedEvent("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit payment");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-accent to-highlight flex items-center justify-center">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-accent-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Events</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            View upcoming events and make contributions
          </p>
        </div>

        {/* Upcoming Events */}
        {events.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="p-3 md:p-4 border rounded-lg hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm md:text-base">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(event.event_date).toLocaleDateString()}</span>
                      </div>
                      <span className="font-semibold text-primary">₦{Number(event.amount).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Accounts */}
        {paymentAccounts.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl">Payment Accounts</CardTitle>
              <p className="text-sm text-muted-foreground">Transfer to any of these accounts</p>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-3">
                {paymentAccounts.map((account) => (
                  <div key={account.id} className="p-3 md:p-4 bg-muted/50 rounded-lg">
                    <p className="font-semibold text-sm md:text-base">{account.bank_name}</p>
                    <p className="text-lg md:text-xl font-mono font-bold">{account.account_number}</p>
                    <p className="text-sm text-muted-foreground">{account.account_name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Form */}
        {events.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl">Submit Event Payment</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="event">Select Event</Label>
                  <select
                    id="event"
                    className="w-full mt-1.5 px-3 py-2 bg-background border border-input rounded-md"
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    required
                  >
                    <option value="">Choose an event...</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} - ₦{Number(event.amount).toLocaleString()} ({new Date(event.event_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="proof">Payment Proof (Screenshot/Receipt)</Label>
                  <div className="mt-1.5">
                    <Input
                      id="proof"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                  </div>
                  {proofFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {proofFile.name}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={loading || !proofFile || !selectedEvent} className="w-full">
                  {loading ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Payment
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {eventPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No payment history yet
              </p>
            ) : (
              <div className="space-y-3">
                {eventPayments.map((payment) => (
                  <div key={payment.id} className="p-3 md:p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm md:text-base">{payment.events.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.events.event_date).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">₦{Number(payment.amount).toLocaleString()}</span>
                      <span className="text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {payment.admin_note && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <p className="font-semibold mb-1">Admin Note:</p>
                        <p>{payment.admin_note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Events;
