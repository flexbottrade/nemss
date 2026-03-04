import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { parseProofUrls, serializeProofUrls, MAX_PROOF_FILES } from "@/lib/payment-proofs";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";

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
  const [newProofFiles, setNewProofFiles] = useState<File[]>([]);

  const existingUrls = parseProofUrls(currentProofUrl);

  const handleUpdate = async () => {
    if (newProofFiles.length === 0) {
      toast.error("Please select new payment proof(s)");
      return;
    }

    if (existingUrls.length + newProofFiles.length > MAX_PROOF_FILES) {
      toast.error(`Maximum ${MAX_PROOF_FILES} proofs allowed`);
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload new files
      const newUrls: string[] = [];
      for (const file of newProofFiles) {
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("payment-proofs").getPublicUrl(fileName);
        newUrls.push(publicUrl);
      }

      // Combine existing + new
      const allUrls = [...existingUrls, ...newUrls];

      const table = paymentType === "dues" ? "dues_payments" : paymentType === "event" ? "event_payments" : "donation_payments";

      const { error: updateError } = await supabase
        .from(table)
        .update({ payment_proof_url: serializeProofUrls(allUrls) })
        .eq("id", paymentId);

      if (updateError) throw updateError;

      toast.success("Payment proof updated successfully");
      setNewProofFiles([]);
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
            Add more payment proofs (up to {MAX_PROOF_FILES} total). Existing: {existingUrls.length}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <PaymentProofUpload
            files={newProofFiles}
            onFilesChange={setNewProofFiles}
            existingCount={existingUrls.length}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleUpdate}
              disabled={uploading || newProofFiles.length === 0}
              className="flex-1 text-xs md:text-sm h-8 md:h-10"
            >
              <Upload className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              {uploading ? "Uploading..." : "Update Proof"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs md:text-sm h-8 md:h-10">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
