import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const Transactions = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [duesPayments, setDuesPayments] = useState<any[]>([]);
  const [eventPayments, setEventPayments] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");

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
    const { data: dues } = await supabase
      .from("dues_payments")
      .select("*, profiles(first_name, last_name, member_id)")
      .order("created_at", { ascending: false });

    const { data: events } = await supabase
      .from("event_payments")
      .select("*, profiles(first_name, last_name, member_id), events(title)")
      .order("created_at", { ascending: false });

    setDuesPayments(dues || []);
    setEventPayments(events || []);
  };

  const handleUpdatePayment = async (id: string, status: string, type: "dues" | "event") => {
    const table = type === "dues" ? "dues_payments" : "event_payments";
    const { error } = await supabase
      .from(table)
      .update({ status, admin_note: adminNote })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update payment");
      return;
    }

    toast.success(`Payment ${status}`);
    setSelectedPayment(null);
    setAdminNote("");
    loadPayments();
  };

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const renderPayment = (payment: any, type: "dues" | "event") => (
    <Card key={payment.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold text-lg">
              {payment.profiles?.first_name} {payment.profiles?.last_name}
            </p>
            <p className="text-sm text-muted-foreground">ID: {payment.profiles?.member_id}</p>
            {type === "event" && payment.events && (
              <p className="text-sm mt-1">Event: {payment.events.title}</p>
            )}
            {type === "dues" && (
              <p className="text-sm mt-1">
                Period: {payment.start_month}/{payment.start_year} ({payment.months_paid} months)
              </p>
            )}
            <p className="text-xl font-bold mt-2">₦{Number(payment.amount).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(payment.created_at).toLocaleDateString()}
            </p>
            {payment.admin_note && (
              <p className="text-sm mt-2 p-2 bg-muted rounded">Note: {payment.admin_note}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-full text-center ${
                payment.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : payment.status === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {payment.status}
            </span>
            {payment.payment_proof_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(payment.payment_proof_url, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View Proof
              </Button>
            )}
            {payment.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setSelectedPayment({ ...payment, type })}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleUpdatePayment(payment.id, "rejected", type)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
        </div>

        <Tabs defaultValue="dues">
          <TabsList className="mb-4">
            <TabsTrigger value="dues">Dues Payments</TabsTrigger>
            <TabsTrigger value="events">Event Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="dues">
            {duesPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No dues payments yet</p>
            ) : (
              duesPayments.map((payment) => renderPayment(payment, "dues"))
            )}
          </TabsContent>

          <TabsContent value="events">
            {eventPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No event payments yet</p>
            ) : (
              eventPayments.map((payment) => renderPayment(payment, "event"))
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Payment</DialogTitle>
              <DialogDescription>Add an optional note before approving</DialogDescription>
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
                  handleUpdatePayment(selectedPayment.id, "approved", selectedPayment.type)
                }
              >
                Confirm Approval
              </Button>
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Transactions;
