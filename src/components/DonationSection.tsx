import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const DonationSection = () => {
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: donations = [] } = useQuery({
    queryKey: ["active-donations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("donations")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: donationPayments = [], refetch: refetchPayments } = useQuery({
    queryKey: ["user-donation-payments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from("donation_payments")
        .select("*")
        .eq("user_id", user.id);
      return data || [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["payment-accounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) < selectedDonation.minimum_amount) {
      toast.error(`Minimum donation amount is ₦${selectedDonation.minimum_amount.toLocaleString()}`);
      return;
    }
    if (!proof) {
      toast.error("Please upload payment proof");
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const fileName = `${user.id}/${Date.now()}_${proof.name}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, proof);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      const { data: insertedPayment, error } = await supabase.from("donation_payments").insert({
        user_id: user.id,
        donation_id: selectedDonation.id,
        amount: parseFloat(amount),
        payment_proof_url: publicUrl,
        status: "pending",
      }).select().single();

      if (error) throw error;

      // Get user profile for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      // Send WhatsApp notification
      await supabase.functions.invoke("payment-notify", {
        body: {
          payment_type: "Donation",
          payment_id: insertedPayment.id,
          user_name: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown User",
          amount: parseFloat(amount),
          date: new Date().toLocaleDateString('en-GB'),
        },
      });

      toast.success("Donation submitted successfully!");
      setSelectedDonation(null);
      setAmount("");
      setProof(null);
      refetchPayments();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit donation");
    } finally {
      setUploading(false);
    }
  };

  if (donations.length === 0) return null;

  return (
    <>
      <Card className="mt-4 md:mt-6 border-accent/20">
        <CardHeader className="p-2 md:p-3">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Gift className="w-3 h-3 md:w-4 md:h-4 text-accent" />
            Active Donations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-3 pt-0 space-y-2">
          {donations.map((donation) => {
            const payment = donationPayments.find(p => p.donation_id === donation.id);
            const paymentStatus = payment ? payment.status : null;
            
            return (
              <div key={donation.id} className="p-2 md:p-3 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs md:text-sm text-foreground">{donation.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Min: ₦{Number(donation.minimum_amount).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className={`h-6 md:h-7 text-xs ${
                      paymentStatus === "approved" ? "bg-green-600 hover:bg-green-700" :
                      paymentStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" :
                      "bg-accent hover:bg-accent/90"
                    }`}
                    onClick={() => setSelectedDonation(donation)}
                    disabled={paymentStatus === "approved" || paymentStatus === "pending"}
                  >
                    {paymentStatus === "approved" ? "Paid" : paymentStatus === "pending" ? "Pending" : "Donate"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDonation} onOpenChange={(open) => !open && setSelectedDonation(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm md:text-base">{selectedDonation?.title}</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Make a donation (minimum ₦{selectedDonation?.minimum_amount.toLocaleString()})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 md:space-y-4">
            <div>
              <Label className="text-xs md:text-sm">Donation Amount (₦)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min: ${selectedDonation?.minimum_amount}`}
                className="mt-1 text-xs md:text-sm h-8 md:h-10"
              />
            </div>

            {accounts.length > 0 && (
              <div>
                <Label className="text-xs md:text-sm mb-2 block">Payment Account Details</Label>
                <div className="space-y-1.5 md:space-y-2">
                  {accounts.map((account) => (
                    <div key={account.id} className="p-2 rounded-lg bg-card border border-border">
                      <p className="font-semibold text-xs text-foreground">{account.account_name}</p>
                      <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs md:text-sm font-mono font-bold text-accent">{account.account_number}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(account.account_number);
                            toast.success("Account number copied!");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs md:text-sm">Upload Payment Proof</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setProof(e.target.files?.[0] || null)}
                className="mt-1 text-xs h-8 md:h-10"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit} 
                disabled={uploading} 
                className="flex-1 text-xs md:text-sm h-8 md:h-9"
              >
                {uploading ? "Submitting..." : "Submit Donation"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSelectedDonation(null)} 
                className="text-xs md:text-sm h-8 md:h-9"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
