import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
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

const PaymentAccounts = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadAccounts();
    }
  }, [isAdmin]);

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    setAccounts(data || []);
  };

  const handleSave = async () => {
    if (!formData.bank_name || !formData.account_name || !formData.account_number) {
      toast.error("All fields are required");
      return;
    }

    if (editingAccount) {
      const { error } = await supabase
        .from("payment_accounts")
        .update(formData)
        .eq("id", editingAccount.id);

      if (error) {
        toast.error("Failed to update account");
        return;
      }
      toast.success("Account updated");
    } else {
      const { error } = await supabase.from("payment_accounts").insert(formData);

      if (error) {
        toast.error("Failed to add account");
        return;
      }
      toast.success("Account added");
    }

    setIsDialogOpen(false);
    setEditingAccount(null);
    setFormData({ bank_name: "", account_name: "", account_number: "" });
    loadAccounts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    const { error } = await supabase.from("payment_accounts").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete account");
      return;
    }

    toast.success("Account deleted");
    loadAccounts();
  };

  const openDialog = (account?: any) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        bank_name: account.bank_name,
        account_name: account.account_name,
        account_number: account.account_number,
      });
    } else {
      setEditingAccount(null);
      setFormData({ bank_name: "", account_name: "", account_number: "" });
    }
    setIsDialogOpen(true);
  };

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold">Payment Accounts</h1>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle className="text-lg">{account.bank_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Account Name:</span> {account.account_name}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Account Number:</span> {account.account_number}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => openDialog(account)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No payment accounts yet</p>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Edit" : "Add"} Payment Account</DialogTitle>
              <DialogDescription>Enter the bank account details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="e.g., First Bank"
                />
              </div>
              <div>
                <Label>Account Name</Label>
                <Input
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="Account holder name"
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="0000000000"
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
    </div>
  );
};

export default PaymentAccounts;
