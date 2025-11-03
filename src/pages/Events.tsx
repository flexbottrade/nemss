import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Upload, CheckCircle, XCircle, Clock, MapPin, FileText } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    event_id: "",
    proof: null as File | null,
  });

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
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });
    setEvents(eventsData || []);

    const { data: paymentsData } = await supabase
      .from("event_payments")
      .select("*, events(title, amount)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPayments(paymentsData || []);

    const { data: accountsData } = await supabase
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    setAccounts(accountsData || []);

    setLoading(false);
  };

  const handleSubmitPayment = async () => {
    if (!formData.event_id) {
      toast.error("Please select an event");
      return;
    }
    if (!formData.proof) {
      toast.error("Please upload payment proof");
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const fileName = `${user.id}/${Date.now()}_${formData.proof.name}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, formData.proof);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      const event = events.find(e => e.id === formData.event_id);
      
      const { error } = await supabase.from("event_payments").insert({
        user_id: user.id,
        event_id: formData.event_id,
        amount: event.amount,
        payment_proof_url: publicUrl,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Payment submitted successfully");
      setIsDialogOpen(false);
      setFormData({ event_id: "", proof: null });
      setSelectedEvent(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit payment");
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500";
      case "rejected": return "bg-red-500";
      default: return "bg-yellow-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-4 h-4" />;
      case "rejected": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const hasPaidForEvent = (eventId: string) => {
    return payments.some(p => p.event_id === eventId && p.status === "approved");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent/20 border-t-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-accent flex items-center justify-center">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-accent-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Events</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">View events and submit payments</p>
        </div>

        {/* Upcoming Events */}
        <Card className="mb-6 border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No events available</p>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="p-4 rounded-lg bg-accent border border-accent">
                    <h3 className="text-lg font-bold text-accent-foreground mb-2">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-accent-foreground/70 mb-3">{event.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-accent-foreground/70">
                          <Calendar className="w-4 h-4" />
                          {new Date(event.event_date).toLocaleDateString()}
                        </span>
                        <span className="text-lg font-bold text-accent-foreground">
                          ₦{Number(event.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Accounts */}
        {accounts.length > 0 && (
          <Card className="mb-6 border-border bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Payment Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="p-4 rounded-lg bg-accent border border-accent">
                  <p className="font-semibold text-accent-foreground">{account.account_name}</p>
                  <p className="text-sm text-accent-foreground/70">{account.bank_name}</p>
                  <p className="text-lg font-mono font-bold text-accent-foreground mt-1">{account.account_number}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit Payment Button */}
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="w-full mb-6 h-12 text-base bg-primary hover:bg-primary/90 font-semibold shadow-lg"
          disabled={events.length === 0}
        >
          <Upload className="w-5 h-5 mr-2" />
          Submit Event Payment
        </Button>

        {/* Payment History */}
        <Card className="border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payments yet</p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-4 rounded-lg border border-border bg-background">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{payment.events?.title}</p>
                        <p className="text-xs text-foreground/70">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(payment.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(payment.status)}
                          {payment.status}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-xl font-bold text-foreground">₦{Number(payment.amount).toLocaleString()}</p>
                    {payment.admin_note && (
                      <div className="mt-2 p-2 bg-accent/20 rounded text-xs text-foreground">
                        <span className="font-semibold">Note: </span>
                        {payment.admin_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Payment Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Event Payment</DialogTitle>
              <DialogDescription>Select event and upload proof of payment</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Event</Label>
                <Select
                  value={formData.event_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, event_id: value });
                    setSelectedEvent(events.find(e => e.id === value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem 
                        key={event.id} 
                        value={event.id}
                        disabled={hasPaidForEvent(event.id)}
                      >
                        {event.title} - ₦{Number(event.amount).toLocaleString()}
                        {hasPaidForEvent(event.id) && " (Already Paid)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedEvent && (
                <div className="p-3 bg-accent rounded-lg">
                  <p className="text-sm text-accent-foreground/70 mb-1">Event Amount</p>
                  <p className="text-2xl font-bold text-accent-foreground">₦{Number(selectedEvent.amount).toLocaleString()}</p>
                  <p className="text-xs text-accent-foreground/70 mt-1">
                    Date: {new Date(selectedEvent.event_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <Label>Payment Proof</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, proof: e.target.files?.[0] || null })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmitPayment} disabled={uploading} className="flex-1">
                  {uploading ? "Uploading..." : "Submit"}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <BottomNav />
    </div>
  );
};

export default Events;
