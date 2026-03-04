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
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
import { uploadProofFiles } from "@/lib/upload-proofs";

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
  const [paidDonationIds, setPaidDonationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [proofFiles, setProofFiles] = useState<File[]>([]);

  useEffect(() => {
    loadDonations();
  }, [memberId]);

  useEffect(() => {
    if (existingPayment) {
      setSelectedDonation(existingPayment.donation_id);
      setAmount(existingPayment.amount.toString());
    }
  }, [existingPayment]);

  const loadDonations = async () => {
    const { data: donationsData } = await supabase.from("donations").select("*").order("created_at", { ascending: false });
    setDonations(donationsData || []);

    const { data: paymentsData } = await supabase
      .from("donation_payments").select("donation_id").eq("user_id", memberId).eq("status", "approved");
    setPaidDonationIds(paymentsData?.map(p => p.donation_id) || []);
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
        donation_id: selectedDonation,
        amount: parseFloat(amount),
        status: "approved",
        is_manually_updated: true,
        ...(proofUrlValue ? { payment_proof_url: proofUrlValue } : {}),
      };

      let error;
      if (existingPayment) {
        const { error: updateError } = await supabase.from("donation_payments").update(paymentData).eq("id", existingPayment.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("donation_payments").insert(paymentData);
        error = insertError;
      }

      if (error) {
        toast.error(`Failed to ${existingPayment ? "update" : "add"} donation payment`);
      } else {
        toast.success(`Donation payment ${existingPayment ? "updated" : "added"} successfully`);
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
          <DialogTitle>{existingPayment ? "Edit" : "Add"} Manual Donation Payment for {memberName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="donation">Donation</Label>
              <Select value={selectedDonation} onValueChange={setSelectedDonation} disabled={!!existingPayment}>
                <SelectTrigger><SelectValue placeholder="Select donation" /></SelectTrigger>
                <SelectContent>
                  {donations.map((donation) => {
                    const isPaid = paidDonationIds.includes(donation.id);
                    return (
                      <SelectItem key={donation.id} value={donation.id} disabled={isPaid && !existingPayment}>
                        {donation.title}
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
            <Button type="submit" disabled={loading || !selectedDonation}>
              {loading ? "Saving..." : existingPayment ? "Update Payment" : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
