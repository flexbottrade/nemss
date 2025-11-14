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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";

const Finance = () => {
  const navigate = useNavigate();
  const { isAdmin, isFinancialSecretary, loading } = useRole();
  const [dataLoading, setDataLoading] = useState(true);
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    const { error } = await supabase.from("finance_adjustments").insert({
      adjustment_type: formData.adjustment_type,
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
    setIsDialogOpen(false);
    setFormData({ adjustment_type: "income", amount: "", reason: "" });
    loadData();
  };

  if (loading || !isAdmin) {
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
                        {new Date(adj.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div
                      className={`text-base md:text-lg font-bold mt-2 md:mt-0 ${
                        (adj.adjustment_type === "inflow" || adj.adjustment_type === "income") ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {(adj.adjustment_type === "inflow" || adj.adjustment_type === "income") ? "+" : "-"}₦
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
                Record financial inflows (money coming in) or outflows (money going out)
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
