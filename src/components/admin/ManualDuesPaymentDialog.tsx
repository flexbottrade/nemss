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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    admin_note: string;
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
  const [amount, setAmount] = useState(existingPayment?.amount.toString() || "");
  const [startYear, setStartYear] = useState(existingPayment?.start_year.toString() || new Date().getFullYear().toString());
  const [startMonth, setStartMonth] = useState(existingPayment?.start_month.toString() || (new Date().getMonth() + 1).toString());
  const [monthsPaid, setMonthsPaid] = useState(existingPayment?.months_paid.toString() || "1");
  const [adminNote, setAdminNote] = useState(existingPayment?.admin_note || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingPayment) {
      setAmount(existingPayment.amount.toString());
      setStartYear(existingPayment.start_year.toString());
      setStartMonth(existingPayment.start_month.toString());
      setMonthsPaid(existingPayment.months_paid.toString());
      setAdminNote(existingPayment.admin_note || "");
    }
  }, [existingPayment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const paymentData = {
      user_id: memberId,
      amount: parseFloat(amount),
      start_year: parseInt(startYear),
      start_month: parseInt(startMonth),
      months_paid: parseInt(monthsPaid),
      admin_note: adminNote,
      status: "approved",
      is_manually_updated: true,
    };

    let error;
    if (existingPayment) {
      const { error: updateError } = await supabase
        .from("dues_payments")
        .update(paymentData)
        .eq("id", existingPayment.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("dues_payments")
        .insert(paymentData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast.error(`Failed to ${existingPayment ? "update" : "add"} dues payment`);
    } else {
      toast.success(`Dues payment ${existingPayment ? "updated" : "added"} successfully`);
      onSuccess();
      onOpenChange(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingPayment ? "Edit" : "Add"} Manual Dues Payment for {memberName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_year">Year</Label>
                <Select value={startYear} onValueChange={setStartYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_month">Start Month</Label>
                <Select value={startMonth} onValueChange={setStartMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={index + 1} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="months_paid">Months Paid</Label>
              <Input
                id="months_paid"
                type="number"
                value={monthsPaid}
                onChange={(e) => setMonthsPaid(e.target.value)}
                required
                min="1"
                max="12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_note">Admin Note</Label>
              <Textarea
                id="admin_note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Optional note about this payment..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : existingPayment ? "Update Payment" : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
