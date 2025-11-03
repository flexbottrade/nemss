import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface PaymentAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
}

interface DuesPayment {
  id: string;
  start_month: number;
  start_year: number;
  months_paid: number;
  amount: number;
  status: string;
  payment_proof_url: string | null;
  admin_note: string | null;
  created_at: string;
}

const Payments = () => {
  const navigate = useNavigate();
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [duesPayments, setDuesPayments] = useState<DuesPayment[]>([]);
  const [monthlyDuesAmount, setMonthlyDuesAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    start_month: new Date().getMonth() + 1,
    start_year: new Date().getFullYear(),
    months_paid: 1,
  });
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setUserId(user.id);
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load payment accounts
    const { data: accounts } = await supabase
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (accounts) setPaymentAccounts(accounts);

    // Load settings for monthly dues amount
    const { data: settings } = await supabase
      .from("settings")
      .select("monthly_dues_amount")
      .single();

    if (settings) setMonthlyDuesAmount(settings.monthly_dues_amount);

    // Load user's dues payments
    const { data: payments } = await supabase
      .from("dues_payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (payments) setDuesPayments(payments);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !proofFile) {
      toast.error("Please select a payment proof image");
      return;
    }

    setLoading(true);
    try {
      // Upload payment proof
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, proofFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      // Calculate amount
      const amount = monthlyDuesAmount * formData.months_paid;

      // Create payment record
      const { error: insertError } = await supabase
        .from("dues_payments")
        .insert({
          user_id: userId,
          start_month: formData.start_month,
          start_year: formData.start_year,
          months_paid: formData.months_paid,
          amount,
          payment_proof_url: publicUrl,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast.success("Payment submitted successfully! Awaiting admin approval.");
      setProofFile(null);
      setFormData({
        start_month: new Date().getMonth() + 1,
        start_year: new Date().getFullYear(),
        months_paid: 1,
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit payment");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <Wallet className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Dues Payment</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Pay your monthly dues - ₦{monthlyDuesAmount.toLocaleString()} per month
          </p>
        </div>

        {/* Payment Accounts */}
        {paymentAccounts.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl">Payment Accounts</CardTitle>
              <p className="text-sm text-muted-foreground">Transfer to any of these accounts</p>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-3">
                {paymentAccounts.map((account) => (
                  <div key={account.id} className="p-3 md:p-4 bg-muted/50 rounded-lg">
                    <p className="font-semibold text-sm md:text-base">{account.bank_name}</p>
                    <p className="text-lg md:text-xl font-mono font-bold">{account.account_number}</p>
                    <p className="text-sm text-muted-foreground">{account.account_name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Form */}
        <Card className="mb-6">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Submit Payment</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_month">Start Month</Label>
                  <select
                    id="start_month"
                    className="w-full mt-1.5 px-3 py-2 bg-background border border-input rounded-md"
                    value={formData.start_month}
                    onChange={(e) => setFormData({ ...formData, start_month: parseInt(e.target.value) })}
                  >
                    {monthNames.map((month, index) => (
                      <option key={index + 1} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="start_year">Start Year</Label>
                  <Input
                    id="start_year"
                    type="number"
                    min={2020}
                    max={2050}
                    value={formData.start_year}
                    onChange={(e) => setFormData({ ...formData, start_year: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="months_paid">Number of Months</Label>
                <Input
                  id="months_paid"
                  type="number"
                  min={1}
                  max={12}
                  value={formData.months_paid}
                  onChange={(e) => setFormData({ ...formData, months_paid: parseInt(e.target.value) })}
                />
              </div>

              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-semibold">Total Amount: ₦{(monthlyDuesAmount * formData.months_paid).toLocaleString()}</p>
              </div>

              <div>
                <Label htmlFor="proof">Payment Proof (Screenshot/Receipt)</Label>
                <div className="mt-1.5">
                  <Input
                    id="proof"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
                {proofFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {proofFile.name}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={loading || !proofFile} className="w-full">
                {loading ? (
                  "Submitting..."
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Payment
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {duesPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No payment history yet
              </p>
            ) : (
              <div className="space-y-3">
                {duesPayments.map((payment) => (
                  <div key={payment.id} className="p-3 md:p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm md:text-base">
                          {monthNames[payment.start_month - 1]} {payment.start_year}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payment.months_paid} month{payment.months_paid > 1 ? 's' : ''}
                        </p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">₦{Number(payment.amount).toLocaleString()}</span>
                      <span className="text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {payment.admin_note && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <p className="font-semibold mb-1">Admin Note:</p>
                        <p>{payment.admin_note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Payments;
