import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { EventPaymentModal } from "@/components/EventPaymentModal";

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

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

  const hasPaidForEvent = (eventId: string) => {
    return payments.some(p => p.event_id === eventId && (p.status === "approved" || p.is_manually_updated));
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
            const isPaid = hasPaidForEvent(event.id);
            
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
                          status === "upcoming" ? "bg-blue-500/10 text-blue-600" :
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
                        className="h-7 md:h-8 text-xs md:text-sm"
                        onClick={() => setSelectedEvent(event)}
                        disabled={isPaid}
                      >
                        {isPaid ? "Paid" : "Pay"}
                      </Button>
                    </div>
                  </div>
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

      <BottomNav />
    </div>
  );
};

export default Events;
