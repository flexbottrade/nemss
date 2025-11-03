import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Finance = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    if (!loading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    // Load adjustments
    const { data: adjustmentsData } = await supabase
      .from("finance_adjustments")
      .select("*, profiles(first_name, last_name)")
      .order("created_at", { ascending: false });

    setAdjustments(adjustmentsData || []);

    // Calculate totals
    const { data: approvedDues } = await supabase
      .from("dues_payments")
      .select("amount")
      .eq("status", "approved");

    const { data: approvedEvents } = await supabase
      .from("event_payments")
      .select("amount")
      .eq("status", "approved");

    const duesTotal = approvedDues?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const eventsTotal = approvedEvents?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const adjustmentsIncome =
      adjustmentsData
        ?.filter((a) => a.adjustment_type === "income")
        .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    const adjustmentsExpense =
      adjustmentsData
        ?.filter((a) => a.adjustment_type === "expense")
        .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    const inflow = duesTotal + eventsTotal + adjustmentsIncome;
    const outflow = adjustmentsExpense;

    setTotals({
      inflow,
      outflow,
      balance: inflow - outflow,
    });
  };

  const handleSave = async () => {
    if (!formData.amount || !formData.reason) {
      toast.error("All fields are required");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("finance_adjustments").insert({
      ...formData,
      amount: parseFloat(formData.amount),
      created_by: user.id,
    });

    if (error) {
      toast.error("Failed to add adjustment");
      return;
    }

    toast.success("Adjustment added");
    setIsDialogOpen(false);
    setFormData({ adjustment_type: "income", amount: "", reason: "" });
    loadData();
  };

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6 pl-12 md:pl-0">
            <h1 className="text-xl md:text-3xl font-bold">Finance Tracker</h1>
            <Button onClick={() => setIsDialogOpen(true)} size="sm" className="text-xs md:text-sm h-8 md:h-10">
              <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Add Adjustment
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card>
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Inflow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold text-green-600">
                  ₦{totals.inflow.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Outflow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold text-red-600">
                  ₦{totals.outflow.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Current Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-lg md:text-2xl font-bold">₦{totals.balance.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

        {/* Adjustments List */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            {adjustments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No adjustments yet</p>
            ) : (
              <div className="space-y-4">
                {adjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">
                        {adj.adjustment_type === "income" ? "Income" : "Expense"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{adj.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {adj.profiles?.first_name} {adj.profiles?.last_name} •{" "}
                        {new Date(adj.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div
                      className={`text-xl font-bold mt-2 md:mt-0 ${
                        adj.adjustment_type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {adj.adjustment_type === "income" ? "+" : "-"}₦
                      {Number(adj.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Finance Adjustment</DialogTitle>
              <DialogDescription>
                Add income or expense adjustments to track finances
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.adjustment_type}
                  onValueChange={(value) => setFormData({ ...formData, adjustment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
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
                <Button onClick={handleSave}>Save</Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </main>
    </div>
  );
};

export default Finance;
