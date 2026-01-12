import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateDDMMYY } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const Finance = () => {
  const navigate = useNavigate();
  const { isAdmin, isFinancialSecretary, loading } = useRole();
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<any>(null);
  const [deletingAdjustmentId, setDeletingAdjustmentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    adjustment_type: "income",
    amount: "",
    reason: "",
  });
  const [totals, setTotals] = useState({
    inflow: 0,
    outflow: 0,
    balance: 0,
  });

  useEffect(() => {
    if (!loading && !isAdmin && !isFinancialSecretary) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, isFinancialSecretary, loading, navigate]);

  useEffect(() => {
    if (isAdmin || isFinancialSecretary) {
      loadData();
    }
  }, [isAdmin, isFinancialSecretary]);

  const loadData = async () => {
    // Parallel fetch all data
    const [adjustmentsResult, duesResult, eventsResult] = await Promise.all([
      supabase.from("finance_adjustments").select("*, profiles(first_name, last_name)").order("created_at", { ascending: false }),
      supabase.from("dues_payments").select("amount").eq("status", "approved"),
      supabase.from("event_payments").select("amount").eq("status", "approved")
    ]);

    setAdjustments(adjustmentsResult.data || []);

    const duesTotal = duesResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const eventsTotal = eventsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const adjustmentsIncome =
      adjustmentsResult.data
        ?.filter((a) => a.adjustment_type === "inflow" || a.adjustment_type === "income")
        .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    const adjustmentsExpense =
      adjustmentsResult.data
        ?.filter((a) => a.adjustment_type === "outflow" || a.adjustment_type === "expense")
        .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    const inflow = duesTotal + eventsTotal + adjustmentsIncome;
    const outflow = adjustmentsExpense;

    setTotals({
      inflow,
      outflow,
      balance: inflow - outflow,
    });
    setDataLoading(false);
  };

  const handleSave = async () => {
    if (!formData.amount || !formData.reason) {
      toast.error("All fields are required");
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      if (editingAdjustment) {
        // Update existing adjustment
        const { error } = await supabase
          .from("finance_adjustments")
          .update({
            adjustment_type: formData.adjustment_type === "income" ? "inflow" : "outflow",
            amount: parseFloat(formData.amount),
            reason: formData.reason,
          })
          .eq("id", editingAdjustment.id);

        if (error) {
          console.error("Finance adjustment update error:", error);
          toast.error("Failed to update adjustment: " + error.message);
          return;
        }
        toast.success("Adjustment updated - figures recalculated");
      } else {
        // Create new adjustment
        const { error } = await supabase.from("finance_adjustments").insert({
          adjustment_type: formData.adjustment_type === "income" ? "inflow" : "outflow",
          amount: parseFloat(formData.amount),
          reason: formData.reason,
          created_by: user.id,
        });

        if (error) {
          console.error("Finance adjustment error:", error);
          toast.error("Failed to add adjustment: " + error.message);
          return;
        }
        toast.success("Adjustment added");
      }

      setIsDialogOpen(false);
      setEditingAdjustment(null);
      setFormData({ adjustment_type: "income", amount: "", reason: "" });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (adjustment: any) => {
    setEditingAdjustment(adjustment);
    setFormData({
      adjustment_type: adjustment.adjustment_type === "inflow" || adjustment.adjustment_type === "income" ? "income" : "expense",
      amount: String(adjustment.amount),
      reason: adjustment.reason || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingAdjustmentId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAdjustmentId || saving) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("finance_adjustments")
        .delete()
        .eq("id", deletingAdjustmentId);

      if (error) {
        console.error("Delete adjustment error:", error);
        toast.error("Failed to delete adjustment: " + error.message);
      } else {
        toast.success("Adjustment deleted - figures recalculated");
        await loadData();
      }
    } finally {
      setSaving(false);
      setIsDeleteDialogOpen(false);
      setDeletingAdjustmentId(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingAdjustment(null);
      setFormData({ adjustment_type: "income", amount: "", reason: "" });
    }
    setIsDialogOpen(open);
  };

  if (loading || (!isAdmin && !isFinancialSecretary)) {
    return <Spinner size="lg" />;
  }

  if (dataLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1">
          <Spinner size="lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 md:mb-6 pl-12 md:pl-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg md:text-2xl font-bold">Finance Tracker</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Track all financial transactions including manual adjustments for income and expenses
                </p>
              </div>
              {isFinancialSecretary && (
                <Button onClick={() => setIsDialogOpen(true)} size="sm" className="text-xs h-7 md:h-8 px-2 md:px-3">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Adjustment
                </Button>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
            <Card>
              <CardHeader className="p-2 md:p-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Inflow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-4 pt-0">
                <div className="text-base md:text-xl font-bold text-green-600">
                  ₦{totals.inflow.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-2 md:p-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Outflow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-4 pt-0">
                <div className="text-base md:text-xl font-bold text-red-600">
                  ₦{totals.outflow.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-2 md:p-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Current Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-4 pt-0">
                <div className="text-base md:text-xl font-bold">₦{totals.balance.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

        {/* Adjustments List */}
        <Card>
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-sm md:text-base">Manual Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            {adjustments.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No adjustments yet</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {adjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-2 md:p-3 border rounded-lg"
                  >
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {(adj.adjustment_type === "inflow" || adj.adjustment_type === "income") ? "Inflow" : "Outflow"}
                    </p>
                      <p className="text-xs text-muted-foreground mt-1">{adj.reason}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        By: {adj.profiles?.first_name} {adj.profiles?.last_name} •{" "}
                        {formatDateDDMMYY(adj.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <div
                        className={`text-base md:text-lg font-bold ${
                          (adj.adjustment_type === "inflow" || adj.adjustment_type === "income") ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {(adj.adjustment_type === "inflow" || adj.adjustment_type === "income") ? "+" : "-"}₦
                        {Number(adj.amount).toLocaleString()}
                      </div>
                      {isFinancialSecretary && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(adj)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(adj.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAdjustment ? "Edit Finance Adjustment" : "Add Finance Adjustment"}</DialogTitle>
              <DialogDescription>
                {editingAdjustment 
                  ? "Update the details of this financial adjustment"
                  : "Record financial inflows (money coming in) or outflows (money going out)"
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Tabs 
                  value={formData.adjustment_type} 
                  onValueChange={(value) => setFormData({ ...formData, adjustment_type: value })}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="income">Inflow</TabsTrigger>
                    <TabsTrigger value="expense">Outflow</TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-xs text-muted-foreground">
                  {formData.adjustment_type === "income" 
                    ? "💰 Inflow: Money received by the association (donations, sponsorships, fundraising, etc.)"
                    : "💸 Outflow: Money spent by the association (expenses, purchases, payments, etc.)"
                  }
                </p>
              </div>
              <div>
                <Label>Amount (₦)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Describe the reason for this adjustment"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : (editingAdjustment ? "Update" : "Save")}
                </Button>
                <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Adjustment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this adjustment? This action cannot be undone and will recalculate all financial figures.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteConfirm} 
                disabled={saving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {saving ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default Finance;
