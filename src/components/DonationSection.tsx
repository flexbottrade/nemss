import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, CheckCircle2, XCircle, Clock, RefreshCw, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UpdateRejectedPaymentDialog } from "@/components/UpdateRejectedPaymentDialog";
import { UpdatePaymentProofDialog } from "@/components/UpdatePaymentProofDialog";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

export const DonationSection = () => {
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [updateProofDialog, setUpdateProofDialog] = useState<{ open: boolean; payment: any }>({
    open: false,
    payment: null,
  });
  const [updateRejectedDialog, setUpdateRejectedDialog] = useState<{ open: boolean; payment: any }>({
    open: false,
    payment: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; payment: any }>({
    open: false,
    payment: null,
  });

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

      // Get user profile for email notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, member_id")
        .eq("id", user.id)
        .single();

      // Send email notification
      try {
        await supabase.functions.invoke("send-payment-notification-email", {
          body: {
            payment_type: "Donation",
            payment_id: insertedPayment.id,
            member_name: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown User",
            member_id: profile?.member_id || "N/A",
            amount: parseFloat(amount),
            date: new Date().toLocaleDateString('en-NG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            details: selectedDonation.title,
            payment_proof_url: `payment-proofs/${fileName}`,
          },
        });
      } catch (notificationError) {
        console.error("Failed to send email notification:", notificationError);
      }

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

  const handleDeletePayment = async () => {
    if (!deleteDialog.payment) return;

    try {
      // Delete proof from storage if exists
      if (deleteDialog.payment.payment_proof_url) {
        const oldPath = deleteDialog.payment.payment_proof_url.split('payment-proofs/')[1];
        if (oldPath) {
          await supabase.storage.from("payment-proofs").remove([oldPath]);
        }
      }

      // Delete payment record
      const { error } = await supabase
        .from("donation_payments")
        .delete()
        .eq("id", deleteDialog.payment.id);

      if (error) throw error;

      toast.success("Payment deleted successfully");
      setDeleteDialog({ open: false, payment: null });
      refetchPayments();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete payment");
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
                {payment?.payment_proof_url && (
                  <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border">
                    {payment.status === "rejected" && payment.admin_note && (
                      <div className="mb-1 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                        <p className="text-xs font-semibold text-destructive mb-1">Rejection Reason:</p>
                        <p className="text-xs text-muted-foreground">{payment.admin_note}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex items-center gap-1"
                        onClick={() => window.open(payment.payment_proof_url, "_blank")}
                      >
                        <Eye className="w-3 h-3" />
                        View Proof
                      </Button>
                      {paymentStatus === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs flex items-center gap-1"
                          onClick={() => setUpdateProofDialog({ open: true, payment })}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Update Proof
                        </Button>
                      )}
                      {paymentStatus === "rejected" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs flex items-center gap-1"
                            onClick={() => setUpdateRejectedDialog({ open: true, payment })}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Update & Resubmit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => setDeleteDialog({ open: true, payment })}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
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

      <UpdatePaymentProofDialog
        open={updateProofDialog.open}
        onOpenChange={(open) => setUpdateProofDialog({ open, payment: null })}
        paymentId={updateProofDialog.payment?.id || ""}
        paymentType="donation"
        currentProofUrl={updateProofDialog.payment?.payment_proof_url || null}
        onSuccess={refetchPayments}
      />

      <UpdateRejectedPaymentDialog
        open={updateRejectedDialog.open}
        onOpenChange={(open) => setUpdateRejectedDialog({ open, payment: null })}
        payment={updateRejectedDialog.payment}
        paymentType="donation"
        onSuccess={refetchPayments}
      />

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, payment: null })}
        onConfirm={handleDeletePayment}
        title="Delete Payment"
        description="Are you sure you want to delete this payment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};
