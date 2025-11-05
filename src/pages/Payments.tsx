import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, XCircle, Clock, Calendar, CreditCard, DollarSign, FileText, Copy } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";

const Payments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [monthlyDues, setMonthlyDues] = useState(3000);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paidMonths, setPaidMonths] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    year: 2026,
    selectedMonths: [] as number[],
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

    // Build set of paid months (approved only)
    const paid = new Set<string>();
    paymentsData?.forEach((payment) => {
      if (payment.status === "approved") {
        for (let i = 0; i < payment.months_paid; i++) {
          const month = ((payment.start_month - 1 + i) % 12) + 1;
          const year = payment.start_year + Math.floor((payment.start_month - 1 + i) / 12);
          paid.add(`${year}-${month}`);
        }
      }
    });
    setPaidMonths(paid);

    const { data: accountsData } = await supabase
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    setAccounts(accountsData || []);

    setLoading(false);
  };

  const handleSubmitPayment = async () => {
    if (formData.selectedMonths.length === 0) {
      toast.error("Please select at least one month");
      return;
    }
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

      const sortedMonths = [...formData.selectedMonths].sort((a, b) => a - b);
      const amount = monthlyDues * sortedMonths.length;
      
      const { error } = await supabase.from("dues_payments").insert({
        user_id: user.id,
        start_month: sortedMonths[0],
        start_year: formData.year,
        months_paid: sortedMonths.length,
        amount,
        payment_proof_url: publicUrl,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Payment submitted successfully");
      setIsDialogOpen(false);
      setFormData({
        year: 2026,
        selectedMonths: [],
        proof: null,
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit payment");
    } finally {
      setUploading(false);
    }
  };

  const toggleMonth = (month: number) => {
    const key = `${formData.year}-${month}`;
    if (paidMonths.has(key)) return;
    
    setFormData(prev => ({
      ...prev,
      selectedMonths: prev.selectedMonths.includes(month)
        ? prev.selectedMonths.filter(m => m !== month)
        : [...prev.selectedMonths, month]
    }));
  };

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: currentYear - 2026 + 1 },
    (_, i) => 2026 + i
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500 text-white";
      case "rejected": return "bg-red-500 text-white";
      default: return "bg-yellow-500 text-black";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 className="w-4 h-4" />;
      case "rejected": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <Spinner />;
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-3 md:py-6">
        {/* Header */}
        <div className="mb-3 md:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-accent flex items-center justify-center">
              <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-accent-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Monthly Dues</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">Manage your monthly dues payments</p>
        </div>

        {/* Dues Amount Card */}
        <Card className="mb-4 md:mb-6 bg-card border-border">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-card-foreground/70 mb-1">Monthly Dues Amount</p>
                <p className="text-2xl md:text-3xl font-bold text-accent">₦{monthlyDues.toLocaleString()}</p>
              </div>
              <DollarSign className="w-10 h-10 md:w-12 md:h-12 text-accent" />
            </div>
          </CardContent>
        </Card>

        {/* Pay Dues Button */}
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="w-full mb-4 md:mb-6 h-10 md:h-12 text-sm md:text-base"
        >
          Pay Dues
        </Button>

        {/* Payment History */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-card-foreground text-base md:text-lg">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-accent" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm md:text-base">No payments yet</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-3 md:p-4 rounded-lg border border-border bg-background">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-card-foreground text-sm md:text-base">
                          {monthNames[payment.start_month - 1]} {payment.start_year}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {payment.months_paid} month{payment.months_paid > 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge className={getStatusColor(payment.status)}>
                        <span className="flex items-center gap-1 text-xs">
                          {getStatusIcon(payment.status)}
                          {payment.status}
                        </span>
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg md:text-xl font-bold text-accent">₦{Number(payment.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {payment.admin_note && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
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
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Submit Payment</DialogTitle>
              <DialogDescription>Select months to pay, then choose payment account and upload proof</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Step 1: Year and Month Selection */}
              <div>
                <Label className="text-foreground">Select Year</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) => setFormData({ ...formData, year: parseInt(value), selectedMonths: [] })}
                >
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3 block text-foreground">Select Months to Pay</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {monthNames.map((month, index) => {
                    const monthNum = index + 1;
                    const key = `${formData.year}-${monthNum}`;
                    const isPaid = paidMonths.has(key);
                    const isSelected = formData.selectedMonths.includes(monthNum);
                    
                    return (
                      <div
                        key={monthNum}
                        className={`flex items-center space-x-2 p-2 rounded border ${
                          isPaid
                            ? "bg-muted/50 border-muted cursor-not-allowed opacity-50"
                            : isSelected
                            ? "bg-accent/10 border-accent"
                            : "border-border hover:border-accent/50 cursor-pointer"
                        }`}
                        onClick={() => !isPaid && toggleMonth(monthNum)}
                      >
                        <Checkbox
                          id={`month-${monthNum}`}
                          checked={isSelected}
                          disabled={isPaid}
                          onCheckedChange={() => toggleMonth(monthNum)}
                        />
                        <label
                          htmlFor={`month-${monthNum}`}
                          className="text-sm cursor-pointer flex-1 text-foreground"
                        >
                          {month}
                          {isPaid && " (Paid)"}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Amount Display */}
              {formData.selectedMonths.length > 0 && (
                <div className="p-3 bg-accent/10 rounded-lg border border-accent">
                  <p className="text-sm text-foreground mb-1">
                    {formData.selectedMonths.length} month{formData.selectedMonths.length > 1 ? "s" : ""} selected
                  </p>
                  <p className="text-2xl font-bold text-accent">
                    Total: ₦{(monthlyDues * formData.selectedMonths.length).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Step 2: Payment Accounts */}
              {formData.selectedMonths.length > 0 && accounts.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <Label className="mb-2 block text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" />
                    Payment Account Details
                  </Label>
                  <div className="space-y-2">
                    {accounts.map((account) => (
                      <div key={account.id} className="p-3 rounded-lg bg-card border border-border">
                        <p className="font-semibold text-foreground text-sm">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-base font-mono font-bold text-accent">{account.account_number}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
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

              {/* Step 3: Upload Proof */}
              {formData.selectedMonths.length > 0 && (
                <div>
                  <Label className="text-foreground">Upload Payment Proof (Image)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, proof: e.target.files?.[0] || null })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground text-sm"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleSubmitPayment} 
                  disabled={uploading || formData.selectedMonths.length === 0} 
                  className="flex-1"
                >
                  {uploading ? "Uploading..." : "Pay Dues"}
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
