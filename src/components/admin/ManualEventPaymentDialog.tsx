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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDateDDMMYY } from "@/lib/utils";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
import { uploadProofFiles } from "@/lib/upload-proofs";

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
  const [paidEventIds, setPaidEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [proofFiles, setProofFiles] = useState<File[]>([]);

  useEffect(() => {
    if (selectedEvent && !existingPayment) {
      const event = events.find(e => e.id === selectedEvent);
      if (event) setAmount(event.amount.toString());
    }
  }, [selectedEvent, events, existingPayment]);

  useEffect(() => {
    loadEvents();
  }, [memberId]);

  useEffect(() => {
    if (existingPayment) {
      setSelectedEvent(existingPayment.event_id);
      setAmount(existingPayment.amount.toString());
    }
  }, [existingPayment]);

  const loadEvents = async () => {
    const { data: eventsData } = await supabase.from("events").select("*").order("event_date", { ascending: false });
    setEvents(eventsData || []);

    const { data: paymentsData } = await supabase
      .from("event_payments").select("event_id").eq("user_id", memberId).eq("status", "approved");
    setPaidEventIds(paymentsData?.map(p => p.event_id) || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let proofUrlValue: string | null = null;
      if (proofFiles.length > 0) {
        proofUrlValue = await uploadProofFiles(memberId, proofFiles);
      }

      const paymentData: any = {
        user_id: memberId,
        event_id: selectedEvent,
        amount: parseFloat(amount),
        status: "approved",
        is_manually_updated: true,
        ...(proofUrlValue ? { payment_proof_url: proofUrlValue } : {}),
      };

      let error;
      if (existingPayment) {
        const { error: updateError } = await supabase.from("event_payments").update(paymentData).eq("id", existingPayment.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("event_payments").insert(paymentData);
        error = insertError;
      }

      if (error) {
        toast.error(`Failed to ${existingPayment ? "update" : "add"} event payment`);
      } else {
        toast.success(`Event payment ${existingPayment ? "updated" : "added"} successfully`);
        setProofFiles([]);
        onSuccess();
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process payment");
    } finally {
      setLoading(false);
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
                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                <SelectContent>
                  {events.map((event) => {
                    const isPaid = paidEventIds.includes(event.id);
                    return (
                      <SelectItem key={event.id} value={event.id} disabled={isPaid && !existingPayment}>
                        {event.title} - {formatDateDDMMYY(event.event_date)}
                        {isPaid && !existingPayment && " (Paid)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0" />
            </div>
            <PaymentProofUpload
              files={proofFiles}
              onFilesChange={setProofFiles}
              label="Payment Proof (optional)"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !selectedEvent}>
              {loading ? "Saving..." : existingPayment ? "Update Payment" : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
