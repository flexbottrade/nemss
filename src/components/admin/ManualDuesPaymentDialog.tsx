import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";
import { uploadProofFiles } from "@/lib/upload-proofs";

interface ManualDuesPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  onSuccess: () => void;
  existingPayment?: {
    id: string;
    amount: number;
    start_year: number;
    start_month: number;
    months_paid: number;
  } | null;
}

export const ManualDuesPaymentDialog = ({
  open,
  onOpenChange,
  memberId,
  memberName,
  onSuccess,
  existingPayment,
}: ManualDuesPaymentDialogProps) => {
  const [selectedYear, setSelectedYear] = useState(existingPayment?.start_year.toString() || new Date().getFullYear().toString());
  const [monthlyAmount, setMonthlyAmount] = useState<number | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [paidMonths, setPaidMonths] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  
  const [editAmount, setEditAmount] = useState(existingPayment?.amount.toString() || "");
  const [editMonth, setEditMonth] = useState(existingPayment?.start_month.toString() || "");

  useEffect(() => {
    if (selectedYear && !existingPayment) {
      loadYearData();
    }
  }, [selectedYear, memberId, existingPayment]);

  useEffect(() => {
    if (existingPayment) {
      setEditAmount(existingPayment.amount.toString());
      setEditMonth(existingPayment.start_month.toString());
      setSelectedYear(existingPayment.start_year.toString());
    }
  }, [existingPayment]);

  const loadYearData = async () => {
    const { data: duesSettings } = await supabase
      .from("variable_dues_settings")
      .select("monthly_amount")
      .eq("year", parseInt(selectedYear))
      .single();
    
    setMonthlyAmount(duesSettings?.monthly_amount ? Number(duesSettings.monthly_amount) : null);

    const { data: payments } = await supabase
      .from("dues_payments")
      .select("start_month, months_paid")
      .eq("user_id", memberId)
      .eq("start_year", parseInt(selectedYear))
      .eq("status", "approved");
    
    const paid: number[] = [];
    payments?.forEach(p => {
      for (let i = 0; i < p.months_paid; i++) {
        const month = p.start_month + i;
        if (month <= 12 && !paid.includes(month)) {
          paid.push(month);
        }
      }
    });
    setPaidMonths(paid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let proofUrlValue: string | null = null;
      if (proofFiles.length > 0) {
        proofUrlValue = await uploadProofFiles(memberId, proofFiles);
      }

      let error;
      if (existingPayment) {
        const updateData: any = {
          amount: parseFloat(editAmount),
          start_month: parseInt(editMonth),
        };
        if (proofUrlValue) updateData.payment_proof_url = proofUrlValue;

        const { error: updateError } = await supabase
          .from("dues_payments")
          .update(updateData)
          .eq("id", existingPayment.id);
        error = updateError;
      } else {
        if (selectedMonths.length === 0 || !monthlyAmount) {
          toast.error("Please select at least one month");
          setLoading(false);
          return;
        }

        const sortedMonths = [...selectedMonths].sort((a, b) => a - b);
        
        const paymentGroups: Array<{ start_month: number; months_paid: number }> = [];
        let currentGroup = { start_month: sortedMonths[0], months_paid: 1 };
        
        for (let i = 1; i < sortedMonths.length; i++) {
          if (sortedMonths[i] === sortedMonths[i - 1] + 1) {
            currentGroup.months_paid++;
          } else {
            paymentGroups.push(currentGroup);
            currentGroup = { start_month: sortedMonths[i], months_paid: 1 };
          }
        }
        paymentGroups.push(currentGroup);

        const payments = paymentGroups.map(group => ({
          user_id: memberId,
          amount: monthlyAmount * group.months_paid,
          start_year: parseInt(selectedYear),
          start_month: group.start_month,
          months_paid: group.months_paid,
          status: "approved",
          is_manually_updated: true,
          ...(proofUrlValue ? { payment_proof_url: proofUrlValue } : {}),
        }));

        const { error: insertError } = await supabase
          .from("dues_payments")
          .insert(payments);
        error = insertError;
      }

      if (error) {
        toast.error(`Failed to ${existingPayment ? "update" : "add"} dues payment`);
      } else {
        toast.success(`Dues payment ${existingPayment ? "updated" : "added"} successfully`);
        setProofFiles([]);
        onSuccess();
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = (month: number) => {
    setSelectedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingPayment ? "Edit" : "Add"} Manual Dues Payment for {memberName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {existingPayment ? (
              <>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input value={selectedYear} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_month">Month</Label>
                  <Select value={editMonth} onValueChange={setEditMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_amount">Amount (₦)</Label>
                  <Input id="edit_amount" type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required min="0" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="year">Select Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {monthlyAmount !== null && (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-sm font-medium">
                      Monthly Due Amount for {selectedYear}: ₦{monthlyAmount.toLocaleString()}
                    </p>
                    {selectedMonths.length > 0 && (
                      <p className="text-sm font-medium text-primary">
                        Total Amount: ₦{(monthlyAmount * selectedMonths.length).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {monthlyAmount !== null && (
                  <>
                    <div className="space-y-2">
                      <Label>Select Months</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {months.map((month, index) => {
                          const monthNum = index + 1;
                          const isPaid = paidMonths.includes(monthNum);
                          const isSelected = selectedMonths.includes(monthNum);
                          
                          return (
                            <div key={monthNum} className={`flex items-center space-x-2 p-2 rounded border ${isPaid ? 'bg-muted opacity-50' : ''}`}>
                              <Checkbox id={`month-${monthNum}`} checked={isSelected} disabled={isPaid} onCheckedChange={() => toggleMonth(monthNum)} />
                              <label htmlFor={`month-${monthNum}`} className="text-sm cursor-pointer flex-1">
                                {month.slice(0, 3)}
                                {isPaid && <span className="text-xs ml-1">(Paid)</span>}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {paidMonths.length === 12 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground text-center">All months for {selectedYear} have been paid</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <PaymentProofUpload
              files={proofFiles}
              onFilesChange={setProofFiles}
              label="Payment Proof (optional)"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || (!existingPayment && (selectedMonths.length === 0 || paidMonths.length === 12))}>
              {loading ? "Saving..." : existingPayment ? "Update Payment" : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
