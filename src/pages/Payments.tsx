import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, XCircle, Clock, Calendar, CreditCard, DollarSign, FileText, Copy, Eye, RefreshCw } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { UpdatePaymentProofDialog } from "@/components/UpdatePaymentProofDialog";
import { UpdateRejectedPaymentDialog } from "@/components/UpdateRejectedPaymentDialog";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { formatDateDDMMYY } from "@/lib/utils";
import { PaymentProofViewer } from "@/components/PaymentProofViewer";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
import { uploadProofFiles, deleteProofFiles } from "@/lib/upload-proofs";

const Payments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [variableDues, setVariableDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paidMonths, setPaidMonths] = useState<Set<string>>(new Set());
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
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    selectedMonths: [] as number[],
    proofFiles: [] as File[],
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

    // Parallel fetch all data
    const [duesSettingsResult, paymentsResult, accountsResult] = await Promise.all([
      supabase.from("variable_dues_settings").select("*").order("year", { ascending: true }),
      supabase.from("dues_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("payment_accounts").select("*").order("created_at", { ascending: false })
    ]);

    setVariableDues(duesSettingsResult.data || []);
    setPayments(paymentsResult.data || []);
    setAccounts(accountsResult.data || []);

    // Build set of paid months
    const paid = new Set<string>();
    paymentsResult.data?.forEach((payment) => {
      if (payment.status === "approved" || payment.is_manually_updated) {
        for (let i = 0; i < payment.months_paid; i++) {
          const month = ((payment.start_month - 1 + i) % 12) + 1;
          const year = payment.start_year + Math.floor((payment.start_month - 1 + i) / 12);
          paid.add(`${year}-${month}`);
        }
      }
    });
    setPaidMonths(paid);
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
    if (formData.proofFiles.length === 0) {
      toast.error("Please upload at least one payment proof");
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
      const proofUrlValue = await uploadProofFiles(user.id, formData.proofFiles);

      const sortedMonths = [...formData.selectedMonths].sort((a, b) => a - b);
      const amount = monthlyDues * sortedMonths.length;
      
      const { data: insertedPayment, error } = await supabase.from("dues_payments").insert({
        user_id: user.id,
        start_month: sortedMonths[0],
        start_year: formData.year,
        months_paid: sortedMonths.length,
        amount,
        payment_proof_url: proofUrlValue,
        status: "pending",
      }).select().single();

      if (error) throw error;

      // Get user profile for email notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, member_id")
        .eq("id", user.id)
        .single();

      // Prepare details string
      const monthNames = sortedMonths.map(m => 
        new Date(formData.year, m - 1).toLocaleDateString('en-NG', { month: 'long' })
      );
      const details = `${formData.year} - ${monthNames.join(', ')}`;

      // Send email notification
      try {
        await supabase.functions.invoke("send-payment-notification-email", {
          body: {
            payment_type: "Dues",
            payment_id: insertedPayment.id,
            member_name: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown User",
            member_id: profile?.member_id || "N/A",
            amount: amount,
            date: new Date().toLocaleDateString('en-NG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            details: details,
            payment_proof_url: proofUrlValue,
          },
        });
      } catch (notificationError) {
        console.error("Failed to send email notification:", notificationError);
      }

      toast.success("Payment submitted successfully");
      setIsDialogOpen(false);
      setFormData({
        year: new Date().getFullYear(),
        selectedMonths: [],
        proofFiles: [],
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

  const handleDeletePayment = async () => {
    if (!deleteDialog.payment) return;

    try {
      // Delete proofs from storage if exists
      await deleteProofFiles(deleteDialog.payment.payment_proof_url);

      // Delete payment record
      const { error } = await supabase
        .from("dues_payments")
        .delete()
        .eq("id", deleteDialog.payment.id);

      if (error) throw error;

      toast.success("Payment deleted successfully");
      loadData();
      setDeleteDialog({ open: false, payment: null });
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
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
                    const startMonth = payment.start_month - 1;
                    const endMonthIndex = (startMonth + payment.months_paid - 1) % 12;
                    const startYear = payment.start_year;
                    const endYear = payment.start_year + Math.floor((startMonth + payment.months_paid - 1) / 12);
                    
                    if (payment.months_paid === 1) {
                      return `${monthNames[startMonth]} ${startYear}`;
                    }
                    
                    if (startYear === endYear) {
                      return `${monthNames[startMonth]} - ${monthNames[endMonthIndex]} ${startYear}`;
                    } else {
                      return `${monthNames[startMonth]} ${startYear} - ${monthNames[endMonthIndex]} ${endYear}`;
                    }
                  };
                  
                  return (
                    <div key={payment.id} className="p-2 md:p-3 rounded-lg border border-border bg-background">
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-card-foreground text-xs md:text-sm">
                            {getMonthRange()} ({payment.months_paid} month{payment.months_paid > 1 ? "s" : ""})
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(payment.status)} text-xs`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(payment.status)}
                            {payment.status}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-base md:text-lg font-bold text-accent">₦{Number(payment.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateDDMMYY(payment.created_at)}
                        </p>
                      </div>
                      {payment.status === "rejected" && payment.admin_note && (
                        <div className="mb-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                          <p className="text-xs font-semibold text-destructive mb-1">Rejection Reason:</p>
                          <p className="text-xs text-muted-foreground">{payment.admin_note}</p>
                        </div>
                      )}
                      {payment.payment_proof_url && (
                        <div className="flex flex-wrap gap-2">
                          <PaymentProofViewer proofUrl={payment.payment_proof_url} />
                          {payment.status === "pending" && (
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
                        </div>
                      )}
                      {payment.status === "rejected" && (
                        <div className="flex gap-2 mt-2">
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
                        </div>
                      )}
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
                <PaymentProofUpload
                  files={formData.proofFiles}
                  onFilesChange={(files) => setFormData({ ...formData, proofFiles: files })}
                  label="Upload Payment Proof(s)"
                />
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

        {updateProofDialog.payment && (
          <UpdatePaymentProofDialog
            open={updateProofDialog.open}
            onOpenChange={(open) => setUpdateProofDialog({ open, payment: null })}
            paymentId={updateProofDialog.payment.id}
            paymentType="dues"
            currentProofUrl={updateProofDialog.payment.payment_proof_url}
            onSuccess={loadData}
          />
        )}

        {updateRejectedDialog.payment && (
          <UpdateRejectedPaymentDialog
            open={updateRejectedDialog.open}
            onOpenChange={(open) => setUpdateRejectedDialog({ open, payment: null })}
            payment={updateRejectedDialog.payment}
            paymentType="dues"
            variableDues={variableDues}
            onSuccess={loadData}
          />
        )}

        <ConfirmationDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open, payment: null })}
          title="Delete Payment"
          description="Are you sure you want to delete this payment? This action cannot be undone."
          onConfirm={handleDeletePayment}
        />
      </div>
      <BottomNav />
    </div>
  );
};

export default Payments;
