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

interface ManualDonationPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  onSuccess: () => void;
  existingPayment?: {
    id: string;
    donation_id: string;
    amount: number;
    admin_note: string;
  } | null;
}

export const ManualDonationPaymentDialog = ({
  open,
  onOpenChange,
  memberId,
  memberName,
  onSuccess,
  existingPayment,
}: ManualDonationPaymentDialogProps) => {
  const [donations, setDonations] = useState<any[]>([]);
  const [selectedDonation, setSelectedDonation] = useState(existingPayment?.donation_id || "");
  const [amount, setAmount] = useState(existingPayment?.amount.toString() || "");
  const [adminNote, setAdminNote] = useState(existingPayment?.admin_note || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDonations();
  }, []);

  useEffect(() => {
    if (existingPayment) {
      setSelectedDonation(existingPayment.donation_id);
      setAmount(existingPayment.amount.toString());
      setAdminNote(existingPayment.admin_note || "");
    }
  }, [existingPayment]);

  const loadDonations = async () => {
    const { data } = await supabase
      .from("donations")
      .select("*")
      .order("created_at", { ascending: false });
    setDonations(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const paymentData = {
      user_id: memberId,
      donation_id: selectedDonation,
      amount: parseFloat(amount),
      admin_note: adminNote,
      status: "approved",
      is_manually_updated: true,
    };

    let error;
    if (existingPayment) {
      const { error: updateError } = await supabase
        .from("donation_payments")
        .update(paymentData)
        .eq("id", existingPayment.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("donation_payments")
        .insert(paymentData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast.error(`Failed to ${existingPayment ? "update" : "add"} donation payment`);
    } else {
      toast.success(`Donation payment ${existingPayment ? "updated" : "added"} successfully`);
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingPayment ? "Edit" : "Add"} Manual Donation Payment for {memberName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="donation">Donation</Label>
              <Select value={selectedDonation} onValueChange={setSelectedDonation} disabled={!!existingPayment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select donation" />
                </SelectTrigger>
                <SelectContent>
                  {donations.map((donation) => (
                    <SelectItem key={donation.id} value={donation.id}>
                      {donation.title}
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
            <Button type="submit" disabled={loading || !selectedDonation}>
              {loading ? "Saving..." : existingPayment ? "Update Payment" : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
