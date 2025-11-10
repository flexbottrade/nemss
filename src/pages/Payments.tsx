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
  const [variableDues, setVariableDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paidMonths, setPaidMonths] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
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
      navigate("/auth");
      return;
    }
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load variable dues settings
    const { data: duesSettings } = await supabase
      .from("variable_dues_settings")
      .select("*")
      .order("year", { ascending: true });
    setVariableDues(duesSettings || []);

    const { data: paymentsData } = await supabase
      .from("dues_payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPayments(paymentsData || []);

    // Build set of paid months (approved or manually updated)
    const paid = new Set<string>();
    paymentsData?.forEach((payment) => {
      if (payment.status === "approved" || payment.is_manually_updated) {
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
      .order("created_at", { ascending: false});
    setAccounts(accountsData || []);

    setLoading(false);
  };

  const getMonthlyDues = (year: number) => {
    const setting = variableDues.find(d => d.year === year);
    return setting?.is_waived ? 0 : (setting?.monthly_amount || 3000);
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

    const monthlyDues = getMonthlyDues(formData.year);
    if (monthlyDues === 0) {
      toast.error("Selected year is waived");
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
      
      const { data: insertedPayment, error } = await supabase.from("dues_payments").insert({
        user_id: user.id,
        start_month: sortedMonths[0],
        start_year: formData.year,
        months_paid: sortedMonths.length,
        amount,
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
          payment_type: "Dues",
          payment_id: insertedPayment.id,
          user_name: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown User",
          amount: amount,
          date: new Date().toLocaleDateString('en-GB'),
        },
      });

      toast.success("Payment submitted successfully");
      setIsDialogOpen(false);
      setFormData({
        year: new Date().getFullYear(),
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
    if (paidMonths.has(key) || getMonthlyDues(formData.year) === 0) return;
    
    setFormData(prev => ({
      ...prev,
      selectedMonths: prev.selectedMonths.includes(month)
        ? prev.selectedMonths.filter(m => m !== month)
        : [...prev.selectedMonths, month]
    }));
  };

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: currentYear - 2023 + 1 },
    (_, i) => 2023 + i
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
      case "approved": return <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />;
      case "rejected": return <XCircle className="w-3 h-3 md:w-4 md:h-4" />;
      default: return <Clock className="w-3 h-3 md:w-4 md:h-4" />;
    }
  };

  if (loading) {
    return <Spinner />;
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-3 md:py-6">
        <div className="mb-3 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent flex items-center justify-center">
              <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-accent-foreground" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Monthly Dues</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">Manage your monthly dues payments</p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="w-full mb-4 md:mb-6 h-9 md:h-10 text-sm md:text-base"
        >
          Pay Dues
        </Button>

        <Card className="bg-card border-border">
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="flex items-center gap-2 text-card-foreground text-sm md:text-base">
              <Calendar className="w-3 h-3 md:w-4 md:h-4 text-accent" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 md:py-8 text-xs md:text-sm">No payments yet</p>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => {
                  const getMonthRange = () => {
                    if (payment.months_paid === 1) {
                      return fullMonthNames[payment.start_month - 1];
                    }
                    const endMonth = ((payment.start_month - 1 + payment.months_paid - 1) % 12);
                    return `${fullMonthNames[payment.start_month - 1]} - ${fullMonthNames[endMonth]}`;
                  };
                  
                  return (
                    <div key={payment.id} className="p-2 md:p-3 rounded-lg border border-border bg-background">
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-card-foreground text-xs md:text-sm">
                            {getMonthRange()} {payment.start_year}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.months_paid} month{payment.months_paid > 1 ? "s" : ""}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(payment.status)} text-xs`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(payment.status)}
                            {payment.status}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-base md:text-lg font-bold text-accent">₦{Number(payment.amount).toLocaleString()}</p>
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm md:text-base text-foreground">Submit Payment</DialogTitle>
              <DialogDescription className="text-xs md:text-sm">Select months to pay, then upload proof</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 md:space-y-4">
              <div>
                <Label className="text-xs md:text-sm text-foreground">Select Year</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) => setFormData({ ...formData, year: parseInt(value), selectedMonths: [] })}
                >
                  <SelectTrigger className="bg-input border-border text-foreground text-xs md:text-sm h-8 md:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => {
                      const isWaived = getMonthlyDues(year) === 0;
                      return (
                        <SelectItem key={year} value={year.toString()} disabled={isWaived}>
                          {year} {isWaived && "(Waived)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block text-xs md:text-sm text-foreground">Select Months to Pay</Label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 md:gap-2">
                  {monthNames.map((month, index) => {
                    const monthNum = index + 1;
                    const key = `${formData.year}-${monthNum}`;
                    const isPaid = paidMonths.has(key);
                    const isWaived = getMonthlyDues(formData.year) === 0;
                    const isSelected = formData.selectedMonths.includes(monthNum);
                    
                    return (
                      <div
                        key={monthNum}
                        className={`flex items-center space-x-1.5 p-1.5 md:p-2 rounded border text-xs ${
                          isPaid || isWaived
                            ? "bg-muted/50 border-muted cursor-not-allowed opacity-50"
                            : isSelected
                            ? "bg-accent/10 border-accent"
                            : "border-border hover:border-accent/50 cursor-pointer"
                        }`}
                        onClick={() => !isPaid && !isWaived && toggleMonth(monthNum)}
                      >
                        <Checkbox
                          id={`month-${monthNum}`}
                          checked={isSelected}
                          disabled={isPaid || isWaived}
                          onCheckedChange={() => toggleMonth(monthNum)}
                          className="h-3 w-3 md:h-4 md:w-4"
                        />
                        <label
                          htmlFor={`month-${monthNum}`}
                          className="text-xs cursor-pointer flex-1 text-foreground"
                        >
                          {month}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {formData.selectedMonths.length > 0 && (
                <div className="p-2 md:p-3 bg-accent/10 rounded-lg border border-accent">
                  <p className="text-xs md:text-sm text-foreground mb-1">
                    {formData.selectedMonths.length} month{formData.selectedMonths.length > 1 ? "s" : ""} selected
                  </p>
                  <p className="text-lg md:text-2xl font-bold text-accent">
                    Total: ₦{(getMonthlyDues(formData.year) * formData.selectedMonths.length).toLocaleString()}
                  </p>
                </div>
              )}

              {formData.selectedMonths.length > 0 && accounts.length > 0 && (
                <div className="pt-2 md:pt-3 border-t border-border">
                  <Label className="mb-2 block text-xs md:text-sm text-foreground flex items-center gap-2">
                    <FileText className="w-3 h-3 md:w-4 md:h-4 text-accent" />
                    Payment Account Details
                  </Label>
                  <div className="space-y-1.5 md:space-y-2">
                    {accounts.map((account) => (
                      <div key={account.id} className="p-2 md:p-3 rounded-lg bg-card border border-border">
                        <p className="font-semibold text-foreground text-xs md:text-sm">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm md:text-base font-mono font-bold text-accent">{account.account_number}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 md:h-6 md:w-6 p-0"
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

              {formData.selectedMonths.length > 0 && (
                <div>
                  <Label className="text-xs md:text-sm text-foreground">Upload Payment Proof (Image)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, proof: e.target.files?.[0] || null })}
                    className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-border rounded-md bg-input text-foreground text-xs md:text-sm mt-2"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleSubmitPayment} 
                  disabled={uploading || formData.selectedMonths.length === 0} 
                  className="flex-1 text-xs md:text-sm h-8 md:h-10"
                >
                  {uploading ? "Uploading..." : "Pay Dues"}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs md:text-sm h-8 md:h-10">
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
