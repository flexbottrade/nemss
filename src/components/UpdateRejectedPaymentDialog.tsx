import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
import { uploadProofFiles, deleteProofFiles } from "@/lib/upload-proofs";

interface UpdateRejectedPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
  paymentType: "dues" | "event" | "donation";
  onSuccess: () => void;
  events?: any[];
  donations?: any[];
  variableDues?: any[];
}

export const UpdateRejectedPaymentDialog = ({
  open,
  onOpenChange,
  payment,
  paymentType,
  onSuccess,
  events = [],
  donations = [],
  variableDues = [],
}: UpdateRejectedPaymentDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [proofFiles, setProofFiles] = useState<File[]>([]);

  useEffect(() => {
    if (payment && paymentType === "dues") {
      setFormData({
        year: payment.start_year,
        selectedMonths: Array.from({ length: payment.months_paid }, (_, i) => 
          ((payment.start_month - 1 + i) % 12) + 1
        ),
      });
    } else if (payment && paymentType === "event") {
      setFormData({ eventId: payment.event_id });
    } else if (payment && paymentType === "donation") {
      setFormData({ donationId: payment.donation_id, amount: payment.amount.toString() });
    }
    setProofFiles([]);
  }, [payment, paymentType]);

  const getMonthlyDues = (year: number) => {
    const setting = variableDues.find(d => d.year === year);
    return setting?.is_waived ? 0 : (setting?.monthly_amount || 3000);
  };

  const toggleMonth = (month: number) => {
    setFormData((prev: any) => {
      const selected = prev.selectedMonths || [];
      if (selected.includes(month)) {
        return { ...prev, selectedMonths: selected.filter((m: number) => m !== month) };
      } else {
        return { ...prev, selectedMonths: [...selected, month].sort((a: number, b: number) => a - b) };
      }
    });
  };

  const handleUpdate = async () => {
    if (proofFiles.length === 0) {
      toast.error("Please upload new payment proof");
      return;
    }

    if (paymentType === "dues" && (!formData.selectedMonths || formData.selectedMonths.length === 0)) {
      toast.error("Please select at least one month");
      return;
    }

    if (paymentType === "donation" && (!formData.amount || parseFloat(formData.amount) <= 0)) {
      toast.error("Please enter a valid amount");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete old proofs
      await deleteProofFiles(payment.payment_proof_url);

      // Upload new proofs
      const proofUrlValue = await uploadProofFiles(user.id, proofFiles);

      let updateData: any = {
        payment_proof_url: proofUrlValue,
        status: "pending",
        updated_at: new Date().toISOString(),
      };

      if (paymentType === "dues") {
        const monthlyDues = getMonthlyDues(formData.year);
        updateData = {
          ...updateData,
          start_year: formData.year,
          start_month: formData.selectedMonths[0],
          months_paid: formData.selectedMonths.length,
          amount: monthlyDues * formData.selectedMonths.length,
        };
      } else if (paymentType === "event") {
        const selectedEvent = events.find(e => e.id === formData.eventId);
        updateData = { ...updateData, event_id: formData.eventId, amount: selectedEvent?.amount || payment.amount };
      } else if (paymentType === "donation") {
        updateData = { ...updateData, donation_id: formData.donationId, amount: parseFloat(formData.amount) };
      }

      const tableName = paymentType === "dues" ? "dues_payments" : paymentType === "event" ? "event_payments" : "donation_payments";

      const { error } = await supabase.from(tableName).update(updateData).eq("id", payment.id);
      if (error) throw error;

      // Send email notification
      const { data: profile } = await supabase.from("profiles").select("first_name, last_name, member_id").eq("id", user.id).single();

      let details = "";
      if (paymentType === "dues") {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        details = `${formData.year} - ${formData.selectedMonths.map((m: number) => monthNames[m - 1]).join(", ")}`;
      } else if (paymentType === "event") {
        details = events.find(e => e.id === formData.eventId)?.title || "Event Payment";
      } else if (paymentType === "donation") {
        details = donations.find(d => d.id === formData.donationId)?.title || "Donation";
      }

      try {
        await supabase.functions.invoke("send-payment-notification-email", {
          body: {
            payment_type: paymentType === "dues" ? "Dues" : paymentType === "event" ? "Event" : "Donation",
            payment_id: payment.id,
            member_name: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown User",
            member_id: profile?.member_id || "N/A",
            amount: updateData.amount,
            date: new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }),
            details,
            payment_proof_url: proofUrlValue,
          },
        });
      } catch (notificationError) {
        console.error("Failed to send email notification:", notificationError);
      }

      toast.success("Payment updated and resubmitted successfully!");
      setProofFiles([]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating payment:", error);
      toast.error(error.message || "Failed to update payment");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update & Resubmit Payment</DialogTitle>
          <DialogDescription>Update your rejected payment details and proof, then resubmit for approval.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {paymentType === "dues" && (
            <>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={formData.year?.toString()} onValueChange={(value) => setFormData({ ...formData, year: parseInt(value), selectedMonths: [] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Months</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, idx) => (
                    <div key={month} className="flex items-center space-x-2">
                      <Checkbox id={`month-${idx + 1}`} checked={formData.selectedMonths?.includes(idx + 1)} onCheckedChange={() => toggleMonth(idx + 1)} />
                      <label htmlFor={`month-${idx + 1}`} className="text-sm cursor-pointer">{month}</label>
                    </div>
                  ))}
                </div>
              </div>
              {formData.selectedMonths?.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Total Amount: ₦{(getMonthlyDues(formData.year) * formData.selectedMonths.length).toLocaleString()}</p>
                </div>
              )}
            </>
          )}

          {paymentType === "event" && (
            <div className="space-y-2">
              <Label>Event</Label>
              <Select value={formData.eventId} onValueChange={(value) => setFormData({ ...formData, eventId: value })}>
                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>{event.title} - ₦{event.amount.toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {paymentType === "donation" && (
            <>
              <div className="space-y-2">
                <Label>Donation</Label>
                <Select value={formData.donationId} onValueChange={(value) => setFormData({ ...formData, donationId: value })}>
                  <SelectTrigger><SelectValue placeholder="Select donation" /></SelectTrigger>
                  <SelectContent>
                    {donations.map((donation) => (
                      <SelectItem key={donation.id} value={donation.id}>{donation.title} (Min: ₦{donation.minimum_amount.toLocaleString()})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (₦)</Label>
                <Input type="number" value={formData.amount || ""} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="Enter amount" />
              </div>
            </>
          )}

          <PaymentProofUpload
            files={proofFiles}
            onFilesChange={setProofFiles}
            label="New Payment Proof(s)"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={uploading}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update & Resubmit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
