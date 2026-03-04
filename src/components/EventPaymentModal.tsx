import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Upload, CreditCard } from "lucide-react";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
import { uploadProofFiles } from "@/lib/upload-proofs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EventPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    amount: number;
  };
  userId?: string;
  onSuccess?: () => void;
}

export const EventPaymentModal = ({ open, onOpenChange, event, userId, onSuccess }: EventPaymentModalProps) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [proofFiles, setProofFiles] = useState<File[]>([]);

  const { data: paymentAccounts = [] } = useQuery({
    queryKey: ["payment-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (proofUrl: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: insertedPayment, error } = await supabase.from("event_payments").insert([{
        event_id: event.id,
        user_id: userId || user?.id,
        amount: event.amount,
        payment_proof_url: proofUrl,
        status: "pending",
      }]).select().single();
      if (error) throw error;

      // Get user profile for email notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, member_id")
        .eq("id", userId || user?.id)
        .single();

      // Send email notification
      try {
        await supabase.functions.invoke("send-payment-notification-email", {
          body: {
            payment_type: "Event",
            payment_id: insertedPayment.id,
            member_name: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown User",
            member_id: profile?.member_id || "N/A",
            amount: event.amount,
            date: new Date().toLocaleDateString('en-NG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            details: event.title,
            payment_proof_url: `payment-proofs/${insertedPayment.payment_proof_url.split('payment-proofs/')[1]}`,
          },
        });
      } catch (notificationError) {
        console.error("Failed to send email notification:", notificationError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-payments"] });
      toast.success("Payment submitted successfully! Awaiting admin approval.");
      onOpenChange(false);
      setProofFiles([]);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error("Failed to submit payment");
      console.error(error);
    },
  });

  const handleCopyAccount = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber);
    toast.success("Account number copied!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (proofFiles.length === 0) {
      toast.error("Please upload at least one payment proof");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const proofUrlValue = await uploadProofFiles(userId || user?.id || '', proofFiles);
      await createPaymentMutation.mutateAsync(proofUrlValue);
    } catch (error) {
      toast.error("Failed to upload payment proof");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">{event.title}</DialogTitle>
          <DialogDescription className="text-sm">
            Complete your payment for this event
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-primary/5 p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <p className="text-xs md:text-sm font-medium">Amount</p>
            </div>
            <p className="text-xl md:text-2xl font-bold">₦{event.amount.toLocaleString()}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Payment Account Details</Label>
            {paymentAccounts.map((account) => (
              <div key={account.id} className="rounded-lg border p-3 space-y-2">
                <p className="text-xs md:text-sm font-medium">{account.bank_name}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{account.account_name}</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm md:text-base font-mono font-semibold">{account.account_number}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyAccount(account.account_number)}
                    className="h-7 md:h-8"
                  >
                    <Copy className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <PaymentProofUpload
            files={proofFiles}
            onFilesChange={setProofFiles}
            label="Upload Payment Proof(s)"
          />

          <Button
            type="submit"
            disabled={uploading}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Submitting..." : "Submit Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
