import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const Transactions = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [duesPayments, setDuesPayments] = useState<any[]>([]);
  const [eventPayments, setEventPayments] = useState<any[]>([]);
  const [donationPayments, setDonationPayments] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [duesFilter, setDuesFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [donationFilter, setDonationFilter] = useState<string>("all");

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadPayments();
    }
  }, [isAdmin]);

  const loadPayments = async () => {
    const { data: dues, error: duesError } = await supabase
      .from("dues_payments")
      .select("*, profiles(first_name, last_name, member_id)")
      .order("created_at", { ascending: false });

    const { data: events, error: eventsError } = await supabase
      .from("event_payments")
      .select("*, profiles(first_name, last_name, member_id), events(title)")
      .order("created_at", { ascending: false });

    const { data: donations, error: donationsError } = await supabase
      .from("donation_payments")
      .select("*, profiles(first_name, last_name, member_id), donations(title)")
      .order("created_at", { ascending: false });

    console.log("Raw loaded payments with statuses:", { 
      dues: dues?.map(d => ({ id: d.id, status: d.status, statusType: typeof d.status, statusLength: d.status?.length })),
      events: events?.map(e => ({ id: e.id, status: e.status, statusType: typeof e.status, statusLength: e.status?.length })),
      donations: donations?.map(d => ({ id: d.id, status: d.status, statusType: typeof d.status, statusLength: d.status?.length })),
      errors: { duesError, eventsError, donationsError }
    });

    // Sort to show pending first
    const sortByStatus = (a: any, b: any) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return 0;
    };

    setDuesPayments((dues || []).sort(sortByStatus));
    setEventPayments((events || []).sort(sortByStatus));
    setDonationPayments((donations || []).sort(sortByStatus));
  };

  const handleUpdatePayment = async (id: string, status: string, type: "dues" | "event" | "donation") => {
    try {
      const table = type === "dues" ? "dues_payments" : type === "event" ? "event_payments" : "donation_payments";
      
      console.log("Updating payment:", { id, status, type, table, adminNote });
      
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (adminNote.trim()) {
        updateData.admin_note = adminNote;
      }
      
      const { data, error } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", id)
        .select();

      console.log("Update result:", { data, error });

      if (error) {
        console.error("Update error:", error);
        toast.error(`Failed to update payment: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        toast.error("Payment not found or insufficient permissions");
        console.error("No data returned from update");
        return;
      }

      toast.success(`Payment ${status} successfully`);
      setSelectedPayment(null);
      setAdminNote("");
      await loadPayments();
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error(`Error: ${error.message || "Unknown error occurred"}`);
    }
  };

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const renderPayment = (payment: any, type: "dues" | "event" | "donation") => (
    <Card key={payment.id} className="mb-2 md:mb-3">
      <CardContent className="pt-2 md:pt-3 p-2 md:p-3">
        <div className="flex flex-col md:flex-row justify-between gap-3">
          <div className="flex-1">
            <p className="font-semibold text-xs md:text-sm">
              {payment.profiles?.first_name} {payment.profiles?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">ID: {payment.profiles?.member_id}</p>
            {type === "event" && payment.events && (
              <p className="text-xs mt-0.5">Event: {payment.events.title}</p>
            )}
            {type === "donation" && payment.donations && (
              <p className="text-xs mt-0.5">Campaign: {payment.donations.title}</p>
            )}
            {type === "dues" && (
              <p className="text-xs mt-0.5">
                Period: {payment.start_month}/{payment.start_year} ({payment.months_paid} months)
              </p>
            )}
            <p className="text-base md:text-lg font-bold mt-1">₦{Number(payment.amount).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(payment.created_at).toLocaleDateString()}
            </p>
            {payment.admin_note && (
              <p className="text-xs mt-1 p-1.5 bg-muted rounded">Note: {payment.admin_note}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span
              className={`text-xs px-2 py-0.5 rounded-full text-center ${
                payment.status === "approved"
                  ? "bg-green-500 text-white"
                  : payment.status === "rejected"
                  ? "bg-red-500 text-white"
                  : "bg-yellow-500 text-black"
              }`}
            >
              {payment.status}
            </span>
            {payment.payment_proof_url && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => window.open(payment.payment_proof_url, "_blank")}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Proof
              </Button>
            )}
            {payment.status === "pending" && (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedPayment({ ...payment, type, action: "approved" })}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  variant="destructive"
                  onClick={() => setSelectedPayment({ ...payment, type, action: "rejected" })}
                >
                  <X className="w-3 h-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {payment.status !== "pending" && (
              <Button
                size="sm"
                className="h-7 text-xs"
                variant="outline"
                onClick={() => setSelectedPayment({ ...payment, type, action: "pending" })}
              >
                Return to Pending
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 md:mb-6 pl-12 md:pl-0">
            <h1 className="text-lg md:text-2xl font-bold">Transactions</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Review and approve member payments for dues, events, and donations. Filter by status to manage pending items.
            </p>
          </div>

          <Tabs defaultValue="dues">
            <TabsList className="mb-3 md:mb-4">
              <TabsTrigger value="dues" className="text-xs md:text-sm">Dues Payments</TabsTrigger>
              <TabsTrigger value="events" className="text-xs md:text-sm">Event Payments</TabsTrigger>
              <TabsTrigger value="donations" className="text-xs md:text-sm">Donations</TabsTrigger>
            </TabsList>

          <TabsContent value="dues">
            <div className="mb-4">
              <Label className="text-xs md:text-sm mb-2">Filter by Status</Label>
              <Select value={duesFilter} onValueChange={(value) => {
                console.log("Dues filter changed to:", value);
                setDuesFilter(value);
              }}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const filtered = duesPayments.filter(p => {
                const matches = duesFilter === "all" || p.status?.toLowerCase()?.trim() === duesFilter.toLowerCase()?.trim();
                console.log("Dues payment match:", { id: p.id, status: p.status, filter: duesFilter, matches, statusRaw: JSON.stringify(p.status) });
                return matches;
              });
              console.log("Filtering dues:", { duesFilter, totalPayments: duesPayments.length, filteredCount: filtered.length, statuses: duesPayments.map(p => ({ status: p.status, raw: JSON.stringify(p.status) })) });
              return filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No dues payments found</p>
              ) : (
                filtered.map((payment) => renderPayment(payment, "dues"))
              );
            })()}
          </TabsContent>

          <TabsContent value="events">
            <div className="mb-4">
              <Label className="text-xs md:text-sm mb-2">Filter by Status</Label>
              <Select value={eventFilter} onValueChange={(value) => {
                console.log("Event filter changed to:", value);
                setEventFilter(value);
              }}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const filtered = eventPayments.filter(p => {
                const matches = eventFilter === "all" || p.status?.toLowerCase()?.trim() === eventFilter.toLowerCase()?.trim();
                console.log("Event payment match:", { id: p.id, status: p.status, filter: eventFilter, matches, statusRaw: JSON.stringify(p.status) });
                return matches;
              });
              console.log("Filtering events:", { eventFilter, totalPayments: eventPayments.length, filteredCount: filtered.length, statuses: eventPayments.map(p => ({ status: p.status, raw: JSON.stringify(p.status) })) });
              return filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No event payments found</p>
              ) : (
                filtered.map((payment) => renderPayment(payment, "event"))
              );
            })()}
          </TabsContent>

          <TabsContent value="donations">
            <div className="mb-4">
              <Label className="text-xs md:text-sm mb-2">Filter by Status</Label>
              <Select value={donationFilter} onValueChange={(value) => {
                console.log("Donation filter changed to:", value);
                setDonationFilter(value);
              }}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const filtered = donationPayments.filter(p => {
                const matches = donationFilter === "all" || p.status?.toLowerCase()?.trim() === donationFilter.toLowerCase()?.trim();
                console.log("Donation payment match:", { id: p.id, status: p.status, filter: donationFilter, matches, statusRaw: JSON.stringify(p.status) });
                return matches;
              });
              console.log("Filtering donations:", { donationFilter, totalPayments: donationPayments.length, filteredCount: filtered.length, statuses: donationPayments.map(p => ({ status: p.status, raw: JSON.stringify(p.status) })) });
              return filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No donation payments found</p>
              ) : (
                filtered.map((payment) => renderPayment(payment, "donation"))
              );
            })()}
          </TabsContent>
          </Tabs>

          <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedPayment?.action === "approved" 
                  ? "Approve Payment" 
                  : selectedPayment?.action === "rejected" 
                  ? "Reject Payment" 
                  : "Return to Pending"}
              </DialogTitle>
              <DialogDescription>Add an optional note before updating status</DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Admin note (optional)"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  selectedPayment &&
                  handleUpdatePayment(selectedPayment.id, selectedPayment.action, selectedPayment.type)
                }
                variant={selectedPayment?.action === "rejected" ? "destructive" : "default"}
              >
                Confirm {selectedPayment?.action === "approved" ? "Approval" : selectedPayment?.action === "rejected" ? "Rejection" : "Return to Pending"}
              </Button>
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default Transactions;
