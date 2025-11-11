import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface UpdatePaymentProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  paymentType: "dues" | "event" | "donation";
  currentProofUrl: string | null;
  onSuccess: () => void;
}

export const UpdatePaymentProofDialog = ({
  open,
  onOpenChange,
  paymentId,
  paymentType,
  currentProofUrl,
  onSuccess,
}: UpdatePaymentProofDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [newProof, setNewProof] = useState<File | null>(null);

  const handleUpdate = async () => {
    if (!newProof) {
      toast.error("Please select a new payment proof");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete old proof if it exists
      if (currentProofUrl) {
        const oldFileName = currentProofUrl.split('/').pop();
        if (oldFileName) {
          const oldPath = `${user.id}/${oldFileName}`;
          await supabase.storage.from("payment-proofs").remove([oldPath]);
        }
      }

      // Upload new proof
      const fileName = `${user.id}/${Date.now()}_${newProof.name}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, newProof);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      // Update payment record
      const table = paymentType === "dues" 
        ? "dues_payments" 
        : paymentType === "event" 
        ? "event_payments" 
        : "donation_payments";

      const { error: updateError } = await supabase
        .from(table)
        .update({ payment_proof_url: publicUrl })
        .eq("id", paymentId);

      if (updateError) throw updateError;

      toast.success("Payment proof updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update payment proof");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm md:text-base">Update Payment Proof</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Upload a new payment proof. The old proof will be deleted automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs md:text-sm">New Payment Proof (Image)</Label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewProof(e.target.files?.[0] || null)}
              className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-border rounded-md bg-input text-foreground text-xs md:text-sm mt-2"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleUpdate}
              disabled={uploading || !newProof}
              className="flex-1 text-xs md:text-sm h-8 md:h-10"
            >
              <Upload className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              {uploading ? "Uploading..." : "Update Proof"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs md:text-sm h-8 md:h-10"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
