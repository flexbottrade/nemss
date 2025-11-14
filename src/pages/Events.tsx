import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Eye, RefreshCw } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { EventPaymentModal } from "@/components/EventPaymentModal";
import { UpdatePaymentProofDialog } from "@/components/UpdatePaymentProofDialog";
import { UpdateRejectedPaymentDialog } from "@/components/UpdateRejectedPaymentDialog";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [updateProofDialog, setUpdateProofDialog] = useState<{ open: boolean; payment: any }>({
    open: false,
    payment: null,
  });
  const [updateRejectedDialog, setUpdateRejectedDialog] = useState<{ open: boolean; payment: any }>({
    open: false,
    payment: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; payment: any }>({
    open: false,
    payment: null,
  });

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
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
      .select("*")
      .eq("user_id", user.id);
    setPayments(paymentsData || []);

    setLoading(false);
  };

  const getEventStatus = (eventDate: string) => {
    const today = new Date();
    const event = new Date(eventDate);
    
    today.setHours(0, 0, 0, 0);
    event.setHours(0, 0, 0, 0);
    
    if (event > today) return "upcoming";
    if (event.getTime() === today.getTime()) return "active";
    return "past";
  };

  const getPaymentStatus = (eventId: string) => {
    const payment = payments.find(p => p.event_id === eventId);
    if (!payment) return null;
    if (payment.status === "approved" || payment.is_manually_updated) return "approved";
    if (payment.status === "rejected") return "rejected";
    return "pending";
  };

  const getEventPayment = (eventId: string) => {
    return payments.find(p => p.event_id === eventId);
  };

  const handleDeletePayment = async () => {
    if (!deleteDialog.payment) return;

    try {
      // Delete proof from storage if exists
      if (deleteDialog.payment.payment_proof_url) {
        const oldPath = deleteDialog.payment.payment_proof_url.split('payment-proofs/')[1];
        if (oldPath) {
          await supabase.storage.from("payment-proofs").remove([oldPath]);
        }
      }

      // Delete payment record
      const { error } = await supabase
        .from("event_payments")
        .delete()
        .eq("id", deleteDialog.payment.id);

      if (error) throw error;

      toast.success("Payment deleted successfully");
      loadData();
      setDeleteDialog({ open: false, payment: null });
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
    }
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
      <div className="container mx-auto px-4 py-3 md:py-6">
        <div className="mb-3 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-accent flex items-center justify-center">
              <Calendar className="w-4 h-4 md:w-6 md:h-6 text-accent-foreground" />
            </div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">Events</h1>
          </div>
          <p className="text-xs md:text-base text-muted-foreground">View and pay for events</p>
        </div>

        <div className="space-y-3 md:space-y-4">
          {events.map((event) => {
            const status = getEventStatus(event.event_date);
            const paymentStatus = getPaymentStatus(event.id);
            const eventPayment = getEventPayment(event.id);
            
            return (
              <Card key={event.id} className="border-border bg-card shadow-md">
                <CardHeader className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm md:text-lg mb-1">{event.title}</CardTitle>
                      {event.description && (
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                        <span>{new Date(event.event_date).toLocaleDateString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          status === "upcoming" ? "bg-yellow-500/10 text-yellow-600" :
                          status === "active" ? "bg-green-500/10 text-green-600" :
                          "bg-gray-500/10 text-gray-600"
                        }`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-base md:text-xl font-bold text-accent whitespace-nowrap">
                        ₦{Number(event.amount).toLocaleString()}
                      </p>
                      <Button
                        size="sm"
                        className={`h-7 md:h-8 text-xs md:text-sm ${
                          paymentStatus === "approved" ? "bg-green-600 hover:bg-green-700" :
                          paymentStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" :
                          ""
                        }`}
                        onClick={() => setSelectedEvent(event)}
                        disabled={paymentStatus === "approved" || paymentStatus === "pending"}
                      >
                        {paymentStatus === "approved" ? "Paid" : paymentStatus === "pending" ? "Pending" : "Pay"}
                      </Button>
                    </div>
                  </div>
                  {eventPayment?.payment_proof_url && (
                    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border">
                      {eventPayment.status === "rejected" && eventPayment.admin_note && (
                        <div className="mb-1 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                          <p className="text-xs font-semibold text-destructive mb-1">Rejection Reason:</p>
                          <p className="text-xs text-muted-foreground">{eventPayment.admin_note}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs flex items-center gap-1"
                          onClick={() => window.open(eventPayment.payment_proof_url, "_blank")}
                        >
                          <Eye className="w-3 h-3" />
                          View Proof
                        </Button>
                        {paymentStatus === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex items-center gap-1"
                            onClick={() => setUpdateProofDialog({ open: true, payment: eventPayment })}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Update Proof
                          </Button>
                        )}
                        {paymentStatus === "rejected" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs flex items-center gap-1"
                              onClick={() => setUpdateRejectedDialog({ open: true, payment: eventPayment })}
                            >
                              <RefreshCw className="w-3 h-3" />
                              Update & Resubmit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => setDeleteDialog({ open: true, payment: eventPayment })}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {events.length === 0 && (
          <Card className="p-8 md:p-12 text-center">
            <p className="text-sm md:text-base text-muted-foreground">No events available</p>
          </Card>
        )}
      </div>

      {selectedEvent && (
        <EventPaymentModal
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
          onSuccess={() => {
            setSelectedEvent(null);
            loadData();
          }}
        />
      )}

      {updateProofDialog.payment && (
        <UpdatePaymentProofDialog
          open={updateProofDialog.open}
          onOpenChange={(open) => setUpdateProofDialog({ open, payment: null })}
          paymentId={updateProofDialog.payment.id}
          paymentType="event"
          currentProofUrl={updateProofDialog.payment.payment_proof_url}
          onSuccess={loadData}
        />
      )}

      {updateRejectedDialog.payment && (
        <UpdateRejectedPaymentDialog
          open={updateRejectedDialog.open}
          onOpenChange={(open) => setUpdateRejectedDialog({ open, payment: null })}
          payment={updateRejectedDialog.payment}
          paymentType="event"
          events={events}
          onSuccess={loadData}
        />
      )}

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, payment: null })}
        title="Delete Payment"
        description="Are you sure you want to delete this event payment? This action cannot be undone."
        onConfirm={handleDeletePayment}
      />

      <BottomNav />
    </div>
  );
};

export default Events;
