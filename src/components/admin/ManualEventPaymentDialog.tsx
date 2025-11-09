import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManualEventPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  onSuccess: () => void;
  existingPayment?: {
    id: string;
    event_id: string;
    amount: number;
    admin_note: string;
  } | null;
}

export const ManualEventPaymentDialog = ({
  open,
  onOpenChange,
  memberId,
  memberName,
  onSuccess,
  existingPayment,
}: ManualEventPaymentDialogProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState(existingPayment?.event_id || "");
  const [amount, setAmount] = useState(existingPayment?.amount.toString() || "");
  const [adminNote, setAdminNote] = useState(existingPayment?.admin_note || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (existingPayment) {
      setSelectedEvent(existingPayment.event_id);
      setAmount(existingPayment.amount.toString());
      setAdminNote(existingPayment.admin_note || "");
    }
  }, [existingPayment]);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });
    setEvents(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const paymentData = {
      user_id: memberId,
      event_id: selectedEvent,
      amount: parseFloat(amount),
      admin_note: adminNote,
      status: "approved",
      is_manually_updated: true,
    };

    let error;
    if (existingPayment) {
      const { error: updateError } = await supabase
        .from("event_payments")
        .update(paymentData)
        .eq("id", existingPayment.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("event_payments")
        .insert(paymentData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast.error(`Failed to ${existingPayment ? "update" : "add"} event payment`);
    } else {
      toast.success(`Event payment ${existingPayment ? "updated" : "added"} successfully`);
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingPayment ? "Edit" : "Add"} Manual Event Payment for {memberName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event">Event</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent} disabled={!!existingPayment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} - {new Date(event.event_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_note">Admin Note</Label>
              <Textarea
                id="admin_note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Optional note about this payment..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedEvent}>
              {loading ? "Saving..." : existingPayment ? "Update Payment" : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
