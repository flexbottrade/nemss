import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Copy, Upload } from "lucide-react";
import { toast } from "sonner";

interface DonationSectionProps {
  userId: string;
}

export const DonationSection = ({ userId }: DonationSectionProps) => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: activeDonations = [] } = useQuery({
    queryKey: ["active-donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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

  const createDonationMutation = useMutation({
    mutationFn: async (data: { proofUrl: string; amount: number }) => {
      const { error } = await supabase.from("donation_payments").insert([{
        donation_id: selectedDonation.id,
        user_id: userId,
        amount: data.amount,
        payment_proof_url: data.proofUrl,
        status: "pending",
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donation-payments"] });
      toast.success("Donation submitted successfully! Thank you for your generosity.");
      setShowModal(false);
      setAmount("");
      setPaymentProof(null);
      setSelectedDonation(null);
    },
    onError: (error) => {
      toast.error("Failed to submit donation");
      console.error(error);
    },
  });

  const handleOpenModal = (donation: any) => {
    setSelectedDonation(donation);
    setAmount(donation.minimum_amount.toString());
    setShowModal(true);
  };

  const handleCopyAccount = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber);
    toast.success("Account number copied!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const donationAmount = parseFloat(amount);
    if (isNaN(donationAmount) || donationAmount < selectedDonation.minimum_amount) {
      toast.error(`Minimum donation amount is ₦${selectedDonation.minimum_amount.toLocaleString()}`);
      return;
    }

    if (!paymentProof) {
      toast.error("Please upload payment proof");
      return;
    }

    setUploading(true);
    try {
      const fileExt = paymentProof.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, paymentProof);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      await createDonationMutation.mutateAsync({ proofUrl: publicUrl, amount: donationAmount });
    } catch (error) {
      toast.error("Failed to upload payment proof");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  if (activeDonations.length === 0) return null;

  return (
    <>
      <div className="space-y-3 md:space-y-4">
        {activeDonations.map((donation) => (
          <Card key={donation.id} className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <CardTitle className="text-base md:text-lg">{donation.title}</CardTitle>
                </div>
                <Button
                  size="sm"
                  className="bg-[#0E3B43] text-[#F8E39C] hover:bg-[#0E3B43]/90 h-7 md:h-8 text-xs md:text-sm"
                  onClick={() => handleOpenModal(donation)}
                >
                  Donate
                </Button>
              </div>
              <CardDescription className="text-xs md:text-sm">
                Minimum: ₦{donation.minimum_amount.toLocaleString()}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{selectedDonation?.title}</DialogTitle>
            <DialogDescription className="text-sm">
              Make your donation to support this cause
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm">
                Donation Amount (₦)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={selectedDonation?.minimum_amount || 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
                className="text-sm md:text-base"
              />
              <p className="text-xs text-muted-foreground">
                Minimum: ₦{selectedDonation?.minimum_amount.toLocaleString()}
              </p>
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

            <div className="space-y-2">
              <Label htmlFor="donation-proof" className="text-sm">
                Upload Payment Proof
              </Label>
              <Input
                id="donation-proof"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-xs md:text-sm"
                required
              />
              {paymentProof && (
                <p className="text-xs text-muted-foreground">
                  Selected: {paymentProof.name}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={uploading}
              className="w-full bg-[#0E3B43] text-[#F8E39C] hover:bg-[#0E3B43]/90"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Submitting..." : "Submit Donation"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
