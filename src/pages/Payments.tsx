import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Upload, CheckCircle, XCircle, Clock, DollarSign, Calendar, FileText } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Payments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [monthlyDues, setMonthlyDues] = useState(3000);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    start_month: new Date().getMonth() + 1,
    start_year: new Date().getFullYear(),
    months_paid: 1,
    proof: null as File | null,
  });

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
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: settings } = await supabase.from("settings").select("monthly_dues_amount").single();
    setMonthlyDues(settings?.monthly_dues_amount || 3000);

    const { data: paymentsData } = await supabase
      .from("dues_payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPayments(paymentsData || []);

    const { data: accountsData } = await supabase
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    setAccounts(accountsData || []);

    setLoading(false);
  };

  const handleSubmitPayment = async () => {
    if (!formData.proof) {
      toast.error("Please upload payment proof");
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const fileName = `${user.id}/${Date.now()}_${formData.proof.name}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, formData.proof);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      const amount = monthlyDues * formData.months_paid;
      
      const { error } = await supabase.from("dues_payments").insert({
        user_id: user.id,
        start_month: formData.start_month,
        start_year: formData.start_year,
        months_paid: formData.months_paid,
        amount,
        payment_proof_url: publicUrl,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Payment submitted successfully");
      setIsDialogOpen(false);
      setFormData({
        start_month: new Date().getMonth() + 1,
        start_year: new Date().getFullYear(),
        months_paid: 1,
        proof: null,
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit payment");
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500";
      case "rejected": return "bg-red-500";
      default: return "bg-yellow-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-4 h-4" />;
      case "rejected": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Monthly Dues</h1>
          </div>
          <p className="text-white/80">Manage your monthly dues payments</p>
        </div>

        {/* Dues Amount Card */}
        <Card className="mb-6 border-accent/20 bg-white/95 backdrop-blur shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Monthly Dues Amount</p>
                <p className="text-3xl font-bold text-primary">₦{monthlyDues.toLocaleString()}</p>
              </div>
              <DollarSign className="w-12 h-12 text-accent" />
            </div>
          </CardContent>
        </Card>

        {/* Payment Accounts */}
        {accounts.length > 0 && (
          <Card className="mb-6 border-accent/20 bg-white/95 backdrop-blur shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Payment Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="p-4 rounded-lg bg-secondary/50 border border-accent/10">
                  <p className="font-semibold text-primary">{account.account_name}</p>
                  <p className="text-sm text-muted-foreground">{account.bank_name}</p>
                  <p className="text-lg font-mono font-bold text-accent mt-1">{account.account_number}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit Payment Button */}
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="w-full mb-6 h-12 text-base bg-accent hover:bg-accent/90 text-primary font-semibold shadow-lg"
        >
          <Upload className="w-5 h-5 mr-2" />
          Submit Payment
        </Button>

        {/* Payment History */}
        <Card className="border-accent/20 bg-white/95 backdrop-blur shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payments yet</p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-primary">
                          {payment.start_month}/{payment.start_year}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payment.months_paid} month{payment.months_paid > 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge className={getStatusColor(payment.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(payment.status)}
                          {payment.status}
                        </span>
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold text-accent">₦{Number(payment.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {payment.admin_note && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        <span className="font-semibold">Note: </span>
                        {payment.admin_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Payment Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Payment</DialogTitle>
              <DialogDescription>Upload proof of payment for verification</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Month</Label>
                  <Select
                    value={formData.start_month.toString()}
                    onValueChange={(value) => setFormData({ ...formData, start_month: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Select
                    value={formData.start_year.toString()}
                    onValueChange={(value) => setFormData({ ...formData, start_year: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Months to Pay</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.months_paid}
                  onChange={(e) => setFormData({ ...formData, months_paid: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">₦{(monthlyDues * formData.months_paid).toLocaleString()}</p>
              </div>
              <div>
                <Label>Payment Proof</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, proof: e.target.files?.[0] || null })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmitPayment} disabled={uploading} className="flex-1">
                  {uploading ? "Uploading..." : "Submit"}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <BottomNav />
    </div>
  );
};

export default Payments;
